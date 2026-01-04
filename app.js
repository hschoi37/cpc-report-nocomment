// 전역 상태 관리
let reportData = null;
let storeName = '수라게장1229'; // 기본값
let inputData = {
    weekdayLimit: 120,
    weekendLimit: 180,
    totalBudget: 3000,
    currentBalance: 1105
};

// DOM 요소
const uploadSection = document.getElementById('upload-section');
const inputSection = document.getElementById('input-section');
const reportSection = document.getElementById('report-section');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    initializeInputDashboard();
    initializeReportControls();
});

// ===== 1단계: 파일 업로드 =====
function initializeUpload() {
    // 클릭 업로드
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 파일 선택
    fileInput.addEventListener('change', handleFileSelect);

    // 드래그 앤 드롭
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragging');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

async function uploadFile(file) {
    // 파일 형식 확인
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
        showUploadStatus('지원하지 않는 파일 형식입니다. Excel 또는 CSV 파일을 업로드해주세요.', 'error');
        return;
    }

    showUploadStatus('파일 업로드 중...', 'success');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = '파일 업로드 실패';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.detail || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (result.success) {
            reportData = result.data;
            storeName = result.store_name || '매장';
            console.log('가맹점 이름:', storeName);
            showUploadStatus(`✅ ${result.filename} 업로드 완료!`, 'success');

            // 바로 리포트 생성
            setTimeout(() => {
                uploadSection.classList.add('hidden');
                generateReport();
            }, 1000);
        } else {
            throw new Error('데이터 처리 실패');
        }

    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus(`❌ 오류: ${error.message}`, 'error');
    }
}

function showUploadStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
    uploadStatus.classList.remove('hidden');
}

// ===== 2단계: 입력 대시보드 (사용 안 함) =====
function initializeInputDashboard() {
    // 리포트 생성 버튼 (기존 기능 유지 또는 숨김)
    const generateBtn = document.getElementById('generate-report-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
}

function updateEstimatedDate() {
    // 입력값 가져오기 (엘리먼트가 존재하는 경우에만)
    const weekdayLimitEl = document.getElementById('weekday-limit');
    const weekendLimitEl = document.getElementById('weekend-limit');
    const currentBalanceEl = document.getElementById('current-balance');
    const totalBudgetEl = document.getElementById('total-budget');
    const lastChargeDateEl = document.getElementById('last-charge-date');

    if (weekdayLimitEl) inputData.weekdayLimit = parseFloat(weekdayLimitEl.value) || 0;
    if (weekendLimitEl) inputData.weekendLimit = parseFloat(weekendLimitEl.value) || 0;
    if (currentBalanceEl) inputData.currentBalance = parseFloat(currentBalanceEl.value) || 0;
    if (totalBudgetEl) inputData.totalBudget = parseFloat(totalBudgetEl.value) || 0;
    if (lastChargeDateEl) inputData.lastChargeDate = lastChargeDateEl.value;

    if (!reportData) return;

    // 소진 예상일 계산
    const avgDailyCost = reportData.overall_stats.avg_daily_cost;
    const daysRemaining = Math.floor(inputData.currentBalance / avgDailyCost);

    const today = new Date();
    const estimatedDate = new Date(today);
    estimatedDate.setDate(today.getDate() + daysRemaining);

    const formattedDate = `${estimatedDate.getFullYear()}.${String(estimatedDate.getMonth() + 1).padStart(2, '0')}.${String(estimatedDate.getDate()).padStart(2, '0')}`;

    const estimatedDateEl = document.getElementById('estimated-date');
    if (estimatedDateEl) estimatedDateEl.textContent = formattedDate;
}

// ===== 3단계: 리포트 생성 =====
function generateReport() {
    if (!reportData) {
        alert('데이터가 없습니다. 파일을 먼저 업로드해주세요.');
        return;
    }

    // 입력값 업데이트
    updateEstimatedDate();

    // 리포트 섹션으로 이동
    if (inputSection) inputSection.classList.add('hidden');
    reportSection.classList.remove('hidden');

    // 리포트 데이터 채우기
    populateReport();

    // 차트 생성
    createCharts();
}

function populateReport() {
    const stats = reportData.overall_stats;
    const dateRange = reportData.date_range;

    // 가맹점 이름 표시
    document.getElementById('store-name').textContent = storeName;

    // 날짜 범위
    document.getElementById('date-range').textContent = `2025.${dateRange.start} ~ 2025.${dateRange.end}`;
    document.getElementById('days-count').textContent = stats.days_count;





    // 핵심 성과 지표
    document.getElementById('total-cost').textContent = `${Math.round(stats.total_cost).toLocaleString()} CNY`;
    document.getElementById('avg-daily-cost').textContent = Math.round(stats.avg_daily_cost).toLocaleString();
    document.getElementById('total-impressions').textContent = `${stats.total_impressions.toLocaleString()}회`;
    document.getElementById('avg-daily-impressions').textContent = stats.avg_daily_impressions.toLocaleString();
    document.getElementById('total-clicks').textContent = `${stats.total_clicks.toLocaleString()}회`;
    document.getElementById('avg-daily-clicks').textContent = stats.avg_daily_clicks;
    document.getElementById('avg-ctr').textContent = `${Number(stats.avg_ctr).toFixed(2)}%`;



    // 주간별 분석
    populateWeeklyData();

    // 일별 상세 데이터
    populateDailyTable();
}

function populateWeeklyData() {
    const weeklyGrid = document.getElementById('weekly-grid');
    if (!weeklyGrid) return;
    weeklyGrid.innerHTML = '';

    const weekClasses = ['', 'week2', 'week3', 'week4'];

    reportData.weekly_data.forEach((week, index) => {
        const weekCard = document.createElement('div');
        weekCard.className = `weekly-card ${weekClasses[index]}`;

        weekCard.innerHTML = `
            <div class="weekly-label">📅 ${week.week_number}주차</div>
            <div class="weekly-metric">
                <span class="weekly-metric-label">노출수</span>
                <span class="weekly-metric-value">${week.impressions.toLocaleString()}회</span>
            </div>
            <div class="weekly-metric">
                <span class="weekly-metric-label">클릭수</span>
                <span class="weekly-metric-value">${week.clicks.toLocaleString()}회</span>
            </div>
            <div class="weekly-metric">
                <span class="weekly-metric-label">클릭률</span>
                <span class="weekly-metric-value">${Number(week.ctr).toFixed(2)}%</span>
            </div>
            <div class="weekly-metric">
                <span class="weekly-metric-label">일평균 노출</span>
                <span class="weekly-metric-value">${week.avg_daily_impressions.toLocaleString()}회</span>
            </div>
        `;

        weeklyGrid.appendChild(weekCard);
    });
}

function populateDailyTable() {
    const tbody = document.getElementById('daily-table-body');
    tbody.innerHTML = '';

    reportData.daily_data.forEach(day => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${day.date}</td>
            <td>${Math.round(day.cost).toLocaleString()} CNY</td>
            <td>${day.impressions.toLocaleString()}</td>
            <td>${day.clicks}</td>
            <td>${Number(day.ctr).toFixed(2)}%</td>
            <td>${Number(day.cpc).toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

// ===== 차트 생성 =====
let impressionsChart = null;
let clicksChart = null;
let ctrChart = null;

function createCharts() {
    const dailyData = reportData.daily_data;

    const labels = dailyData.map(d => d.date);
    const impressions = dailyData.map(d => d.impressions);
    const clicks = dailyData.map(d => d.clicks);
    const ctrs = dailyData.map(d => d.ctr);

    // 기존 차트 제거
    if (impressionsChart) impressionsChart.destroy();
    if (clicksChart) clicksChart.destroy();
    if (ctrChart) ctrChart.destroy();

    // 일별 노출수 차트
    const impressionsCtx = document.getElementById('impressionsChart').getContext('2d');
    impressionsChart = new Chart(impressionsCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '노출수',
                data: impressions,
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129, 140, 248, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#818cf8',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc', font: { family: 'Outfit' } } }
            }
        }
    });

    // 일별 클릭수 차트
    const clicksCtx = document.getElementById('clicksChart').getContext('2d');
    clicksChart = new Chart(clicksCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '클릭수',
                data: clicks,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#a855f7',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc', font: { family: 'Outfit' } } }
            }
        }
    });

    // 클릭률 차트
    const ctrCtx = document.getElementById('ctrChart').getContext('2d');
    ctrChart = new Chart(ctrCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '클릭률 (%)',
                data: ctrs,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: Math.max(...ctrs) * 1.2,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc', font: { family: 'Outfit', size: 14, weight: 'bold' } } }
            }
        }
    });
}

