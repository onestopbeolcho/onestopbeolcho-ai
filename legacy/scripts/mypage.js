import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 상태 변경 이력 불러오기
async function loadStatusHistory(serviceRequestId) {
  try {
    const statusHistoryRef = db.collection('statusHistory')
      .where('serviceRequestId', '==', serviceRequestId)
      .orderBy('changedAt', 'desc');
    
    const snapshot = await statusHistoryRef.get();
    const statusHistoryList = document.getElementById('status-history-list');
    statusHistoryList.innerHTML = '';
    
    if (snapshot.empty) {
      statusHistoryList.innerHTML = '<p>상태 변경 이력이 없습니다.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const history = doc.data();
      const historyItem = document.createElement('div');
      historyItem.className = 'status-history-item';
      
      const statusChange = document.createElement('div');
      statusChange.className = 'status-change';
      
      const previousStatus = document.createElement('span');
      previousStatus.className = 'previous-status';
      previousStatus.textContent = history.previousStatus;
      
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      
      const newStatus = document.createElement('span');
      newStatus.className = 'new-status';
      newStatus.textContent = history.newStatus;
      
      statusChange.appendChild(previousStatus);
      statusChange.appendChild(arrow);
      statusChange.appendChild(newStatus);
      
      const changeInfo = document.createElement('div');
      changeInfo.className = 'change-info';
      
      const changedBy = document.createElement('span');
      changedBy.className = 'changed-by';
      changedBy.textContent = history.changedBy;
      
      const changedAt = document.createElement('span');
      changedAt.className = 'changed-at';
      changedAt.textContent = formatDate(history.changedAt.toDate());
      
      changeInfo.appendChild(changedBy);
      changeInfo.appendChild(changedAt);
      
      historyItem.appendChild(statusChange);
      historyItem.appendChild(changeInfo);
      
      statusHistoryList.appendChild(historyItem);
    });
  } catch (error) {
    console.error('상태 변경 이력 불러오기 실패:', error);
    const statusHistoryList = document.getElementById('status-history-list');
    statusHistoryList.innerHTML = '<p>상태 변경 이력을 불러오는 중 오류가 발생했습니다.</p>';
  }
}

// 날짜 포맷팅 함수
function formatDate(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// 서비스 요청 상태 변경 시 이력 기록
async function updateServiceRequestStatus(serviceRequestId, newStatus) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const userDoc = await db
      .collection('users')
      .doc(user.uid)
      .get();
    
    const changedBy = userDoc.data().displayName || user.email;
    
    const updateStatus = firebase.functions().httpsCallable('onServiceRequestStatusChange');
    await updateStatus({
      serviceRequestId,
      newStatus,
      changedBy
    });
    
    // 상태 변경 이력 새로고침
    await loadStatusHistory(serviceRequestId);
    
    return true;
  } catch (error) {
    console.error('서비스 요청 상태 변경 실패:', error);
    throw error;
  }
}

// 서비스 요청 상태 관리
function updateServiceRequestStatus(requestId, newStatus) {
  const requestItem = document.querySelector(`[data-request-id="${requestId}"]`);
  if (!requestItem) return;

  const statusBadge = requestItem.querySelector('.status-badge');
  const previousStatus = statusBadge.className.split(' ').find(cls => cls.startsWith('status-'));
  
  // 상태 변경 애니메이션 적용
  statusBadge.classList.add('status-change');
  
  // 상태 뱃지 업데이트
  statusBadge.className = `status-badge status-${newStatus}`;
  
  // 상태 변경 이력 추가
  addStatusHistory(requestId, previousStatus, newStatus);
  
  // 애니메이션 완료 후 클래스 제거
  setTimeout(() => {
    statusBadge.classList.remove('status-change');
  }, 500);
}

// 상태 변경 이력 추가
function addStatusHistory(requestId, previousStatus, newStatus) {
  const historyList = document.getElementById('status-history-list');
  const historyItem = document.createElement('div');
  historyItem.className = 'status-history-item';
  
  const now = new Date();
  const formattedDate = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  historyItem.innerHTML = `
    <div class="status-history-date">${formattedDate}</div>
    <div class="status-history-status">${getStatusText(newStatus)}</div>
    <div class="status-history-note">상태가 ${getStatusText(previousStatus)}에서 ${getStatusText(newStatus)}로 변경되었습니다.</div>
  `;
  
  historyList.insertBefore(historyItem, historyList.firstChild);
}

// 상태 텍스트 변환
function getStatusText(status) {
  const statusMap = {
    'pending': '대기 중',
    'confirmed': '확인됨',
    'in-progress': '진행 중',
    'completed': '완료됨',
    'cancelled': '취소됨'
  };
  
  return statusMap[status] || status;
}

