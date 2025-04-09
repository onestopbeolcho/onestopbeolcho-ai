// 상태 변경 이력 불러오기
async function loadStatusHistory(serviceRequestId) {
  try {
    const db = firebase.firestore();
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
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const userDoc = await firebase.firestore()
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

// 서비스 신청 내역 불러오기
async function loadServiceRequests() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const db = firebase.firestore();
    const serviceRequestsQuery = db.collection('serviceRequests')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc');

    const snapshot = await serviceRequestsQuery.get();
    const serviceRequestsList = document.getElementById('service-requests-list');
    serviceRequestsList.innerHTML = '';

    if (snapshot.empty) {
      serviceRequestsList.innerHTML = '<p>서비스 신청 내역이 없습니다.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const request = doc.data();
      const card = document.createElement('div');
      card.className = 'request-card';
      card.innerHTML = `
        <div class="fields">
          <div class="field"><label>서비스 유형</label><span>${request.serviceType}</span></div>
          <div class="field"><label>주소</label><span>${request.address}</span></div>
          <div class="field"><label>희망 작업 날짜</label><span>${request.workDate}</span></div>
          <div class="field"><label>상태</label><span>${request.status}</span></div>
          <div class="field"><label>신청일</label><span>${formatDate(request.createdAt.toDate())}</span></div>
        </div>
        <div class="action-buttons">
          <button class="view-details-btn" data-id="${doc.id}">상세보기</button>
          <button class="update-status-btn" data-id="${doc.id}">상태 변경</button>
        </div>
      `;
      serviceRequestsList.appendChild(card);

      // 상태 변경 버튼 이벤트 리스너
      const updateStatusBtn = card.querySelector('.update-status-btn');
      updateStatusBtn.addEventListener('click', async () => {
        const newStatus = prompt('새로운 상태를 입력하세요:');
        if (newStatus) {
          try {
            await updateServiceRequestStatus(doc.id, newStatus);
            showFeedbackModal('상태가 성공적으로 변경되었습니다.', 'success');
          } catch (error) {
            showFeedbackModal('상태 변경에 실패했습니다: ' + error.message, 'error');
          }
        }
      });
    });
  } catch (error) {
    console.error('서비스 신청 내역 불러오기 실패:', error);
    const serviceRequestsList = document.getElementById('service-requests-list');
    serviceRequestsList.innerHTML = '<p>서비스 신청 내역을 불러오는 중 오류가 발생했습니다.</p>';
  }
}

// 페이지 로드 시 서비스 신청 내역 불러오기
document.addEventListener('DOMContentLoaded', () => {
  loadServiceRequests();
}); 