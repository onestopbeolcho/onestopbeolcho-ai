// API 키는 환경 변수에서 가져오는 것이 이상적 (예: process.env.KAKAO_MAP_API_KEY)
const API_KEY = "ef6b942fdad36e982c84eb0061d1d2ed"; // 실제로는 환경 변수로 대체

// 카카오맵 API 스크립트를 동적으로 로드하는 함수
function loadKakaoMapScript() {
  return new Promise((resolve, reject) => {
    if (typeof kakao !== "undefined" && kakao.maps) {
      resolve();
    } else {
      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${API_KEY}&autoload=false`;
      script.onload = () => kakao.maps.load(resolve);
      script.onerror = () => reject(new Error("카카오맵 API 스크립트 로드 실패"));
      document.head.appendChild(script);
    }
  });
}

// 지도 초기화 함수
export async function initializeMap() {
  try {
    // API 스크립트 로드 대기
    await loadKakaoMapScript();

    // 지도 컨테이너 확인
    const mapContainer = document.getElementById("nv-map");
    if (!mapContainer) {
      throw new Error("지도 컨테이너 로드 실패");
    }

    // 지도 생성
    const map = new kakao.maps.Map(mapContainer, {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 3,
    });

    // 위성 모드 적용
    map.addOverlayMapTypeId(kakao.maps.MapTypeId.HYBRID);
    console.log("위성 모드 적용 성공:", kakao.maps.MapTypeId.HYBRID);

    // 드래그 가능한 마커 추가
    const marker = new kakao.maps.Marker({
      position: map.getCenter(),
      draggable: true,
    });
    marker.setMap(map);

    // 지오코더 초기화
    const geocoder = new kakao.maps.services.Geocoder();
    console.log("지도 초기화 성공, 중심 좌표:", map.getCenter().toString());

    return { map, marker, geocoder };
  } catch (error) {
    console.error("지도 초기화 실패:", error.message);
    alert("지도를 로드하는 데 실패했습니다. 다시 시도해주세요."); // 사용자 피드백 추가
    throw error; // 상위 로직에서 추가 처리 가능
  }
}