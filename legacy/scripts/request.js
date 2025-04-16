import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM 요소
const form = document.getElementById('service-form');
const stepContainers = document.querySelectorAll('.step-container');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
let currentStep = 1;
const totalSteps = 9;

// 다음 버튼 이벤트 핸들러
function handleNextStep(step) {
  const currentContainer = document.getElementById(`step${step}`);
  const nextContainer = document.getElementById(`step${step + 1}`);
  
  if (validateStep(step)) {
    currentContainer.classList.remove('active');
    nextContainer.classList.add('active');
    currentStep = step + 1;
    updateProgress();
  }
}

// 이전 버튼 이벤트 핸들러
function handlePrevStep(step) {
  const currentContainer = document.getElementById(`step${step}`);
  const prevContainer = document.getElementById(`step${step - 1}`);
  
  currentContainer.classList.remove('active');
  prevContainer.classList.add('active');
  currentStep = step - 1;
  updateProgress();
}

// 단계별 유효성 검사
function validateStep(step) {
  switch(step) {
    case 1:
      const serviceType = document.querySelector('input[name="service-type"]:checked');
      if (!serviceType) {
        alert('서비스 유형을 선택해주세요.');
        return false;
      }
      return true;
      
    case 2:
      const customerName = document.getElementById('customer-name');
      if (!customerName.value.trim()) {
        alert('이름을 입력해주세요.');
        return false;
      }
      return true;
      
    case 3:
      const phone = document.getElementById('phone');
      if (!phone.value.trim()) {
        alert('전화번호를 입력해주세요.');
        return false;
      }
      return true;
      
    case 4:
      const password = document.getElementById('customer-password');
      if (password.value && (password.value.length < 4 || password.value.length > 8)) {
        alert('비밀번호는 4~8자리로 입력해주세요.');
        return false;
      }
      return true;
      
    case 5:
      const address = document.getElementById('address');
      if (!address.value.trim()) {
        alert('주소를 검색해주세요.');
        return false;
      }
      return true;
      
    case 7:
      const workDate = document.getElementById('work-date');
      if (!workDate.value) {
        alert('작업 날짜를 선택해주세요.');
        return false;
      }
      return true;
      
    default:
      return true;
  }
}

// 진행 상태 업데이트
function updateProgress() {
  const progress = (currentStep / totalSteps) * 100;
  progressBar.style.width = `${progress}%`;
  progressText.textContent = `${currentStep}/${totalSteps} 단계`;
}

// 서비스 신청 처리
async function submitRequest(event) {
  event.preventDefault();
  
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      window.location.href = '/login.html';
      return;
    }

    const formData = {
      userId: user.uid,
      serviceType: document.querySelector('input[name="service-type"]:checked').value,
      customerName: document.getElementById('customer-name').value,
      phone: document.getElementById('phone').value,
      password: document.getElementById('customer-password').value,
      address: document.getElementById('address').value,
      workDate: document.getElementById('work-date').value,
      specialRequests: document.getElementById('worker-request').value,
      status: '접수완료',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Firestore에 저장
    const docRef = await addDoc(collection(db, 'serviceRequests'), formData);
    alert('서비스 신청이 완료되었습니다.');
    window.location.href = '/mypage.html';
  } catch (error) {
    console.error('서비스 신청 중 오류 발생:', error);
    alert('서비스 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
  // 다음 버튼 이벤트
  for (let i = 1; i <= totalSteps; i++) {
    const nextButton = document.getElementById(`next-step${i}`);
    if (nextButton) {
      nextButton.addEventListener('click', () => handleNextStep(i));
    }
    
    const prevButton = document.getElementById(`prev-step${i}`);
    if (prevButton) {
      prevButton.addEventListener('click', () => handlePrevStep(i));
    }
  }

  // 지도 초기화
  const mapContainer = document.getElementById('nv-map');
  const map = new kakao.maps.Map(mapContainer, {
    center: new kakao.maps.LatLng(37.566826, 126.978656),
    level: 3,
    mapTypeId: kakao.maps.MapTypeId.HYBRID
  });

  // 지도 컨트롤 추가
  const mapTypeControl = new kakao.maps.MapTypeControl();
  map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

  // 줌 컨트롤 추가
  const zoomControl = new kakao.maps.ZoomControl();
  map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

  // 지도 리사이즈 이벤트 추가
  window.addEventListener('resize', () => {
    map.relayout();
  });

  // 주소 검색 버튼 이벤트
  const addressSearchBtn = document.getElementById('address-search-btn');
  const addressInput = document.getElementById('address');
  
  addressSearchBtn.addEventListener('click', () => {
    new daum.Postcode({
      oncomplete: function(data) {
        // 주소 정보 설정
        addressInput.value = data.address;
        
        // 주소로 좌표 검색
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(data.address, function(result, status) {
          if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
            
            // 지도 중심 이동
            map.setCenter(coords);
            
            // 마커 생성
            const marker = new kakao.maps.Marker({
              map: map,
              position: coords
            });
            
            // 인포윈도우 생성
            const infowindow = new kakao.maps.InfoWindow({
              content: `<div style="width:150px;text-align:center;padding:6px 0;">${data.address}</div>`
            });
            infowindow.open(map, marker);
            
            // 마커 드래그 이벤트
            kakao.maps.event.addListener(marker, 'dragend', function() {
              const position = marker.getPosition();
              geocoder.coord2Address(position.getLng(), position.getLat(), function(result, status) {
                if (status === kakao.maps.services.Status.OK) {
                  const addr = result[0].address.address_name;
                  addressInput.value = addr;
                  infowindow.setContent(`<div style="width:150px;text-align:center;padding:6px 0;">${addr}</div>`);
                }
              });
            });
            
            // 마커 드래그 가능하도록 설정
            marker.setDraggable(true);
          }
        });
      }
    }).open();
  });

  // 전화번호 자동 하이픈 추가
  const phoneInput = document.getElementById('phone');
  phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 추출
    
    if (value.length > 11) {
      value = value.slice(0, 11); // 최대 11자리로 제한
    }
    
    // 하이픈 추가
    if (value.length <= 3) {
      // 3자리 이하일 때는 그대로
    } else if (value.length <= 7) {
      // 4-7자리: 000-0000 형식
      value = value.slice(0, 3) + '-' + value.slice(3);
    } else {
      // 8자리 이상: 000-0000-0000 형식
      value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
    }
    
    e.target.value = value;
  });

  // 폼 제출 이벤트
  form.addEventListener('submit', submitRequest);

  // 서비스 유형 변경 이벤트
  const serviceTypeInputs = document.querySelectorAll('input[name="service-type"]');
  serviceTypeInputs.forEach(input => {
    input.addEventListener('change', () => {
      const customService = document.getElementById('custom-service');
      if (input.value === '기타') {
        customService.style.display = 'block';
      } else {
        customService.style.display = 'none';
      }
    });
  });

  // 초기 진행 상태 설정
  updateProgress();
});

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log('로그인이 필요합니다.');
  }
});

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
      assignedWorkerId: null,  // 작업자 배정 전 null
      workerInfo: null,        // 작업자 정보 (배정 후 추가)
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 관리자와 작업자에게 알림 전송
    await sendNotification('새로운 서비스 요청', {
      requestId: serviceRequestRef.id,
      customerId: user.uid,
      address: formData.address,
      serviceType: formData.serviceType
    });

    return serviceRequestRef.id;
  } catch (error) {
    console.error('서비스 요청 제출 오류:', error);
    throw error;
  }
} 