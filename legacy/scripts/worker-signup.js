// 작업자 가입 처리
async function submitWorkerSignup(formData) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const db = firebase.firestore();
    
    // 사용자 역할을 worker로 업데이트
    await db.collection('users').doc(user.uid).update({
      role: 'worker',
      workerInfo: {
        assignedAreas: formData.assignedAreas,
        status: 'pending',
        portfolio: formData.portfolio || [],
        rating: 0,
        totalJobs: 0
      }
    });

    // 관리자에게 알림 전송
    await sendAdminNotification('새로운 작업자 가입 신청', {
      userId: user.uid,
      name: formData.name,
      assignedAreas: formData.assignedAreas
    });

    return true;
  } catch (error) {
    console.error('작업자 가입 오류:', error);
    throw error;
  }
}

// 카카오맵 API를 사용한 지역 선택
function initializeMap() {
  const mapContainer = document.getElementById('map');
  const mapOption = {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심
    level: 3
  };
  
  const map = new kakao.maps.Map(mapContainer, mapOption);
  const markers = [];
  
  // 지역 선택 이벤트
  kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
    const latlng = mouseEvent.latLng;
    
    // 마커 생성
    const marker = new kakao.maps.Marker({
      position: latlng
    });
    marker.setMap(map);
    markers.push(marker);
    
    // 주소 검색
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function(result, status) {
      if (status === kakao.maps.services.Status.OK) {
        const address = result[0].address.address_name;
        updateSelectedAreas(address);
      }
    });
  });
  
  return { map, markers };
}

// 선택된 지역 업데이트
function updateSelectedAreas(address) {
  const selectedAreas = document.getElementById('selected-areas');
  const areaItem = document.createElement('div');
  areaItem.className = 'selected-area';
  areaItem.innerHTML = `
    <span>${address}</span>
    <button onclick="removeArea(this)">삭제</button>
  `;
  selectedAreas.appendChild(areaItem);
}

// 지역 삭제
function removeArea(button) {
  button.parentElement.remove();
} 