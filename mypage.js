// /onestopbeolcho/mypage.js
function initializeMyPageWhenFirebaseReady(attempt = 0, maxAttempts = 100) {
    if (attempt >= maxAttempts) {
      console.error('Firebase SDK 로드 실패');
      document.getElementById('request-list').innerHTML = '<p>데이터를 불러올 수 없습니다.</p>';
      return;
    }
  
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
      setTimeout(() => initializeMyPageWhenFirebaseReady(attempt + 1, maxAttempts), 100);
      return;
    }
  
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;
  
    if (!user) {
      window.location.replace('/login.html');
      return;
    }
  
    const requestList = document.getElementById('request-list');
    const presetList = document.getElementById('preset-list');
    const addPresetBtn = document.getElementById('add-preset-btn');
  
    // 신청 내역 조회
    async function loadRequests() {
      requestList.innerHTML = '<p>로딩 중...</p>';
      try {
        const snapshot = await db.collection('serviceRequests')
          .where('userId', '==', user.uid)
          .orderBy('createdAt', 'desc')
          .get();
  
        if (snapshot.empty) {
          requestList.innerHTML = '<p>신청 내역이 없습니다.</p>';
          return;
        }
  
        requestList.innerHTML = '';
        snapshot.forEach(doc => {
          const data = doc.data();
          const statusText = {
            'pending': '접수완료',
            'confirmed': '작업확인',
            'in-progress': '작업중',
            'completed': '작업완료'
          }[data.status] || '알 수 없음';
  
          const li = document.createElement('li');
          li.innerHTML = `
            <div>
              <strong>서비스: ${data.serviceType}</strong><br>
              주소: ${data.address}<br>
              상태: ${statusText}<br>
              예상 비용: ${data.estimatedCost.toLocaleString('ko-KR')}원<br>
              신청일: ${data.createdAt.toDate().toLocaleString('ko-KR')}
            </div>
            <button class="re-request-btn" data-id="${doc.id}">재신청</button>
          `;
          requestList.appendChild(li);
        });
  
        // 재신청 버튼 이벤트
        document.querySelectorAll('.re-request-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const docId = e.target.getAttribute('data-id');
            const doc = await db.collection('serviceRequests').doc(docId).get();
            const originalData = doc.data();
  
            const newRequest = {
              ...originalData,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              status: 'pending',
              workerAssigned: '',
              fileUrls: [] // 기존 파일은 제외
            };
            delete newRequest.createdAt; // 새 타임스탬프로 대체
  
            try {
              await db.collection('serviceRequests').add(newRequest);
              alert('재신청이 완료되었습니다!');
              loadRequests(); // 리스트 갱신
            } catch (error) {
              console.error('재신청 오류:', error);
              alert('재신청 실패: ' + error.message);
            }
          });
        });
      } catch (error) {
        console.error('내역 조회 오류:', error);
        requestList.innerHTML = '<p>오류 발생: ' + error.message + '</p>';
      }
    }
  
    // 사전 등록된 위치/묘지 정보 조회
    async function loadPresets() {
      presetList.innerHTML = '<p>로딩 중...</p>';
      try {
        const snapshot = await db.collection('presets')
          .where('userId', '==', user.uid)
          .get();
  
        presetList.innerHTML = snapshot.empty ? '<p>등록된 정보가 없습니다.</p>' : '';
        snapshot.forEach(doc => {
          const data = doc.data();
          const li = document.createElement('li');
          li.innerHTML = `
            <div>
              <strong>이름: ${data.name}</strong><br>
              주소: ${data.address}<br>
              위도: ${data.latitude}, 경도: ${data.longitude}<br>
              묘지 정보: ${data.graveInfo || '없음'}
            </div>
            <button class="use-preset-btn" data-id="${doc.id}">사용</button>
          `;
          presetList.appendChild(li);
        });
  
        // 프리셋 사용 버튼 이벤트
        document.querySelectorAll('.use-preset-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const docId = e.target.getAttribute('data-id');
            window.location.href = `/request.html?preset=${docId}`;
          });
        });
      } catch (error) {
        console.error('프리셋 조회 오류:', error);
        presetList.innerHTML = '<p>오류 발생: ' + error.message + '</p>';
      }
    }
  
    // 프리셋 추가
    addPresetBtn.addEventListener('click', async () => {
      const name = prompt('프리셋 이름 입력:');
      const address = prompt('주소 입력:');
      const graveInfo = prompt('묘지 정보 입력 (선택):') || '';
      const latitude = parseFloat(prompt('위도 입력:'));
      const longitude = parseFloat(prompt('경도 입력:'));
  
      if (!name || !address || isNaN(latitude) || isNaN(longitude)) {
        alert('모든 필수 정보를 입력해주세요.');
        return;
      }
  
      try {
        await db.collection('presets').add({
          userId: user.uid,
          name,
          address,
          latitude,
          longitude,
          graveInfo,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('프리셋이 등록되었습니다!');
        loadPresets();
      } catch (error) {
        console.error('프리셋 등록 오류:', error);
        alert('등록 실패: ' + error.message);
      }
    });
  
    loadRequests();
    loadPresets();
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    initializeMyPageWhenFirebaseReady();
  });