// 서비스 요청 로드 함수
async function loadServiceRequests() {
  try {
    const serviceRequestsList = document.getElementById('serviceRequests');
    if (!serviceRequestsList) {
      console.error('서비스 요청 목록 요소를 찾을 수 없습니다.');
      return;
    }

    serviceRequestsList.innerHTML = '<p>데이터를 불러오는 중...</p>';

    if (!auth.currentUser) {
      console.error('사용자가 로그인되어 있지 않습니다.');
      serviceRequestsList.innerHTML = '<p>로그인이 필요합니다.</p>';
      return;
    }

    console.log('현재 사용자 ID:', auth.currentUser.uid);

    const q = query(
      collection(db, 'serviceRequests'), 
      where('customerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    console.log('조회된 문서 수:', snapshot.size);
    
    if (snapshot.empty) {
      serviceRequestsList.innerHTML = '<p>서비스 요청 내역이 없습니다.</p>';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('문서 데이터:', data);
      html += createRequestCard(data);
    });

    serviceRequestsList.innerHTML = html;
    
    // 아코디언 기능 초기화
    document.querySelectorAll('.service-request-card').forEach(card => {
      card.addEventListener('click', function(e) {
        if (!e.target.closest('.service-actions')) {
          this.classList.toggle('active');
        }
      });
    });
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    const serviceRequestsList = document.getElementById('serviceRequests');
    if (serviceRequestsList) {
      serviceRequestsList.innerHTML = '<p>데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
  }
}

function createRequestCard(request) {
  const card = document.createElement('div');
  card.className = 'col-md-4';
  card.innerHTML = `
    <div class="card h-100 service-request-card">
      <div class="card-body">
        <div class="service-type-badge">
          <i class="fas fa-${getServiceIcon(request.serviceType)}"></i>
          <span>${request.serviceType}</span>
        </div>
        <div class="request-info">
          <div class="location">
            <i class="fas fa-map-marker-alt"></i>
            <span>${extractRegion(request.address)}</span>
          </div>
          <div class="date">
            <i class="far fa-calendar-alt"></i>
            <span>${formatDate(request.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  return card;
}

function getServiceIcon(serviceType) {
  const icons = {
    '벌초': 'tree',
    '예초': 'cut',
    '태양광 예초': 'solar-panel',
    '기타': 'ellipsis-h'
  };
  return icons[serviceType] || 'ellipsis-h';
}

function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return 'status-pending';
    case 'approved':
      return 'status-approved';
    case 'rejected':
      return 'status-rejected';
    case 'completed':
      return 'status-completed';
    default:
      return 'status-default';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'pending':
      return '대기중';
    case 'approved':
      return '승인됨';
    case 'rejected':
      return '거절됨';
    case 'completed':
      return '완료됨';
    default:
      return '알 수 없음';
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount);
}

// 서비스 상세 정보 표시 함수
function showServiceDetails(serviceId) {
    const modal = document.getElementById('serviceDetailModal');
    if (!modal) return;

    // 서비스 정보 로드
    db.collection('serviceRequests').doc(serviceId).get()
        .then((doc) => {
            if (!doc.exists) {
                alert('서비스 정보를 찾을 수 없습니다.');
                return;
            }

            const service = doc.data();
            const modalContent = `
                <div class="modal-header">
                    <h3>서비스 상세 정보</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="service-info">
                        <div class="info-group">
                            <label>서비스 유형</label>
                            <p>${service.serviceType}</p>
                        </div>
                        <div class="info-group">
                            <label>주소</label>
                            <p>${service.address}</p>
                            <button class="btn btn-sm btn-info" onclick="showMap(${service.location.latitude}, ${service.location.longitude}, '${service.address}')">
                                <i class="fas fa-map-marker-alt"></i> 지도 보기
                            </button>
                        </div>
                        <div class="info-group">
                            <label>예상 비용</label>
                            <p>${formatCurrency(service.expectedCost)}</p>
                        </div>
                        <div class="info-group">
                            <label>신청일</label>
                            <p>${formatDate(service.createdAt)}</p>
                        </div>
                        <div class="info-group">
                            <label>마감일</label>
                            <p>${formatDate(service.deadline)}</p>
                        </div>
                        <div class="info-group">
                            <label>상태</label>
                            <span class="status-badge ${getStatusClass(service.status)}">
                                ${getStatusText(service.status)}
                            </span>
                        </div>
                    </div>

                    <!-- 작업자 통신 섹션 -->
                    <div class="worker-communication">
                        <div class="communication-tabs">
                            <button class="tab-btn active" data-tab="chat">채팅</button>
                            <button class="tab-btn" data-tab="estimates">추가 견적</button>
                            <button class="tab-btn" data-tab="updates">작업 현황</button>
                            <button class="tab-btn" data-tab="requests">추가 요청</button>
                        </div>
                        <div class="tab-content">
                            <div id="chat" class="tab-pane active">
                                <div class="chat-messages"></div>
                                <div class="chat-input">
                                    <input type="text" placeholder="메시지를 입력하세요...">
                                    <button class="send-btn">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="estimates" class="tab-pane">
                                <div class="estimates-list"></div>
                                <button class="btn btn-primary" onclick="requestNewEstimate('${serviceId}')">
                                    새 견적 요청
                                </button>
                            </div>
                            <div id="updates" class="tab-pane">
                                <div class="updates-timeline"></div>
                            </div>
                            <div id="requests" class="tab-pane">
                                <div class="requests-list"></div>
                                <button class="btn btn-primary" onclick="addNewRequest('${serviceId}')">
                                    새 요청 추가
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            modal.innerHTML = modalContent;
            modal.style.display = 'block';

            // 탭 전환 이벤트 리스너
            const tabButtons = modal.querySelectorAll('.tab-btn');
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.dataset.tab;
                    switchTab(tabId);
                });
            });

            // 채팅 전송 이벤트 리스너
            const sendButton = modal.querySelector('.send-btn');
            const chatInput = modal.querySelector('.chat-input input');
            sendButton.addEventListener('click', () => {
                sendMessage(serviceId, chatInput.value);
                chatInput.value = '';
            });

            // 통신 데이터 로드
            loadCommunicationData(serviceId);
        })
        .catch((error) => {
            console.error('서비스 정보 로드 오류:', error);
            alert('서비스 정보를 불러오는 중 오류가 발생했습니다.');
        });
}

