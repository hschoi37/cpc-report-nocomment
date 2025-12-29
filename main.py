from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pandas as pd
from datetime import datetime
import io
from typing import Dict, List, Any
import os

app = FastAPI(title="다중디앤핑 CPC리포트 생성기")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙 설정
# 현재 디렉토리의 파일들을 직접 서빙
@app.get("/styles.css")
async def get_styles():
    return FileResponse("styles.css", media_type="text/css")

@app.get("/app.js")
async def get_app_js():
    return FileResponse("app.js", media_type="application/javascript")

# 중국어 → 한국어 컬럼 매핑
COLUMN_MAPPING = {
    '日期': '날짜',
    '花费（元）': '비용',
    '曝光（次）': '노출수',
    '点击（次）': '클릭수',
    '点击均价（元）': '클릭당비용',
    '收藏（次）': '즐겨찾기',
    '分享（次）': '공유',
    '查看团购（次）': '단체구매조회',
    '订单量（个）': '주문수',
    '团购订单量（个）': '단체구매주문수',
    '7日团购订单量（次）': '7일단체구매주문수',
    '7日收藏量（次）': '7일즐겨찾기수',
    '7日分享量（次）': '7일공유수'
}

def process_excel_data(df: pd.DataFrame) -> Dict[str, Any]:
    """
    엑셀 데이터를 처리하여 리포트에 필요한 모든 정보를 추출합니다.
    """
    # 컬럼명 변경 (존재하는 컬럼만 매핑)
    rename_dict = {k: v for k, v in COLUMN_MAPPING.items() if k in df.columns}
    df = df.rename(columns=rename_dict)
    
    # 필수 컬럼 확인
    required_columns = ['날짜', '비용', '노출수', '클릭수']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"필수 컬럼이 없습니다: {missing_columns}")
    
    # 데이터 타입 변환 (문자열을 숫자로, 쉼표 처리 추가)
    numeric_columns = ['비용', '노출수', '클릭수']
    for col in numeric_columns:
        if col in df.columns:
            # 쉼표 제거 및 숫자 변환
            df[col] = df[col].astype(str).str.replace(',', '', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # 클릭당비용 컬럼이 없으면 계산
    if '클릭당비용' not in df.columns:
        df['클릭당비용'] = df.apply(
            lambda row: row['비용'] / row['클릭수'] if row['클릭수'] > 0 else 0, 
            axis=1
        )
    else:
        df['클릭당비용'] = df['클릭당비용'].astype(str).str.replace(',', '', regex=False)
        df['클릭당비용'] = pd.to_numeric(df['클릭당비용'], errors='coerce').fillna(0)
    
    # 날짜를 역순으로 정렬 (오래된 날짜가 먼저 오도록)
    df = df.iloc[::-1].reset_index(drop=True)
    
    # 날짜 파싱 (12-01 형식을 2025-12-01로 변환)
    current_year = datetime.now().year
    try:
        df['날짜_파싱'] = df['날짜'].apply(lambda x: f"{current_year}-{x}")
        df['날짜_객체'] = pd.to_datetime(df['날짜_파싱'])
    except Exception as e:
        print(f"⚠️ 날짜 파싱 경고: {e}")
        # 날짜 파싱 실패 시 인덱스 사용
        df['날짜_객체'] = pd.to_datetime('today')
    
    # 전체 통계 계산
    total_cost = float(df['비용'].sum())
    total_impressions = int(df['노출수'].sum())
    total_clicks = int(df['클릭수'].sum())
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    avg_cpc = (total_cost / total_clicks) if total_clicks > 0 else 0
    days_count = len(df)
    
    overall_stats = {
        'total_cost': round(total_cost),
        'total_impressions': total_impressions,
        'total_clicks': total_clicks,
        'avg_ctr': round(avg_ctr, 2),
        'avg_cpc': round(avg_cpc, 2),
        'avg_daily_cost': round(total_cost / days_count) if days_count > 0 else 0,
        'avg_daily_impressions': round(total_impressions / days_count) if days_count > 0 else 0,
        'avg_daily_clicks': round(total_clicks / days_count, 1) if days_count > 0 else 0,
        'days_count': days_count
    }
    
    # 주차별 분석 (7일 단위로 그룹화)
    weekly_data = []
    for week_num in range(4):
        start_idx = week_num * 7
        end_idx = min(start_idx + 7, len(df))
        
        if start_idx >= len(df):
            break
            
        week_df = df.iloc[start_idx:end_idx]
        
        week_impressions = int(week_df['노출수'].sum())
        week_clicks = int(week_df['클릭수'].sum())
        week_ctr = (week_clicks / week_impressions * 100) if week_impressions > 0 else 0
        week_days = len(week_df)
        
        weekly_data.append({
            'week_number': week_num + 1,
            'impressions': week_impressions,
            'clicks': week_clicks,
            'ctr': round(week_ctr, 2),
            'avg_daily_impressions': round(week_impressions / week_days) if week_days > 0 else 0,
            'cost': round(float(week_df['비용'].sum())),
            'days': week_days
        })
    
    # 일별 데이터 (차트 및 테이블용)
    daily_data = []
    for _, row in df.iterrows():
        impressions = int(row['노출수'])
        clicks = int(row['클릭수'])
        cost = float(row['비용'])
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        cpc = float(row['클릭당비용'])
        
        daily_data.append({
            'date': str(row['날짜']),
            'cost': round(cost),
            'impressions': impressions,
            'clicks': clicks,
            'ctr': round(ctr, 2),
            'cpc': round(cpc, 2)
        })
    
    # 날짜 범위
    first_date = str(df['날짜'].iloc[0])
    last_date = str(df['날짜'].iloc[-1])
    
    return {
        'overall_stats': overall_stats,
        'weekly_data': weekly_data,
        'daily_data': daily_data,
        'date_range': {
            'start': first_date,
            'end': last_date
        }
    }

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Excel 또는 CSV 파일을 업로드하고 데이터를 처리합니다.
    """
    try:
        print(f"📁 파일 업로드 시작: {file.filename}")
        
        # 파일 확장자 확인
        if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls') or file.filename.endswith('.csv')):
            raise HTTPException(status_code=400, detail="Excel (.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.")
        
        # 파일명에서 가맹점 이름 추출 (확장자 제거)
        store_name = file.filename.rsplit('.', 1)[0]
        print(f"🏪 가맹점 이름: {store_name}")
        
        # 파일 읽기
        contents = await file.read()
        print(f"✅ 파일 읽기 완료: {len(contents)} bytes")
        
        # DataFrame으로 변환
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        print(f"✅ DataFrame 생성 완료: {df.shape}")
        print(f"컬럼: {df.columns.tolist()}")
        
        # 데이터 처리
        result = process_excel_data(df)
        print(f"✅ 데이터 처리 완료")
        
        return {
            'success': True,
            'data': result,
            'filename': file.filename,
            'store_name': store_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"파일 처리 중 오류 발생: {str(e)}"
        print(f"❌ 에러 발생: {error_detail}")
        print(f"상세 스택 트레이스:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)

@app.get("/")
async def read_root():
    """
    메인 페이지 제공
    """
    return FileResponse('index.html')

if __name__ == "__main__":
    import uvicorn
    # Railway 등 클라우드 환경에서 제공하는 PORT 환경변수 사용
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
