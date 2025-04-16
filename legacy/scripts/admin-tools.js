// 관리자용 계정 및 데이터 초기화 스크립트
async function resetDatabase() {
  try {
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    // 1. 모든 서비스 요청 삭제
    const serviceRequestsSnapshot = await db.collection('serviceRequests').get();
    const batch1 = db.batch();
    serviceRequestsSnapshot.forEach(doc => {
      batch1.delete(doc.ref);
    });
    await batch1.commit();
    console.log('서비스 요청 데이터 삭제 완료');

    // 2. 모든 사용자 데이터 삭제
    const usersSnapshot = await db.collection('users').get();
    const batch2 = db.batch();
    usersSnapshot.forEach(doc => {
      batch2.delete(doc.ref);
    });
    await batch2.commit();
    console.log('사용자 데이터 삭제 완료');

    // 3. 모든 인증 계정 삭제
    const userRecords = await auth.listUsers();
    const deletePromises = userRecords.users.map(user => 
      auth.deleteUser(user.uid)
    );
    await Promise.all(deletePromises);
    console.log('인증 계정 삭제 완료');

    alert('데이터베이스 초기화가 완료되었습니다.');
  } catch (error) {
    console.error('데이터베이스 초기화 중 오류 발생:', error);
    alert('초기화 중 오류가 발생했습니다: ' + error.message);
  }
}

// 관리자 페이지에서만 실행되도록 체크
if (window.location.pathname.includes('admin')) {
  document.addEventListener('DOMContentLoaded', () => {
    const resetButton = document.createElement('button');
    resetButton.textContent = '데이터베이스 초기화';
    resetButton.className = 'btn btn-danger';
    resetButton.onclick = () => {
      if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        resetDatabase();
      }
    };
    document.querySelector('.admin-tools').appendChild(resetButton);
  });
} 