// 통신 데이터 로드 함수
function loadCommunicationData(serviceId) {
    // 채팅 메시지 로드
    db.collection('serviceRequests').doc(serviceId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            const chatMessages = document.querySelector('.chat-messages');
            chatMessages.innerHTML = '';
            
            snapshot.forEach(doc => {
                const message = doc.data();
                const messageElement = document.createElement('div');
                messageElement.className = `message ${message.sender === auth.currentUser.uid ? 'sent' : 'received'}`;
                messageElement.innerHTML = `
                    <div class="message-content">${message.content}</div>
                    <div class="message-time">${formatTime(message.timestamp)}</div>
                `;
                chatMessages.appendChild(messageElement);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });

    // 추가 견적 로드
    db.collection('serviceRequests').doc(serviceId)
        .collection('estimates')
        .orderBy('createdAt', 'desc')
        .get()
        .then((snapshot) => {
            const estimatesList = document.querySelector('.estimates-list');
            estimatesList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const estimate = doc.data();
                const estimateElement = document.createElement('div');
                estimateElement.className = 'estimate-item';
                estimateElement.innerHTML = `
                    <div class="estimate-amount">${formatCurrency(estimate.amount)}</div>
                    <div class="estimate-description">${estimate.description}</div>
                    <div class="estimate-date">${formatDate(estimate.createdAt)}</div>
                `;
                estimatesList.appendChild(estimateElement);
            });
        });

    // 작업 현황 로드
    db.collection('serviceRequests').doc(serviceId)
        .collection('updates')
        .orderBy('timestamp', 'desc')
        .get()
        .then((snapshot) => {
            const updatesTimeline = document.querySelector('.updates-timeline');
            updatesTimeline.innerHTML = '';
            
            snapshot.forEach(doc => {
                const update = doc.data();
                const updateElement = document.createElement('div');
                updateElement.className = 'timeline-item';
                updateElement.innerHTML = `
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="update-text">${update.text}</div>
                        <div class="update-time">${formatTime(update.timestamp)}</div>
                    </div>
                `;
                updatesTimeline.appendChild(updateElement);
            });
        });

    // 추가 요청 로드
    db.collection('serviceRequests').doc(serviceId)
        .collection('additionalRequests')
        .orderBy('createdAt', 'desc')
        .get()
        .then((snapshot) => {
            const requestsList = document.querySelector('.requests-list');
            requestsList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const request = doc.data();
                const requestElement = document.createElement('div');
                requestElement.className = 'request-item';
                requestElement.innerHTML = `
                    <div class="request-title">${request.title}</div>
                    <div class="request-description">${request.description}</div>
                    <div class="request-status ${request.status}">${getStatusText(request.status)}</div>
                    <div class="request-date">${formatDate(request.createdAt)}</div>
                `;
                requestsList.appendChild(requestElement);
            });
        });
}

