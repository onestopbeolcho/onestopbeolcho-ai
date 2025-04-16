// DOM 요소
const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
const sections = document.querySelectorAll('.section');
const notificationContainer = document.getElementById('notification-container');

// 현재 로그인한 작업자 정보
let currentWorker = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 상태 확인
    checkLoginStatus();
    
    // 사이드바 네비게이션 이벤트 리스너
    setupNavigation();
    
    // 초기 섹션 표시
    showSection('dashboard');
    
    // 새로운 기능 초기화
    initializeCalendar();
    setupRealtimeNotifications();
    
    // 작업 지도 초기화
    initializeWorkMap();
});

// 로그인 상태 확인
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/worker/me');
        if (response.ok) {
            currentWorker = await response.json();
            updateWorkerInfo();
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        showNotification('서버 연결 오류', 'error');
    }
}

// 작업자 정보 업데이트
function updateWorkerInfo() {
    document.querySelector('.worker-name').textContent = currentWorker.name;
    document.querySelector('.worker-email').textContent = currentWorker.email;
    document.querySelector('.worker-phone').textContent = currentWorker.phone;
    
    // 작업 통계 업데이트
    updateStats();
}

// 통계 업데이트
async function updateStats() {
    try {
        const response = await fetch('/api/worker/stats');
        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('total-jobs').textContent = stats.totalJobs;
            document.getElementById('completed-jobs').textContent = stats.completedJobs;
            document.getElementById('pending-requests').textContent = stats.pendingRequests;
            document.getElementById('rating').textContent = stats.rating;
        }
    } catch (error) {
        showNotification('통계 업데이트 실패', 'error');
    }
}

// 서비스 요청 목록 업데이트
async function updateServiceRequests() {
    try {
        const response = await fetch('/api/worker/requests');
        if (response.ok) {
            const requests = await response.json();
            const container = document.getElementById('requests-container');
            
            container.innerHTML = requests.map(request => createRequestCard(request)).join('');
        }
    } catch (error) {
        showNotification('요청 목록 업데이트 실패', 'error');
    }
}

// 진행 중 작업 목록 업데이트
async function updateOngoingJobs() {
    try {
        const response = await fetch('/api/worker/ongoing-jobs');
        if (response.ok) {
            const jobs = await response.json();
            const container = document.getElementById('ongoing-jobs-container');
            
            container.innerHTML = jobs.map(job => `
                <div class="job-card">
                    <div class="card-header">
                        <h3 class="card-title">${job.serviceType}</h3>
                        <span class="card-status status-in-progress">진행중</span>
                    </div>
                    <p>고객: ${job.customerName}</p>
                    <p>위치: ${job.location}</p>
                    <p>시작 시간: ${new Date(job.startTime).toLocaleString()}</p>
                    <button class="btn-primary" onclick="completeJob('${job.id}')">완료</button>
                </div>
            `).join('');
        }
    } catch (error) {
        showNotification('작업 목록 업데이트 실패', 'error');
    }
}

