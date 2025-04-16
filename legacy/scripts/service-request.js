async function submitServiceRequest(formData) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const db = firebase.firestore();
    const serviceRequestRef = await db.collection('serviceRequests').add({
      userId: user.uid,
      customerId: user.uid,
      serviceType: formData.serviceType,
      address: {
        fullAddress: formData.address,
        lat: formData.lat,
        lng: formData.lng,
        markerPosition: {
          lat: formData.markerLat,
          lng: formData.markerLng
        }
      },
      workDate: formData.workDate,
      status: '접수완료',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 관리자에게 알림 전송
    await sendAdminNotification('새로운 서비스 요청', {
      requestId: serviceRequestRef.id,
      customerId: user.uid,
      address: formData.address
    });

    return serviceRequestRef.id;
  } catch (error) {
    console.error('서비스 요청 제출 오류:', error);
    throw error;
  }
}

// 카카오맵 API 초기화
function initializeMap() {
  const mapContainer = document.getElementById('map');
  const mapOption = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 3
  };
  
  const map = new kakao.maps.Map(mapContainer, mapOption);
  const marker = new kakao.maps.Marker();
  marker.setMap(map);
  
  // 주소 검색
  const geocoder = new kakao.maps.services.Geocoder();
  
  // 지도 클릭 이벤트
  kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
    const latlng = mouseEvent.latLng;
    marker.setPosition(latlng);
    
    // 주소 검색
    geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function(result, status) {
      if (status === kakao.maps.services.Status.OK) {
        const address = result[0].address.address_name;
        document.getElementById('address').value = address;
        document.getElementById('lat').value = latlng.getLat();
        document.getElementById('lng').value = latlng.getLng();
        document.getElementById('markerLat').value = latlng.getLat();
        document.getElementById('markerLng').value = latlng.getLng();
      }
    });
  });
  
  return { map, marker };
}

// 주소 검색
function searchAddress() {
  const address = document.getElementById('address').value;
  if (!address) return;
  
  const geocoder = new kakao.maps.services.Geocoder();
  geocoder.addressSearch(address, function(result, status) {
    if (status === kakao.maps.services.Status.OK) {
      const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
      map.setCenter(coords);
      marker.setPosition(coords);
      
      document.getElementById('lat').value = result[0].y;
      document.getElementById('lng').value = result[0].x;
      document.getElementById('markerLat').value = result[0].y;
      document.getElementById('markerLng').value = result[0].x;
    }
  });
} 