// 메시지 전송 함수
function sendMessage(serviceId, content) {
    if (!content.trim()) return;

    db.collection('serviceRequests').doc(serviceId)
        .collection('messages')
        .add({
            content: content,
            sender: auth.currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .catch((error) => {
            console.error('메시지 전송 오류:', error);
            alert('메시지 전송에 실패했습니다.');
        });
}

// 새 견적 요청 함수
function requestNewEstimate(serviceId) {
    const amount = prompt('추가 견적 금액을 입력하세요:');
    if (!amount) return;

    const description = prompt('견적 설명을 입력하세요:');
    if (!description) return;

    db.collection('serviceRequests').doc(serviceId)
        .collection('estimates')
        .add({
            amount: parseFloat(amount),
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        })
        .catch((error) => {
            console.error('견적 요청 오류:', error);
            alert('견적 요청에 실패했습니다.');
        });
}

// 새 요청 추가 함수
function addNewRequest(serviceId) {
    const title = prompt('요청 제목을 입력하세요:');
    if (!title) return;

    const description = prompt('요청 내용을 입력하세요:');
    if (!description) return;

    db.collection('serviceRequests').doc(serviceId)
        .collection('additionalRequests')
        .add({
            title: title,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        })
        .catch((error) => {
            console.error('요청 추가 오류:', error);
            alert('요청 추가에 실패했습니다.');
        });
}

// 탭 전환 함수
function switchTab(tabId) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.tab === tabId) {
            button.classList.add('active');
        }
    });

    tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === tabId) {
            pane.classList.add('active');
        }
    });
}

// 시간 포맷팅 함수
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 서비스 요청 아이템 생성
function createServiceRequestItem(requestId, request) {
  const item = document.createElement('div');
  item.className = 'service-request-item';
  item.dataset.requestId = requestId;
  
  item.innerHTML = `
    <div class="status-badge status-${request.status}">${getStatusText(request.status)}</div>
    <h4>${request.serviceType}</h4>
    <p>위치: ${request.address || '미지정'}</p>
    <p>면적: ${request.area}㎡</p>
    <p>요청일: ${request.createdAt ? formatDate(request.createdAt.toDate()) : '미지정'}</p>
    <div class="request-actions">
      <button class="btn btn-primary" onclick="showRequestDetails('${requestId}')">상세보기</button>
      ${request.status === 'pending' ? `
        <button class="btn btn-danger" onclick="cancelRequest('${requestId}')">취소</button>
      ` : ''}
    </div>
  `;
  
  return item;
}

// 서비스 요청 상세보기
function showRequestDetails(requestId) {
  // 상세보기 모달 표시 로직
  console.log('상세보기:', requestId);
}

