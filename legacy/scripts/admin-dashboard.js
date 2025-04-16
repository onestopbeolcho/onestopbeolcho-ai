// 대시보드 초기화 함수
export async function initializeDashboard() {
    try {
        // 차트 초기화
        const ctx = document.getElementById('statsChart');
        if (ctx) {
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
                    datasets: [{
                        label: '실시간 사용자',
                        data: [12, 19, 3, 5, 2, 3, 7, 8],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // 알림 업데이트
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            try {
                // Firebase에서 알림 데이터 가져오기
                const notifications = [
                    { type: 'new', text: '새로운 서비스 요청이 등록되었습니다.', time: '5분 전' },
                    { type: 'update', text: '작업 상태가 업데이트되었습니다.', time: '10분 전' },
                    { type: 'system', text: '시스템 업데이트가 완료되었습니다.', time: '1시간 전' }
                ];

                notificationsList.innerHTML = notifications.map(notification => `
                    <li class="notification-item ${notification.type}">
                        <span class="notification-text">${notification.text}</span>
                        <span class="notification-time">${notification.time}</span>
                    </li>
                `).join('');
            } catch (error) {
                console.error('Error loading notifications:', error);
                notificationsList.innerHTML = '<li class="error">알림을 불러오는 중 오류가 발생했습니다.</li>';
            }
        }

        // 시스템 상태 업데이트
        const systemStatus = document.getElementById('systemStatus');
        if (systemStatus) {
            try {
                systemStatus.innerHTML = `
                    <div class="status-item">
                        <span class="status-indicator online"></span>
                        <span class="status-text">시스템 정상</span>
                    </div>
                    <div class="status-item">
                        <span class="status-indicator online"></span>
                        <span class="status-text">데이터베이스 정상</span>
                    </div>
                    <div class="status-item">
                        <span class="status-indicator online"></span>
                        <span class="status-text">API 서버 정상</span>
                    </div>
                `;
            } catch (error) {
                console.error('Error updating system status:', error);
                systemStatus.innerHTML = '<div class="error">시스템 상태를 불러오는 중 오류가 발생했습니다.</div>';
            }
        }

        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        throw error;
    }
} 