# CPC 월간 리포트 생성기 (CPC Report Monthly)

다중디앤핑 엑셀 데이터를 활용하여 시각화된 CPC 성과 리포트를 생성하는 웹 서비스입니다.

## 주요 기능
- 엑셀 파일 업로드 및 데이터 통계 자동 계산
- 주차별 성과 분석 및 일별 추이 차트 제공
- 리포트 결과 PNG 및 PDF 저장 기능

## 배포 가이드 (Railway)
이 프로젝트는 Railway 플랫폼에 최적화되어 있습니다.

1. 이 저장소를 본인의 GitHub에 푸시합니다.
2. [Railway](https://railway.app/) 대시보드에서 **New Project**를 클릭합니다.
3. **Deploy from GitHub repo**를 선택하고 이 저장소를 연결합니다.
4. Railway가 자동으로 `Dockerfile`을 감지하여 빌드 및 배포를 완료합니다.

## 로컬 실행 방법
```bash
# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
```
접속 주소: `http://localhost:8000`