// 서비스 요청 취소
async function cancelRequest(requestId) {
  if (!confirm('정말로 이 서비스 요청을 취소하시겠습니까?')) {
    return;
  }
  
  try {
    const requestRef = db.collection('serviceRequests').doc(requestId);
    await requestRef.update({
      status: 'cancelled',
      cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    updateServiceRequestStatus(requestId, 'cancelled');
    showFeedbackModal('서비스 요청이 취소되었습니다.');
  } catch (error) {
    console.error('서비스 요청 취소 오류:', error);
    showFeedbackModal('서비스 요청 취소 중 오류가 발생했습니다.', 'error');
  }
}

// 작업자 소통 기능 초기화
function initializeWorkerCommunication() {
  // 탭 전환 기능
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      
      // 활성 탭 변경
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // 탭 내용 표시
      tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // 채팅 기능 초기화
  initializeChat();
  
  // 추가 견적 기능 초기화
  initializeEstimates();
  
  // 작업 현황 기능 초기화
  initializeUpdates();
  
  // 추가 요청 기능 초기화
  initializeRequests();
}

// 채팅 기능
function initializeChat() {
  const chatMessages = document.getElementById('chat-messages');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-message');
  
  // 실시간 채팅 리스너 설정
  const chatRef = collection(db, 'chats');
  const q = query(chatRef, where('requestId', '==', currentRequestId));
  
  onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = '';
    snapshot.forEach(doc => {
      const message = doc.data();
      const messageElement = createChatMessage(message);
      chatMessages.appendChild(messageElement);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
  
  // 메시지 전송
  sendButton.addEventListener('click', async () => {
    const message = messageInput.value.trim();
    if (!message) return;
    
    try {
      await addDoc(collection(db, 'chats'), {
        requestId: currentRequestId,
        senderId: auth.currentUser.uid,
        message: message,
        timestamp: serverTimestamp()
      });
      
      messageInput.value = '';
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      showFeedbackModal('메시지 전송에 실패했습니다.', 'error');
    }
  });
}

// 채팅 메시지 생성
function createChatMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${message.senderId === auth.currentUser.uid ? 'sent' : 'received'}`;
  messageElement.textContent = message.message;
  return messageElement;
}

// 추가 견적 기능
function initializeEstimates() {
  const estimatesList = document.getElementById('estimates-list');
  
  // 실시간 견적 리스너 설정
  const estimatesRef = collection(db, 'additionalEstimates');
  const q = query(estimatesRef, where('requestId', '==', currentRequestId));
  
  onSnapshot(q, (snapshot) => {
    estimatesList.innerHTML = '';
    snapshot.forEach(doc => {
      const estimate = doc.data();
      const estimateElement = createEstimateItem(doc.id, estimate);
      estimatesList.appendChild(estimateElement);
    });
  });
}

// 견적 아이템 생성
function createEstimateItem(estimateId, estimate) {
  const item = document.createElement('div');
  item.className = 'estimate-item';
  
  item.innerHTML = `
    <h4>추가 견적 요청</h4>
    <p>금액: ${estimate.amount.toLocaleString()}원</p>
    <p>사유: ${estimate.reason}</p>
    <div class="estimate-actions">
      <button class="btn btn-success" onclick="approveEstimate('${estimateId}')">승인</button>
      <button class="btn btn-danger" onclick="rejectEstimate('${estimateId}')">거절</button>
    </div>
  `;
  
  return item;
}

// 견적 승인
async function approveEstimate(estimateId) {
  try {
    const estimateRef = doc(db, 'additionalEstimates', estimateId);
    await updateDoc(estimateRef, {
      status: 'approved',
      approvedAt: serverTimestamp()
    });
    showFeedbackModal('추가 견적이 승인되었습니다.');
  } catch (error) {
    console.error('견적 승인 오류:', error);
    showFeedbackModal('견적 승인에 실패했습니다.', 'error');
  }
}

// 견적 거절
async function rejectEstimate(estimateId) {
  try {
    const estimateRef = doc(db, 'additionalEstimates', estimateId);
    await updateDoc(estimateRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp()
    });
    showFeedbackModal('추가 견적이 거절되었습니다.');
  } catch (error) {
    console.error('견적 거절 오류:', error);
    showFeedbackModal('견적 거절에 실패했습니다.', 'error');
  }
}

// 작업 현황 기능
function initializeUpdates() {
  const updatesList = document.getElementById('updates-list');
  
  // 실시간 업데이트 리스너 설정
  const updatesRef = collection(db, 'workUpdates');
  const q = query(updatesRef, where('requestId', '==', currentRequestId));
  
  onSnapshot(q, (snapshot) => {
    updatesList.innerHTML = '';
    snapshot.forEach(doc => {
      const update = doc.data();
      const updateElement = createUpdateItem(update);
      updatesList.appendChild(updateElement);
    });
  });
}

// 업데이트 아이템 생성
function createUpdateItem(update) {
  const item = document.createElement('div');
  item.className = 'update-item';
  
  const time = update.timestamp.toDate().toLocaleString('ko-KR');
  
  item.innerHTML = `
    <div class="update-time">${time}</div>
    <div class="update-content">${update.content}</div>
  `;
  
  return item;
}

// 추가 요청 기능
function initializeRequests() {
  const requestsList = document.getElementById('requests-list');
  const newRequestBtn = document.getElementById('new-request-btn');
  
  // 실시간 요청 리스너 설정
  const requestsRef = collection(db, 'additionalRequests');
  const q = query(requestsRef, where('requestId', '==', currentRequestId));
  
  onSnapshot(q, (snapshot) => {
    requestsList.innerHTML = '';
    snapshot.forEach(doc => {
      const request = doc.data();
      const requestElement = createRequestItem(doc.id, request);
      requestsList.appendChild(requestElement);
    });
  });
  
  // 새 요청 버튼 이벤트
  newRequestBtn.addEventListener('click', () => {
    showNewRequestModal();
  });
}

// 요청 아이템 생성
function createRequestItem(requestId, request) {
  const item = document.createElement('div');
  item.className = 'request-item';
  
  item.innerHTML = `
    <h4>${request.title}</h4>
    <p>${request.description}</p>
    <div class="request-status">상태: ${request.status}</div>
  `;
  
  return item;
}

// 새 요청 모달 표시
function showNewRequestModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn">×</span>
      <h3>새 요청 작성</h3>
      <form id="new-request-form">
        <div class="form-group">
          <label for="request-title">제목</label>
          <input type="text" id="request-title" required>
        </div>
        <div class="form-group">
          <label for="request-description">설명</label>
          <textarea id="request-description" required></textarea>
        </div>
        <button type="submit">요청 보내기</button>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 모달 닫기
  modal.querySelector('.close-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // 폼 제출
  modal.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('request-title').value;
    const description = document.getElementById('request-description').value;
    
    try {
      await addDoc(collection(db, 'additionalRequests'), {
        requestId: currentRequestId,
        title: title,
        description: description,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      modal.remove();
      showFeedbackModal('요청이 전송되었습니다.');
    } catch (error) {
      console.error('요청 전송 오류:', error);
      showFeedbackModal('요청 전송에 실패했습니다.', 'error');
    }
  });
}

// 테스트 함수
async function testWorkerCommunication() {
  console.log('작업자 소통 기능 테스트 시작...');
  
  try {
    // 1. 채팅 기능 테스트
    await testChatFunctionality();
    
    // 2. 견적 기능 테스트
    await testEstimateFunctionality();
    
    // 3. 작업 현황 테스트
    await testWorkUpdates();
    
    // 4. 추가 요청 테스트
    await testAdditionalRequests();
    
    console.log('모든 테스트 완료');
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  }
}

// 채팅 기능 테스트
async function testChatFunctionality() {
  console.log('채팅 기능 테스트 시작');
  
  try {
    // 메시지 전송 테스트
    const testMessage = '테스트 메시지 ' + new Date().toISOString();
    await addDoc(collection(db, 'chats'), {
      requestId: currentRequestId,
      senderId: auth.currentUser.uid,
      message: testMessage,
      timestamp: serverTimestamp()
    });
    
    // 메시지 수신 테스트
    const chatRef = collection(db, 'chats');
    const q = query(chatRef, where('requestId', '==', currentRequestId));
    const snapshot = await getDocs(q);
    
    const messageExists = snapshot.docs.some(doc => 
      doc.data().message === testMessage
    );
    
    if (messageExists) {
      console.log('채팅 기능 테스트 성공');
    } else {
      throw new Error('메시지가 저장되지 않았습니다.');
    }
  } catch (error) {
    console.error('채팅 기능 테스트 실패:', error);
    throw error;
  }
}

// 견적 기능 테스트
async function testEstimateFunctionality() {
  console.log('견적 기능 테스트 시작');
  
  try {
    // 견적 생성 테스트
    const testEstimate = {
      requestId: currentRequestId,
      amount: 10000,
      reason: '테스트 견적',
      status: 'pending',
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'additionalEstimates'), testEstimate);
    
    // 견적 승인 테스트
    await updateDoc(doc(db, 'additionalEstimates', docRef.id), {
      status: 'approved',
      approvedAt: serverTimestamp()
    });
    
    // 견적 상태 확인
    const estimateDoc = await getDoc(doc(db, 'additionalEstimates', docRef.id));
    if (estimateDoc.data().status === 'approved') {
      console.log('견적 기능 테스트 성공');
    } else {
      throw new Error('견적 상태가 올바르게 업데이트되지 않았습니다.');
    }
  } catch (error) {
    console.error('견적 기능 테스트 실패:', error);
    throw error;
  }
}

// 작업 현황 테스트
async function testWorkUpdates() {
  console.log('작업 현황 테스트 시작');
  
  try {
    // 업데이트 생성 테스트
    const testUpdate = {
      requestId: currentRequestId,
      content: '테스트 업데이트 ' + new Date().toISOString(),
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'workUpdates'), testUpdate);
    
    // 업데이트 확인
    const updateDoc = await getDoc(doc(db, 'workUpdates', docRef.id));
    if (updateDoc.exists()) {
      console.log('작업 현황 테스트 성공');
    } else {
      throw new Error('작업 현황이 저장되지 않았습니다.');
    }
  } catch (error) {
    console.error('작업 현황 테스트 실패:', error);
    throw error;
  }
}

// 추가 요청 테스트
async function testAdditionalRequests() {
  console.log('추가 요청 테스트 시작');
  
  try {
    // 요청 생성 테스트
    const testRequest = {
      requestId: currentRequestId,
      title: '테스트 요청',
      description: '테스트 요청 설명',
      status: 'pending',
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'additionalRequests'), testRequest);
    
    // 요청 상태 확인
    const requestDoc = await getDoc(doc(db, 'additionalRequests', docRef.id));
    if (requestDoc.exists()) {
      console.log('추가 요청 테스트 성공');
    } else {
      throw new Error('추가 요청이 저장되지 않았습니다.');
    }
  } catch (error) {
    console.error('추가 요청 테스트 실패:', error);
    throw error;
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadServiceRequests();
  initializeWorkerCommunication();
  
  // 상태 변경 이벤트 리스너 설정
  const statusHistoryList = document.getElementById('status-history-list');
  if (statusHistoryList) {
    statusHistoryList.innerHTML = '<p>상태 변경 이력을 불러오는 중...</p>';
  }
  
  // 테스트 실행 버튼 추가
  const testButton = document.createElement('button');
  testButton.textContent = '테스트 실행';
  testButton.onclick = testWorkerCommunication;
  document.querySelector('.worker-communication').appendChild(testButton);
});

function renderServiceRequest(data) {
  return `
    <tr>
      <td>${data.serviceType || '서비스 유형 없음'}</td>
      <td>
        <span class="badge badge-${getStatusBadgeClass(data.status)}">
          ${getStatusText(data.status)}
        </span>
      </td>
      <td>
        <div class="location-info">
          <div class="address">${data.address || '주소 없음'}</div>
          <button class="btn btn-link btn-sm view-map" 
                  data-lat="${data.location?.latitude || ''}" 
                  data-lng="${data.location?.longitude || ''}"
                  data-address="${data.address || ''}">
            <i class="fas fa-map-marker-alt"></i> 지도보기
          </button>
        </div>
      </td>
      <td>${formatCurrency(data.expectedCost)}</td>
      <td>${formatCurrency(data.finalEstimate)}</td>
      <td>${formatDate(data.createdAt)}</td>
      <td>${formatDate(data.deadline)}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm manage-service" data-id="${data.id}">
            <i class="fas fa-cog"></i> 관리
          </button>
          <button class="btn btn-outline-primary btn-sm reapply-service" data-id="${data.id}">
            <i class="fas fa-redo"></i> 재신청
          </button>
        </div>
      </td>
    </tr>
  `;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending': return 'warning';
    case 'in_progress': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    default: return 'secondary';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'pending': return '대기중';
    case 'in_progress': return '진행중';
    case 'completed': return '완료';
    case 'cancelled': return '취소';
    default: return '알 수 없음';
  }
}

function formatCurrency(amount) {
  if (!amount) return '-';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date.toDate()).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 지도 보기 기능
document.addEventListener('click', function(e) {
  if (e.target.closest('.view-map')) {
    const button = e.target.closest('.view-map');
    const lat = button.dataset.lat;
    const lng = button.dataset.lng;
    const address = button.dataset.address;
    
    if (lat && lng) {
      // 지도 모달 표시
      showMapModal(lat, lng, address);
    }
  }
});

function showMapModal(lat, lng, address) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">서비스 위치</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="map-container" style="height: 400px;">
            <div id="serviceMap" style="height: 100%;"></div>
          </div>
          <div class="address-info mt-3">
            <p><strong>주소:</strong> ${address}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  $(modal).modal('show');
  
  // 지도 초기화
  initMap(lat, lng, address);
  
  // 모달 닫힐 때 정리
  $(modal).on('hidden.bs.modal', function() {
    document.body.removeChild(modal);
  });
}

function initMap(lat, lng, address) {
  // 카카오맵 API를 사용하여 지도 표시
  const container = document.getElementById('serviceMap');
  const options = {
    center: new kakao.maps.LatLng(lat, lng),
    level: 3
  };
  
  const map = new kakao.maps.Map(container, options);
  
  // 마커 표시
  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng)
  });
  marker.setMap(map);
  
  // 인포윈도우 표시
  const infowindow = new kakao.maps.InfoWindow({
    content: `<div style="padding:5px;">${address}</div>`
  });
  infowindow.open(map, marker);
}

// 재신청 기능
document.addEventListener('click', function(e) {
  if (e.target.closest('.reapply-service')) {
    const button = e.target.closest('.reapply-service');
    const serviceId = button.dataset.id;
    
    if (confirm('이 서비스를 다시 신청하시겠습니까?')) {
      reapplyService(serviceId);
    }
  }
});

async function reapplyService(serviceId) {
  try {
    const serviceRef = db.collection('serviceRequests').doc(serviceId);
    const serviceDoc = await serviceRef.get();
    
    if (serviceDoc.exists) {
      const serviceData = serviceDoc.data();
      
      // 새로운 서비스 요청 생성
      const newServiceRef = await db.collection('serviceRequests').add({
        ...serviceData,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        previousRequestId: serviceId
      });
      
      alert('서비스가 재신청되었습니다.');
      loadServiceRequests(); // 목록 새로고침
    }
  } catch (error) {
    console.error('재신청 오류:', error);
    alert('서비스 재신청 중 오류가 발생했습니다.');
  }
}

// 프로필 이미지 업로드 기능
const profileUploadInput = document.getElementById('profile-upload');
const profileImage = document.getElementById('profile-image');

if (profileUploadInput && profileImage) {
  profileUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 타입 검증
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      showFeedbackModal('이미지 파일만 업로드 가능합니다 (JPEG, PNG, GIF, WEBP).', 'error');
      return;
    }

    // 파일 크기 검증 (5MB 제한)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showFeedbackModal('파일 크기가 너무 큽니다. 5MB 이하의 이미지를 선택해주세요.', 'error');
      return;
    }

    try {
      const loadingToast = showToast('프로필 이미지 업로드 중...', 'info');
      
      // Firebase Storage에 이미지 업로드
      const userId = auth.currentUser.uid;
      const storageRef = ref(storage, `profile_images/${userId}`);
      await uploadBytes(storageRef, file);
      
      // 업로드된 이미지 URL 가져오기
      const downloadURL = await getDownloadURL(storageRef);
      
      // Firestore 사용자 문서에 이미지 URL 저장
      await updateDoc(doc(db, 'users', userId), {
        profileImageURL: downloadURL,
        updatedAt: serverTimestamp()
      });
      
      // 이미지 표시 업데이트
      profileImage.src = downloadURL;
      
      hideToast(loadingToast);
      showToast('프로필 이미지가 업데이트되었습니다.', 'success');
    } catch (error) {
      console.error('프로필 이미지 업로드 오류:', error);
      showFeedbackModal('이미지 업로드 중 오류가 발생했습니다.', 'error');
    }
  });
}

// 비밀번호 변경 기능
const changePasswordBtn = document.querySelector('.change-password-btn');
const passwordChangeModal = document.querySelector('.password-change-modal');
const passwordForm = document.querySelector('.password-form');
const closePasswordModal = document.querySelector('.close-password-modal');

if (changePasswordBtn && passwordChangeModal) {
  changePasswordBtn.addEventListener('click', () => {
    passwordChangeModal.classList.add('active');
  });

  closePasswordModal.addEventListener('click', () => {
    passwordChangeModal.classList.remove('active');
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      showFeedbackModal('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showFeedbackModal('비밀번호는 6자 이상이어야 합니다.', 'error');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // 현재 비밀번호로 재인증
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 비밀번호 변경
      await updatePassword(user, newPassword);

      showFeedbackModal('비밀번호가 성공적으로 변경되었습니다.', 'success');
      passwordForm.reset();
      passwordChangeModal.classList.remove('active');
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      showFeedbackModal('비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.', 'error');
    }
  });
}

// 사용자 정보 로드
async function loadUserProfile() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('사용자가 로그인되어 있지 않습니다.');
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // 사용자 정보 표시
      document.getElementById('user-name').textContent = userData.name || '-';
      document.getElementById('user-email').textContent = userData.email || '-';
      document.getElementById('user-phone').textContent = userData.phone || '-';
      document.getElementById('user-join-date').textContent = userData.createdAt 
        ? userData.createdAt.toDate().toLocaleDateString() 
        : '-';
      
      // 프로필 이미지 표시
      if (userData.profileImageURL) {
        profileImage.src = userData.profileImageURL;
      }
    }
  } catch (error) {
    console.error('사용자 정보 로드 오류:', error);
    showFeedbackModal('사용자 정보를 불러오는 중 오류가 발생했습니다.', 'error');
  }
}

// 페이지 로드 시 사용자 정보 로드
document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
});

// 지도 표시 함수
function showMap(latitude, longitude, address) {
    const mapModal = document.getElementById('mapModal');
    const mapAddress = document.getElementById('mapAddress');
    
    if (!mapModal || !mapAddress) return;
    
    // 주소 표시
    mapAddress.textContent = address;
    
    // 지도 초기화
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(latitude, longitude),
        level: 3
    };
    
    const map = new kakao.maps.Map(container, options);
    
    // 마커 생성
    const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(latitude, longitude)
    });
    marker.setMap(map);
    
    // 인포윈도우 생성
    const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px;">${address}</div>`
    });
    infowindow.open(map, marker);
    
    // 모달 표시
    mapModal.style.display = 'block';
    
    // 닫기 버튼 이벤트
    const closeButton = mapModal.querySelector('.close-modal');
    closeButton.onclick = () => {
        mapModal.style.display = 'none';
    };
    
    // 모달 외부 클릭 시 닫기
    window.onclick = (event) => {
        if (event.target === mapModal) {
            mapModal.style.display = 'none';
        }
    };
}

// 주소 검색 함수
function searchAddress(address) {
    const geocoder = new kakao.maps.services.Geocoder();
    
    geocoder.addressSearch(address, function(result, status) {
        if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
            showMap(coords.getLat(), coords.getLng(), address);
        } else {
            alert('주소를 찾을 수 없습니다.');
        }
    });
} 