// 완료된 작업 목록 업데이트
async function updateCompletedJobs() {
    try {
        const response = await fetch('/api/worker/completed-jobs');
        if (response.ok) {
            const jobs = await response.json();
            const container = document.getElementById('completed-jobs-container');
            
            container.innerHTML = jobs.map(job => `
                <div class="job-card">
                    <div class="card-header">
                        <h3 class="card-title">${job.serviceType}</h3>
                        <span class="card-status status-completed">완료</span>
                    </div>
                    <p>고객: ${job.customerName}</p>
                    <p>위치: ${job.location}</p>
                    <p>완료 시간: ${new Date(job.completionTime).toLocaleString()}</p>
                    <p>평가: ${job.rating ? job.rating + '점' : '평가 없음'}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        showNotification('완료된 작업 목록 업데이트 실패', 'error');
    }
}

// 요청 수락
async function acceptRequest(requestId) {
    try {
        const response = await fetch(`/api/worker/requests/${requestId}/accept`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('요청을 수락했습니다', 'success');
            updateServiceRequests();
            updateStats();
        } else {
            showNotification('요청 수락 실패', 'error');
        }
    } catch (error) {
        showNotification('서버 오류', 'error');
    }
}

// 작업 완료
async function completeJob(jobId) {
    try {
        const response = await fetch(`/api/worker/jobs/${jobId}/complete`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('작업을 완료했습니다', 'success');
            updateOngoingJobs();
            updateCompletedJobs();
            updateStats();
        } else {
            showNotification('작업 완료 처리 실패', 'error');
        }
    } catch (error) {
        showNotification('서버 오류', 'error');
    }
}

// 채팅 기능
let currentChat = null;

async function loadChats() {
    try {
        const response = await fetch('/api/worker/chats');
        if (response.ok) {
            const chats = await response.json();
            const container = document.getElementById('chat-list');
            
            container.innerHTML = chats.map(chat => `
                <div class="chat-item" onclick="openChat('${chat.id}')">
                    <h4>${chat.customerName}</h4>
                    <p>${chat.lastMessage || '대화 없음'}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        showNotification('채팅 목록 로드 실패', 'error');
    }
}

async function openChat(chatId) {
    currentChat = chatId;
    try {
        const response = await fetch(`/api/worker/chats/${chatId}`);
        if (response.ok) {
            const chat = await response.json();
            const container = document.getElementById('chat-messages');
            
            container.innerHTML = chat.messages.map(msg => `
                <div class="message ${msg.sender === 'worker' ? 'sent' : 'received'}">
                    <p>${msg.content}</p>
                    <span class="message-time">${new Date(msg.timestamp).toLocaleString()}</span>
                </div>
            `).join('');
            
            container.scrollTop = container.scrollHeight;
        }
    } catch (error) {
        showNotification('채팅 로드 실패', 'error');
    }
}

async function sendMessage() {
    if (!currentChat) return;
    
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        const response = await fetch(`/api/worker/chats/${currentChat}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        if (response.ok) {
            input.value = '';
            openChat(currentChat);
        } else {
            showNotification('메시지 전송 실패', 'error');
        }
    } catch (error) {
        showNotification('서버 오류', 'error');
    }
}

// 설정 업데이트
async function updateSettings() {
    const form = document.getElementById('settings-form');
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/worker/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: formData.get('phone'),
                password: formData.get('password'),
                areas: formData.getAll('areas')
            })
        });
        
        if (response.ok) {
            showNotification('설정이 업데이트되었습니다', 'success');
            checkLoginStatus();
        } else {
            showNotification('설정 업데이트 실패', 'error');
        }
    } catch (error) {
        showNotification('서버 오류', 'error');
    }
}

// 알림 표시
function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationContainer.appendChild(notification);
    
    // 5초 후 자동으로 사라짐
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// 알림 타입별 아이콘 반환
function getNotificationIcon(type) {
    const icons = {
        'info': 'fa-info-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-circle',
        'error': 'fa-times-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// 네비게이션 설정
function setupNavigation() {
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });
}

// 섹션 표시
function showSection(sectionId) {
    // 모든 섹션 숨기기
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // 모든 링크 비활성화
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // 선택된 섹션 표시
    document.getElementById(sectionId).classList.add('active');
    
    // 선택된 링크 활성화
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    
    // 섹션별 데이터 업데이트
    switch (sectionId) {
        case 'dashboard':
            updateStats();
            break;
        case 'requests':
            updateServiceRequests();
            break;
        case 'ongoing':
            updateOngoingJobs();
            break;
        case 'completed':
            updateCompletedJobs();
            break;
        case 'chat':
            loadChats();
            break;
    }
}

// 로그아웃
function logout() {
    fetch('/api/auth/logout', {
        method: 'POST'
    }).then(() => {
        window.location.href = '/login.html';
    });
}

// 요청 정보 수정 모달 표시
async function showEditRequestModal(requestId) {
    try {
        const response = await fetch(`/api/worker/requests/${requestId}`);
        if (response.ok) {
            const request = await response.json();
            
            // 모달 내용 업데이트
            document.getElementById('edit-request-id').value = requestId;
            document.getElementById('edit-grave-count').value = request.graveCount || '';
            document.getElementById('edit-area-size').value = request.areaSize || '';
            document.getElementById('edit-latitude').value = request.latitude || '';
            document.getElementById('edit-longitude').value = request.longitude || '';
            document.getElementById('edit-address').value = request.address || '';
            document.getElementById('edit-notes').value = request.notes || '';
            
            // 모달 표시
            new bootstrap.Modal(document.getElementById('editRequestModal')).show();
        }
    } catch (error) {
        showNotification('요청 정보 로드 실패', 'error');
    }
}

// 요청 정보 수정 저장
async function saveRequestEdit() {
    const requestId = document.getElementById('edit-request-id').value;
    const formData = {
        graveCount: document.getElementById('edit-grave-count').value,
        areaSize: document.getElementById('edit-area-size').value,
        latitude: document.getElementById('edit-latitude').value,
        longitude: document.getElementById('edit-longitude').value,
        address: document.getElementById('edit-address').value,
        notes: document.getElementById('edit-notes').value
    };
    
    try {
        const response = await fetch(`/api/worker/requests/${requestId}/edit`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('요청 정보가 수정되었습니다', 'success');
            updateServiceRequests();
            bootstrap.Modal.getInstance(document.getElementById('editRequestModal')).hide();
        } else {
            showNotification('요청 정보 수정 실패', 'error');
        }
    } catch (error) {
        showNotification('서버 오류', 'error');
    }
}

// 지도에서 위치 선택
function selectLocationFromMap() {
    const mapModal = new bootstrap.Modal(document.getElementById('mapModal'));
    mapModal.show();
    
    // 카카오맵 초기화
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울시청 좌표
        level: 3
    };
    
    const map = new kakao.maps.Map(mapContainer, mapOption);
    
    // 마커 생성
    const marker = new kakao.maps.Marker({
        position: map.getCenter()
    });
    marker.setMap(map);
    
    // 지도 클릭 이벤트
    kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
        const latlng = mouseEvent.latLng;
        marker.setPosition(latlng);
        
        // 좌표를 주소로 변환
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function(result, status) {
            if (status === kakao.maps.services.Status.OK) {
                const address = result[0].address.address_name;
                document.getElementById('edit-address').value = address;
                document.getElementById('edit-latitude').value = latlng.getLat();
                document.getElementById('edit-longitude').value = latlng.getLng();
            }
        });
    });
}

// 요청 카드에 수정 버튼 추가
function createRequestCard(request) {
    return `
        <div class="request-card">
            <div class="card-header">
                <h3 class="card-title">${request.serviceType}</h3>
                <span class="card-status status-pending">대기중</span>
            </div>
            <p>고객: ${request.customerName}</p>
            <p>위치: ${request.address}</p>
            <p>봉분 수: ${request.graveCount || '미입력'}</p>
            <p>면적: ${request.areaSize || '미입력'}</p>
            <p>요청 시간: ${new Date(request.requestTime).toLocaleString()}</p>
            <div class="card-actions">
                <button class="btn-primary" onclick="acceptRequest('${request.id}')">수락</button>
                <button class="btn-secondary" onclick="showEditRequestModal('${request.id}')">정보 수정</button>
            </div>
        </div>
    `;
}

// 캘린더 초기화
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: async function(info, successCallback, failureCallback) {
            try {
                const response = await fetch(`/api/worker/schedule?start=${info.startStr}&end=${info.endStr}`);
                if (response.ok) {
                    const events = await response.json();
                    const formattedEvents = events.map(event => ({
                        id: event.id,
                        title: `${event.serviceType} - ${event.customerName}`,
                        start: event.scheduledDate,
                        end: event.completionDate,
                        extendedProps: {
                            status: event.status,
                            customerName: event.customerName,
                            address: event.address,
                            serviceType: event.serviceType,
                            notes: event.notes
                        },
                        backgroundColor: getStatusColor(event.status),
                        borderColor: getStatusColor(event.status)
                    }));
                    successCallback(formattedEvents);
                }
            } catch (error) {
                showNotification('일정 로드 실패', 'error');
                failureCallback(error);
            }
        },
        eventClick: function(info) {
            showJobDetails(info.event.id);
        },
        eventDidMount: function(info) {
            const status = info.event.extendedProps.status;
            info.el.style.backgroundColor = getStatusColor(status);
            info.el.title = `${info.event.title}\n상태: ${status}`;
        }
    });
    calendar.render();
}

// 상태별 색상 반환
function getStatusColor(status) {
    const colors = {
        'pending': '#ff9800',      // 주황색
        'confirmed': '#2196f3',    // 파란색
        'in-progress': '#4caf50',  // 초록색
        'completed': '#9e9e9e',    // 회색
        'cancelled': '#f44336'     // 빨간색
    };
    return colors[status] || '#9e9e9e';
}

// 작업 현황 상세 정보 표시
async function showJobDetails(jobId) {
    try {
        const response = await fetch(`/api/worker/jobs/${jobId}`);
        if (response.ok) {
            const job = await response.json();
            
            const modal = new bootstrap.Modal(document.getElementById('jobDetailsModal'));
            const modalBody = document.getElementById('job-details-body');
            
            modalBody.innerHTML = `
                <div class="job-details">
                    <div class="job-header mb-4">
                        <h4>${job.serviceType}</h4>
                        <span class="status-badge ${job.status}">${getStatusText(job.status)}</span>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h5>고객 정보</h5>
                            <p><strong>이름:</strong> ${job.customerName}</p>
                            <p><strong>연락처:</strong> ${job.customerPhone}</p>
                        </div>
                        <div class="col-md-6">
                            <h5>작업 정보</h5>
                            <p><strong>예정일:</strong> ${new Date(job.scheduledDate).toLocaleString()}</p>
                            <p><strong>완료일:</strong> ${job.completionDate ? new Date(job.completionDate).toLocaleString() : '미정'}</p>
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-12">
                            <h5>위치 정보</h5>
                            <p><strong>주소:</strong> ${job.address}</p>
                            <div class="map-container mb-3" id="job-map" style="height: 200px;"></div>
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h5>작업 상세</h5>
                            <p><strong>봉분 수:</strong> ${job.graveCount || '미입력'}</p>
                            <p><strong>면적:</strong> ${job.areaSize || '미입력'}평</p>
                        </div>
                        <div class="col-md-6">
                            <h5>비고</h5>
                            <p>${job.notes || '없음'}</p>
                        </div>
                    </div>
                    
                    <div class="job-actions mt-4">
                        <button class="btn btn-primary" onclick="updateJobStatus('${job.id}', 'in-progress')">작업 시작</button>
                        <button class="btn btn-success" onclick="updateJobStatus('${job.id}', 'completed')">작업 완료</button>
                        <button class="btn btn-info" onclick="showEditJobModal('${job.id}')">정보 수정</button>
                        <button class="btn btn-secondary" onclick="showMessageModal('${job.id}', '${job.customerId}')">메시지 보내기</button>
                    </div>
                </div>
            `;
            
            // 지도 초기화
            initializeJobMap(job.latitude, job.longitude, job.address);
            
            modal.show();
        }
    } catch (error) {
        showNotification('작업 정보 로드 실패', 'error');
    }
}

// 상태 텍스트 반환
function getStatusText(status) {
    const statusTexts = {
        'pending': '대기중',
        'confirmed': '확인됨',
        'in-progress': '진행중',
        'completed': '완료',
        'cancelled': '취소됨'
    };
    return statusTexts[status] || status;
}

// 작업 지도 초기화
function initializeJobMap(latitude, longitude, address) {
    const mapContainer = document.getElementById('job-map');
    const mapOption = {
        center: new kakao.maps.LatLng(latitude, longitude),
        level: 3
    };
    
    const map = new kakao.maps.Map(mapContainer, mapOption);
    
    // 마커 생성
    const marker = new kakao.maps.Marker({
        position: map.getCenter()
    });
    marker.setMap(map);
    
    // 인포윈도우 생성
    const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px;">${address}</div>`
    });
    infowindow.open(map, marker);
}

// 작업 상태 업데이트
async function updateJobStatus(jobId, newStatus) {
    try {
        const response = await fetch(`/api/worker/jobs/${jobId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            showNotification('작업 상태가 업데이트되었습니다', 'success');
            updateCalendar();
            updateJobList();
        } else {
            showNotification('작업 상태 업데이트 실패', 'error');
        }
    } catch (error) {
        showNotification('서버 오류', 'error');
    }
}

// 실시간 알림 설정
function setupRealtimeNotifications() {
    const workerId = currentWorker.id;
    
    // Firebase Realtime Database 리스너 설정
    const notificationsRef = firebase.database().ref(`notifications/workers/${workerId}`);
    
    notificationsRef.on('child_added', (snapshot) => {
        const notification = snapshot.val();
        if (!notification.read) {
            showNotification(notification.message, notification.type);
            
            // 알림 읽음 처리
            snapshot.ref.update({ read: true });
        }
    });
}

// 작업 지도 초기화
function initializeWorkMap() {
    const mapContainer = document.getElementById('work-map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울시청 좌표
        level: 3
    };
    
    const map = new kakao.maps.Map(mapContainer, mapOption);
    
    // 작업 위치 마커 표시
    loadWorkLocations(map);
}

// 작업 위치 로드 및 마커 표시
async function loadWorkLocations(map) {
    try {
        const response = await fetch('/api/worker/work-locations');
        if (response.ok) {
            const locations = await response.json();
            
            locations.forEach(location => {
                const marker = new kakao.maps.Marker({
                    position: new kakao.maps.LatLng(location.latitude, location.longitude),
                    map: map
                });
                
                // 인포윈도우 생성
                const infowindow = new kakao.maps.InfoWindow({
                    content: `
                        <div style="padding:10px;">
                            <h5>${location.serviceType}</h5>
                            <p>고객: ${location.customerName}</p>
                            <p>주소: ${location.address}</p>
                            <p>예정일: ${new Date(location.scheduledDate).toLocaleString()}</p>
                            <p>상태: ${getStatusText(location.status)}</p>
                            <button onclick="showJobDetails('${location.jobId}')" class="btn btn-sm btn-primary">상세보기</button>
                        </div>
                    `
                });
                
                // 마커 클릭 이벤트
                kakao.maps.event.addListener(marker, 'click', function() {
                    infowindow.open(map, marker);
                });
                
                // 상태별 마커 색상 설정
                marker.setImage(getStatusMarkerImage(location.status));
            });
        }
    } catch (error) {
        showNotification('작업 위치 로드 실패', 'error');
    }
}

// 상태별 마커 이미지 반환
function getStatusMarkerImage(status) {
    const markerColors = {
        'pending': 'red',
        'confirmed': 'blue',
        'in-progress': 'green',
        'completed': 'gray',
        'cancelled': 'black'
    };
    
    const color = markerColors[status] || 'gray';
    const imageSrc = `https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_${color}.png`;
    
    return new kakao.maps.MarkerImage(
        imageSrc,
        new kakao.maps.Size(64, 69),
        { offset: new kakao.maps.Point(27, 69) }
    );
} 