// ===== 리포트 컨트롤 =====
function initializeReportControls() {
    // 새 리포트 작성 버튼
    document.getElementById('new-report-btn').addEventListener('click', () => {
        if (!confirm('새로운 가맹점 리포트를 작성하시겠습니까?\n현재 작성 중인 리포트는 사라집니다.')) {
            return;
        }

        // 상태 초기화
        reportData = null;
        fileInput.value = ''; // 파일 필드 초기화
        uploadStatus.classList.add('hidden');

        // 화면 전환: 리포트 -> 업로드
        reportSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    });



    document.getElementById('save-png-btn').addEventListener('click', saveToPNG);
    document.getElementById('save-pdf-btn').addEventListener('click', saveToPDF);
}

// ===== 4단계: 내보내기 =====
async function saveToPNG() {
    if (!confirm('인사이트 수정을 완료하셨나요?\n\n리포트를 PNG 이미지로 저장합니다.')) {
        return;
    }

    const container = document.getElementById('report-container');
    const controls = document.querySelector('.report-controls');

    // 컨트롤 숨기기
    controls.style.display = 'none';

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // PNG 다운로드
        const link = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        link.download = `${storeName}_CPC운영리포트_${today}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        alert('✅ PNG 파일이 저장되었습니다!');

    } catch (error) {
        console.error('PNG export error:', error);
        alert('❌ PNG 저장 중 오류가 발생했습니다.');
    } finally {
        // 컨트롤 다시 표시
        controls.style.display = 'flex';
    }
}

async function saveToPDF() {
    if (!confirm('인사이트 수정을 완료하셨나요?\n\n리포트를 PDF로 저장합니다.')) {
        return;
    }

    const container = document.getElementById('report-container');
    const controls = document.querySelector('.report-controls');

    // 컨트롤 숨기기
    controls.style.display = 'none';

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;

        // A4 크기 계산
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // 첫 페이지
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // 추가 페이지 (필요한 경우)
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        // PDF 다운로드
        const today = new Date().toISOString().split('T')[0];
        pdf.save(`${storeName}_CPC운영리포트_${today}.pdf`);

        alert('✅ PDF 파일이 저장되었습니다!');

    } catch (error) {
        console.error('PDF export error:', error);
        alert('❌ PDF 저장 중 오류가 발생했습니다.');
    } finally {
        // 컨트롤 다시 표시
        controls.style.display = 'flex';
    }
}
