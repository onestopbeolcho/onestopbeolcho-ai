import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM 요소
const profileImage = document.getElementById('profile-image');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const userPhone = document.getElementById('user-phone');
const userJoinDate = document.getElementById('user-join-date');
const serviceRequestsList = document.getElementById('service-requests');
const profileUpload = document.getElementById('profile-upload');
const changePasswordBtn = document.querySelector('.change-password-btn');
const passwordModal = document.querySelector('.password-change-modal');
const closePasswordModal = document.querySelector('.close-password-modal');
const passwordForm = document.querySelector('.password-form');

// 사용자 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // 로그인되지 않은 경우 로그인 페이지로 리디렉션
        window.location.href = 'login.html';
        return;
    }

    // 사용자 정보 로드
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // 프로필 이미지 설정
            if (userData.photoURL) {
                profileImage.src = userData.photoURL;
            }
            
            // 사용자 정보 표시
            userName.textContent = userData.displayName || '사용자';
            userEmail.textContent = user.email;
            userPhone.textContent = userData.phone || '전화번호 없음';
            userJoinDate.textContent = userData.createdAt ? 
                new Date(userData.createdAt.toDate()).toLocaleDateString() : 
                '가입일 정보 없음';
        }

        // 서비스 요청 목록 로드
        await loadServiceRequests(user.uid);
    } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
        alert('사용자 정보를 불러오는 중 오류가 발생했습니다.');
    }
});

// 서비스 요청 목록 로드
async function loadServiceRequests(userId) {
    try {
        console.log('서비스 요청 조회 시작 - 사용자 ID:', userId);

        // 사용자의 서비스 요청 조회
        const serviceRequestsRef = collection(db, 'serviceRequests');
        const q = query(
            serviceRequestsRef,
            where('customerId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        console.log('조회된 서비스 요청 수:', querySnapshot.size);

        if (querySnapshot.empty) {
            console.log('서비스 요청이 없습니다.');
            serviceRequestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list"></i>
                    <h3>서비스 내역이 없습니다</h3>
                    <p>아직 서비스를 신청하지 않았습니다. 서비스를 신청하면 이곳에서 확인할 수 있습니다.</p>
                    <a href="request.html" class="btn btn-primary">서비스 신청하기</a>
                </div>
            `;
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const request = doc.data();
            const statusClass = getStatusClass(request.status);
            const date = request.createdAt ? 
                new Date(request.createdAt.toDate()).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '날짜 정보 없음';

            // 견적 정보 포맷팅
            const estimatedCost = request.estimatedCost || {};
            const totalCost = estimatedCost.totalCost || 0;
            const baseCost = estimatedCost.baseCost || 0;
            const areaExtra = estimatedCost.extraCostDetails?.areaExtra || 0;
            const graveExtra = estimatedCost.extraCostDetails?.graveExtra || 0;

            // 상세 정보 포맷팅
            const details = request.details || {};
            const areaSize = details.areaSize || '0';
            const graveCount = details.graveCount || '0';
            const graveType = getGraveTypeText(details.graveType);

            html += `
                <div class="service-request-card">
                    <div class="service-request-header">
                        <h5 class="service-request-title">${request.serviceType || '서비스 유형 없음'}</h5>
                        <span class="service-request-status ${statusClass}">${getStatusText(request.status)}</span>
                    </div>
                    <div class="service-request-details">
                        <p><i class="fas fa-user"></i> 신청자: ${request.customerName || '이름 없음'}</p>
                        <p><i class="fas fa-phone"></i> 연락처: ${request.phone || '연락처 없음'}</p>
                        <p><i class="fas fa-map-marker-alt"></i> 주소: ${request.address || '주소 없음'}</p>
                        <p><i class="fas fa-calendar"></i> 희망 작업일: ${request.workDate || '날짜 없음'}</p>
                        <div class="estimate-details">
                            <p class="estimate-title"><i class="fas fa-won-sign"></i> 견적 상세:</p>
                            <p class="estimate-item">- 기본 비용: ${baseCost.toLocaleString()}원</p>
                            ${areaExtra > 0 ? `<p class="estimate-item">- 면적 추가 비용: ${areaExtra.toLocaleString()}원</p>` : ''}
                            ${graveExtra > 0 ? `<p class="estimate-item">- 묘지 수 추가 비용: ${graveExtra.toLocaleString()}원</p>` : ''}
                            <p class="estimate-total">총 예상 금액: ${totalCost.toLocaleString()}원</p>
                        </div>
                        <div class="service-details">
                            <p class="service-title"><i class="fas fa-info-circle"></i> 서비스 상세:</p>
                            <p class="service-item">- 면적: ${areaSize}평</p>
                            <p class="service-item">- 묘지 수: ${graveCount}기</p>
                            <p class="service-item">- 묘지 유형: ${graveType}</p>
                        </div>
                        <p><i class="fas fa-clock"></i> 신청일: ${date}</p>
                    </div>
                    <div class="service-request-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewServiceDetails('${doc.id}')">
                            <i class="fas fa-eye"></i> 상세보기
                        </button>
                        ${request.status === 'pending' ? `
                            <button class="btn btn-sm btn-outline-danger" onclick="cancelServiceRequest('${doc.id}')">
                                <i class="fas fa-times"></i> 취소
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        serviceRequestsList.innerHTML = html;
    } catch (error) {
        console.error('서비스 요청 목록 로드 오류:', error);
        serviceRequestsList.innerHTML = `
            <div class="alert alert-danger">
                서비스 요청 목록을 불러오는 중 오류가 발생했습니다.
            </div>
        `;
    }
}

// 서비스 상태에 따른 클래스 반환
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'status-pending';
        case 'in_progress':
            return 'status-in-progress';
        case 'completed':
            return 'status-completed';
        case 'cancelled':
            return 'status-cancelled';
        default:
            return 'status-pending';
    }
}

// 서비스 상태 텍스트 반환
function getStatusText(status) {
    switch (status) {
        case 'pending':
            return '대기중';
        case 'in_progress':
            return '진행중';
        case 'completed':
            return '완료';
        case 'cancelled':
            return '취소';
        default:
            return '대기중';
    }
}

// 통화 포맷 함수
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// 서비스 상세 보기
function viewServiceDetails(requestId) {
    window.location.href = `service-detail.html?id=${requestId}`;
}

// 서비스 요청 취소
async function cancelServiceRequest(requestId) {
    if (!confirm('정말로 서비스 신청을 취소하시겠습니까?')) {
        return;
    }

    try {
        const requestRef = doc(db, 'serviceRequests', requestId);
        await updateDoc(requestRef, {
            status: 'cancelled',
            updatedAt: serverTimestamp()
        });

        alert('서비스 신청이 취소되었습니다.');
        loadServiceRequests(auth.currentUser.uid);
    } catch (error) {
        console.error('서비스 취소 오류:', error);
        alert('서비스 취소 중 오류가 발생했습니다.');
    }
}

// 프로필 이미지 업로드
profileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.match('image/*')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인되지 않았습니다.');

        // Storage에 이미지 업로드
        const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        
        // 이미지 URL 가져오기
        const downloadURL = await getDownloadURL(storageRef);
        
        // 프로필 이미지 업데이트
        profileImage.src = downloadURL;
        
        // Firestore 사용자 정보 업데이트
        await updateDoc(doc(db, 'users', user.uid), {
            photoURL: downloadURL,
            updatedAt: serverTimestamp()
        });

        alert('프로필 이미지가 업데이트되었습니다.');
    } catch (error) {
        console.error('이미지 업로드 오류:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
    }
});

// 비밀번호 변경 모달
changePasswordBtn.addEventListener('click', () => {
    passwordModal.style.display = 'block';
});

closePasswordModal.addEventListener('click', () => {
    passwordModal.style.display = 'none';
});

// 비밀번호 변경
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // 입력값 검증
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
    }

    if (newPassword.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인되지 않았습니다.');

        // 현재 비밀번호 확인 (재인증)
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);

        // 새 비밀번호로 업데이트
        await user.updatePassword(newPassword);

        // 폼 초기화 및 모달 닫기
        passwordForm.reset();
        passwordModal.style.display = 'none';

        alert('비밀번호가 성공적으로 변경되었습니다.');
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        
        if (error.code === 'auth/wrong-password') {
            alert('현재 비밀번호가 올바르지 않습니다.');
        } else {
            alert('비밀번호 변경 중 오류가 발생했습니다: ' + error.message);
        }
    }
});

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
async function updateServiceRequestStatus(requestId, newStatus) {
    try {
        const serviceRequestRef = doc(db, 'serviceRequests', requestId);
        const serviceRequestDoc = await getDoc(serviceRequestRef);
        
        if (!serviceRequestDoc.exists()) {
            throw new Error('서비스 요청을 찾을 수 없습니다.');
        }

        const currentData = serviceRequestDoc.data();
        const statusHistory = currentData.statusHistory || [];
        
        // 현재 상태를 히스토리에 추가
        statusHistory.push({
            status: newStatus,
            timestamp: serverTimestamp(),
            updatedBy: auth.currentUser.uid
        });

        // 상태 업데이트
        await updateDoc(serviceRequestRef, {
            status: newStatus,
            statusHistory: statusHistory,
            updatedAt: serverTimestamp()
        });

        // 서비스 요청 목록 새로고침
        await loadServiceRequests(auth.currentUser.uid);
        
        alert('서비스 요청 상태가 업데이트되었습니다.');
    } catch (error) {
        console.error('상태 업데이트 중 오류 발생:', error);
        alert('상태 업데이트 중 오류가 발생했습니다.');
    }
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
      const estimateElement = document.createElement('div');
      estimateElement.className = 'estimate-item';
      estimateElement.innerHTML = `
        <h4>추가 견적 요청</h4>
        <p>금액: ${estimate.amount.toLocaleString()}원</p>
        <p>사유: ${estimate.reason}</p>
        <div class="estimate-actions">
          <button class="btn btn-success" onclick="approveEstimate('${estimate.id}')">승인</button>
          <button class="btn btn-danger" onclick="rejectEstimate('${estimate.id}')">거절</button>
        </div>
      `;
      estimatesList.appendChild(estimateElement);
    });
  });
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
  console.log('마이페이지 초기화 시작');
  loadServiceRequests(auth.currentUser.uid);
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
      loadServiceRequests(auth.currentUser.uid); // 목록 새로고침
    }
  } catch (error) {
    console.error('재신청 오류:', error);
    alert('서비스 재신청 중 오류가 발생했습니다.');
  }
}

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

// 묘 유형 텍스트 반환
function getGraveTypeText(type) {
    switch (type) {
        case 'mound':
            return '봉분';
        case 'flat':
            return '평장';
        case 'other':
            return '기타';
        default:
            return '알 수 없음';
    }
} 