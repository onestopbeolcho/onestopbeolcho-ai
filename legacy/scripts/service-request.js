// 전역 변수로 map과 marker 선언
let map = null;
let marker = null;

// 카카오맵 초기화
function initMap() {
  console.log('initMap 함수 호출됨');
  
  const mapContainer = document.getElementById('nv-map');
  if (!mapContainer) {
    console.error('지도 컨테이너를 찾을 수 없습니다.');
    return;
  }

  try {
    console.log('카카오맵 초기화 시작');
    const mapOption = {
      center: new kakao.maps.LatLng(37.566826, 126.978656),
      level: 3,
      mapTypeId: kakao.maps.MapTypeId.HYBRID  // 위성지도로 설정
    };
    
    map = new kakao.maps.Map(mapContainer, mapOption);
    console.log('지도 객체 생성 완료');

    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);

    marker = new kakao.maps.Marker();
    marker.setMap(map);
    console.log('마커 생성 완료');

    // 지도 컨테이너 크기 조정
    mapContainer.style.width = '100%';
    mapContainer.style.height = '400px';

    kakao.maps.event.addListener(map, 'tilesloaded', () => {
      console.log('지도 타일 로드 완료');
      map.relayout();
    });

    window.addEventListener('resize', () => {
      console.log('브라우저 크기 변경');
      map.relayout();
    });

    const addressSearchBtn = document.getElementById('address-search-btn');
    const addressInput = document.getElementById('address');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    const markerLatInput = document.getElementById('markerLat');
    const markerLngInput = document.getElementById('markerLng');

    if (addressSearchBtn) {
      addressSearchBtn.addEventListener('click', () => {
        new daum.Postcode({
          oncomplete: (data) => {
            addressInput.value = data.address;
            const geocoder = new kakao.maps.services.Geocoder();
            geocoder.addressSearch(data.address, (result, status) => {
              if (status === kakao.maps.services.Status.OK) {
                const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                map.setCenter(coords);
                marker.setPosition(coords);
                latInput.value = result[0].y;
                lngInput.value = result[0].x;
                markerLatInput.value = result[0].y;
                markerLngInput.value = result[0].x;
                map.setLevel(2);
              }
            });
          }
        }).open();
      });
    }

    kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
      const latlng = mouseEvent.latLng;
      marker.setPosition(latlng);
      markerLatInput.value = latlng.getLat();
      markerLngInput.value = latlng.getLng();
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
          addressInput.value = result[0].address.address_name;
        }
      });
    });

    console.log('지도 초기화 완료');
  } catch (error) {
    console.error('지도 초기화 오류:', error);
  }
}

// 단계별 진행 처리
function setupStepNavigation() {
  console.log('setupStepNavigation 호출됨');

  const nextToStep2 = document.getElementById('next-to-step2');
  const prevToStep1 = document.getElementById('prev-to-step1');
  const nextToStep3 = document.getElementById('next-to-step3');
  const prevToStep2 = document.getElementById('prev-to-step2');
  const nextToStep4 = document.getElementById('next-to-step4');
  const prevToStep3 = document.getElementById('prev-to-step3');
  const nextToStep5 = document.getElementById('next-to-step5');
  const prevToStep4 = document.getElementById('prev-to-step4');
  const submitBtn = document.getElementById('submit-btn');

  // Step 1 -> 2 (서비스 유형 선택 -> 서비스 상세 정보)
  if (nextToStep2) {
    nextToStep2.addEventListener('click', () => {
      console.log('다음 단계로 이동 (1->2)');
      const serviceType = document.querySelector('input[name="serviceType"]:checked')?.value;
      if (!serviceType) {
        alert('서비스 유형을 선택해주세요.');
        return;
      }
      
      // 현재 단계 숨기기
      const step1 = document.getElementById('step1');
      const step2 = document.getElementById('step2');
      
      if (step1 && step2) {
        step1.classList.remove('active');
        step2.classList.add('active');
        updateStepIndicator(2);
        loadServiceDetailForm(serviceType);
        showStepButtons(2);
        
        // 지도 컨테이너 크기 조정
        const mapContainer = document.getElementById('nv-map');
        if (mapContainer && map) {
          mapContainer.style.width = '100%';
          mapContainer.style.height = '400px';
          map.relayout();
        }
      } else {
        console.error('단계 컨테이너를 찾을 수 없습니다.');
      }
    });
  }

  // Step 2 -> 3 (서비스 상세 정보 -> 신청자 정보)
  if (nextToStep3) {
    nextToStep3.addEventListener('click', () => {
      console.log('다음 단계로 이동 (2->3)');
      const inputs = document.querySelectorAll('#service-detail-form input[required], #service-detail-form select[required]');
      let isValid = true;
      const missingFields = [];
      inputs.forEach(input => {
        if (!input.value.trim()) {
          isValid = false;
          input.classList.add('is-invalid');
          const label = input.closest('.form-group').querySelector('label').dataset.label;
          missingFields.push(label);
        } else {
          input.classList.remove('is-invalid');
        }
      });

      if (isValid) {
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step3').classList.add('active');
        updateStepIndicator(3);
        showStepButtons(3);
      } else {
        alert(`다음 필수 항목을 입력해주세요: ${missingFields.join(', ')}`);
      }
    });
  }

  // Step 3 -> 4 (신청자 정보 -> 견적서 확인)
  if (nextToStep4) {
    nextToStep4.addEventListener('click', () => {
      console.log('다음 단계로 이동 (3->4)');
      const applicantName = document.getElementById('applicant-name').value;
      const applicantPhone = document.getElementById('applicant-phone').value;

      if (!applicantName || !applicantPhone) {
        alert('신청자명과 연락처는 필수 입력 항목입니다.');
        return;
      }

      // 로그인 상태 확인
      firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
          if (confirm('서비스 신청을 위해서는 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
            window.location.href = '/login.html?redirect=request.html';
          }
          return;
        }

        document.getElementById('step3').classList.remove('active');
        document.getElementById('step4').classList.add('active');
        updateStepIndicator(4);
        generateEstimate();
        showStepButtons(4);
      });
    });
  }

  // 이전 단계 버튼들
  if (prevToStep1) {
    prevToStep1.addEventListener('click', () => {
      document.getElementById('step2').classList.remove('active');
      document.getElementById('step1').classList.add('active');
      updateStepIndicator(1);
      showStepButtons(1);
    });
  }

  if (prevToStep2) {
    prevToStep2.addEventListener('click', () => {
      document.getElementById('step3').classList.remove('active');
      document.getElementById('step2').classList.add('active');
      updateStepIndicator(2);
      showStepButtons(2);
    });
  }

  if (prevToStep3) {
    prevToStep3.addEventListener('click', () => {
      document.getElementById('step4').classList.remove('active');
      document.getElementById('step3').classList.add('active');
      updateStepIndicator(3);
      showStepButtons(3);
    });
  }

  if (prevToStep4) {
    prevToStep4.addEventListener('click', () => {
      document.getElementById('step5').classList.remove('active');
      document.getElementById('step4').classList.add('active');
      updateStepIndicator(4);
      showStepButtons(4);
    });
  }
}

// 단계 표시기 업데이트
function updateStepIndicator(step) {
  const steps = document.querySelectorAll('.step');
  steps.forEach((s, index) => {
    if (index + 1 <= step) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });
}

// 로그인한 사용자 정보 가져오기
async function loadUserInfo() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // 신청자 정보 자동 입력
      const applicantName = document.getElementById('applicant-name');
      const applicantPhone = document.getElementById('applicant-phone');
      
      if (applicantName) applicantName.value = userData.name || '';
      if (applicantPhone) applicantPhone.value = userData.phone || '';
    }
  } catch (error) {
    console.error('사용자 정보 로드 오류:', error);
  }
}

// 입력된 정보를 localStorage에 저장하는 함수
function saveFormData() {
  const formData = {
    serviceType: document.querySelector('input[name="serviceType"]:checked')?.value,
    applicantName: document.getElementById('applicant-name')?.value,
    applicantPhone: document.getElementById('applicant-phone')?.value,
    address: document.getElementById('address')?.value,
    lat: document.getElementById('lat')?.value,
    lng: document.getElementById('lng')?.value,
    workDate: document.getElementById('work-date')?.value,
    // 서비스 타입별 상세 정보
    graveType: document.getElementById('grave-type')?.value,
    graveCount: document.getElementById('grave-count')?.value,
    areaSize: document.getElementById('area-size')?.value,
    // 현재 단계 저장
    currentStep: document.querySelector('.step.active')?.dataset.step
  };
  
  localStorage.setItem('serviceRequestData', JSON.stringify(formData));
}

// localStorage에서 저장된 정보를 불러오는 함수
function loadFormData() {
  const savedData = localStorage.getItem('serviceRequestData');
  if (!savedData) return;

  const formData = JSON.parse(savedData);
  
  // 서비스 타입 선택
  if (formData.serviceType) {
    const serviceTypeRadio = document.querySelector(`input[name="serviceType"][value="${formData.serviceType}"]`);
    if (serviceTypeRadio) {
      serviceTypeRadio.checked = true;
      loadServiceDetailForm(formData.serviceType);
    }
  }

  // 기본 정보 입력
  if (formData.applicantName) document.getElementById('applicant-name').value = formData.applicantName;
  if (formData.applicantPhone) document.getElementById('applicant-phone').value = formData.applicantPhone;
  if (formData.address) document.getElementById('address').value = formData.address;
  if (formData.lat) document.getElementById('lat').value = formData.lat;
  if (formData.lng) document.getElementById('lng').value = formData.lng;
  if (formData.workDate) document.getElementById('work-date').value = formData.workDate;

  // 서비스 타입별 상세 정보 입력
  if (formData.graveType) document.getElementById('grave-type').value = formData.graveType;
  if (formData.graveCount) document.getElementById('grave-count').value = formData.graveCount;
  if (formData.areaSize) document.getElementById('area-size').value = formData.areaSize;

  // 저장된 단계로 이동
  if (formData.currentStep) {
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
      step.classList.remove('active');
      if (step.dataset.step === formData.currentStep) {
        step.classList.add('active');
        showStepButtons(parseInt(formData.currentStep));
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded 이벤트 발생');

  // 로그인 상태 확인 및 사용자 정보 로드
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      loadUserInfo();
    }
  });

  setupStepNavigation();
  showStepButtons(1);

  const serviceTypeRadios = document.querySelectorAll('input[name="serviceType"]');
  const serviceDetailFields = document.getElementById('service-detail-fields');
  const customGraveCount = document.getElementById('custom-grave-count');
  const graveCountSelect = document.getElementById('grave-count');

  serviceTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      console.log('서비스 타입 선택:', radio.value);
      document.querySelectorAll('.service-fields').forEach(field => {
        field.style.display = 'none';
      });

      const selectedService = radio.value;
      const selectedFields = document.getElementById(`${radio.id}-fields`);
      if (selectedFields) {
        selectedFields.style.display = 'block';
        serviceDetailFields.style.display = 'block';
      }

      // 다음 단계 버튼 표시
      const nextButton = document.getElementById('next-to-step2');
      if (nextButton) {
        nextButton.style.display = 'inline-flex';
        nextButton.style.visibility = 'visible';
        nextButton.style.opacity = '1';
      }

      updateServiceSummary(selectedService);
      loadServiceDetailForm(selectedService);
      showStepButtons(1); // 현재 단계의 버튼 표시
    });
  });

  if (graveCountSelect) {
    graveCountSelect.addEventListener('change', () => {
      customGraveCount.style.display = graveCountSelect.value === 'custom' ? 'block' : 'none';
    });
  }

  const form = document.getElementById('service-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('폼 제출 시작');

      // 서비스 타입 확인
      const selectedServiceType = document.querySelector('input[name="serviceType"]:checked');
      console.log('선택된 서비스 타입:', selectedServiceType?.value);

      if (!selectedServiceType) {
        alert('서비스 유형을 선택해주세요.');
        return;
      }

      try {
        // 필수 필드 검증
        const requiredFields = {
          'applicant-name': '신청자 이름',
          'applicant-phone': '연락처',
          'address': '주소',
          'work-date': '작업 희망일'
        };

        for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
          const field = document.getElementById(fieldId);
          if (!field || !field.value.trim()) {
            alert(`${fieldName}을(를) 입력해주세요.`);
            if (field) {
              field.focus();
              field.classList.add('is-invalid');
            }
            return;
          }
          field.classList.remove('is-invalid');
        }

        // 약관 동의 체크
        const privacyAgree = document.getElementById('privacy-agree');
        const termsAgree = document.getElementById('terms-agree');
        
        console.log('약관 동의 상태:', {
          privacyAgree: privacyAgree?.checked,
          termsAgree: termsAgree?.checked,
          privacyAgreeElement: privacyAgree,
          termsAgreeElement: termsAgree
        });

        // 약관 동의 체크박스가 존재하는지 확인
        if (!privacyAgree || !termsAgree) {
          console.error('약관 동의 체크박스를 찾을 수 없습니다.');
          return;
        }

        // 약관 동의 상태 확인
        if (!privacyAgree.checked || !termsAgree.checked) {
          console.log('약관 동의가 필요합니다.');
          alert('모든 약관에 동의해주세요.');
          return;
        }

        console.log('약관 동의 완료');

        const formData = {
          serviceType: selectedServiceType.value,
          address: document.getElementById('address').value,
          lat: document.getElementById('lat').value,
          lng: document.getElementById('lng').value,
          markerLat: document.getElementById('markerLat').value,
          markerLng: document.getElementById('markerLng').value,
          applicantName: document.getElementById('applicant-name').value,
          applicantPhone: document.getElementById('applicant-phone').value,
          workDate: document.getElementById('work-date').value
        };

        console.log('수집된 기본 데이터:', formData);

        // 서비스 타입별 상세 정보 수집
        switch(selectedServiceType.value) {
          case '벌초':
            formData.graveType = document.getElementById('grave-type')?.value || '';
            formData.graveCount = document.getElementById('grave-count')?.value || '';
            formData.areaSize = document.getElementById('area-size')?.value || '';
            break;
          case '예초':
            formData.grassArea = document.getElementById('grass-area')?.value || '';
            formData.workScope = document.getElementById('work-scope')?.value || '';
            break;
          case '태양광 예초':
            formData.grassArea = document.getElementById('grass-area')?.value || '';
            formData.workScope = document.getElementById('work-scope')?.value || '';
            break;
          case '제초제 살포':
            formData.herbicideType = document.getElementById('herbicide-type')?.value || '';
            formData.applicationArea = document.getElementById('application-area')?.value || '';
            formData.areaSize = document.getElementById('area-size')?.value || '';
            break;
        }

        console.log('최종 수집된 데이터:', formData);

        const requestId = await submitServiceRequest(formData);
        console.log('서비스 신청 완료, ID:', requestId);
        
        alert('서비스 신청이 완료되었습니다.');
        window.location.href = '/mypage.html';
      } catch (error) {
        console.error('서비스 신청 오류:', error);
        alert(error.message || '서비스 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    });
  } else {
    console.error('서비스 신청 폼을 찾을 수 없습니다.');
  }

  // 카카오맵 초기화
  if (typeof kakao !== 'undefined' && kakao.maps) {
    console.log('카카오맵 SDK 로드됨');
    kakao.maps.load(() => {
      console.log('카카오맵 SDK 로드 완료');
      initMap();
    });
  } else {
    console.error('카카오맵 SDK가 로드되지 않았습니다.');
  }

  // 묘지 유형 선택 시 기수와 평수 입력 필드 표시
  const graveTypeSelect = document.getElementById('grave-type');
  if (graveTypeSelect) {
    graveTypeSelect.addEventListener('change', function() {
      const moundOptions = document.getElementById('mound-grave-options');
      const customGraveCount = document.getElementById('custom-grave-count');
      const areaSize = document.getElementById('area-size');
      
      if (this.value) {
        moundOptions.style.display = 'block';
        areaSize.style.display = 'block';
      } else {
        moundOptions.style.display = 'none';
        customGraveCount.style.display = 'none';
        areaSize.style.display = 'none';
      }
    });
  }

  // 모든 입력 필드에 change 이벤트 리스너 추가
  const inputFields = document.querySelectorAll('input, select, textarea');
  inputFields.forEach(field => {
    field.addEventListener('change', saveFormData);
  });

  // 페이지 로드 시 저장된 데이터 불러오기
  loadFormData();

  // 로그인 상태 변경 감지
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // 로그인 성공 시 저장된 데이터가 있으면 불러오기
      loadFormData();
    }
  });

  // 체크박스 name 속성 추가 및 required 속성 제거
  const privacyAgree = document.getElementById('privacy-agree');
  const termsAgree = document.getElementById('terms-agree');
  
  if (privacyAgree) {
    privacyAgree.setAttribute('name', 'privacy-agree');
    privacyAgree.removeAttribute('required');
  }
  if (termsAgree) {
    termsAgree.setAttribute('name', 'terms-agree');
    termsAgree.removeAttribute('required');
  }
});

// 서비스 정보 요약 업데이트
function updateServiceSummary(serviceType) {
  const summaryContent = document.getElementById('service-summary');
  const summaryContentFinal = document.getElementById('service-summary-content-final');
  
  if (!summaryContent && !summaryContentFinal) {
    console.log('서비스 요약 컨테이너를 찾을 수 없습니다.');
    return;
  }

  let summaryHTML = `
    <div class="summary-item">
      <span class="summary-label">서비스 유형:</span>
      <span class="summary-value">${serviceType}</span>
    </div>
  `;

  if (serviceType === '벌초') {
    const graveType = document.getElementById('grave-type')?.value;
    const graveCount = document.getElementById('grave-count')?.value;
    const areaSize = document.getElementById('area-size')?.value;
    
    if (graveType || graveCount || areaSize) {
      summaryHTML += `
        <div class="summary-item">
          <span class="summary-label">묘지 유형:</span>
          <span class="summary-value">${graveType || '-'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">묘지 수:</span>
          <span class="summary-value">${graveCount || '-'}개</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">면적:</span>
          <span class="summary-value">${areaSize || '-'}㎡</span>
        </div>
      `;
    }
  }

  if (summaryContent) {
    summaryContent.innerHTML = summaryHTML;
  }
  if (summaryContentFinal) {
    summaryContentFinal.innerHTML = summaryHTML;
  }
}

// 서비스 상세 폼 로드
async function loadServiceDetailForm(serviceType) {
  const step2 = document.getElementById('step2');
  const detailForm = step2.querySelector('.service-detail-form');
  const loading = document.getElementById('form-loading');
  
  if (!detailForm) {
    console.error('서비스 상세 폼 요소를 찾을 수 없습니다.');
    return;
  }
  
  detailForm.innerHTML = '';
  if (loading) {
    loading.style.display = 'block';
  }

  try {
    // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
    const today = new Date().toISOString().split('T')[0];
    
    let formContent = `
      <h3>세부 정보 입력</h3>
      <div class="form-group">
        <label for="work-date" class="form-label" data-label="작업 희망일">작업 희망일</label>
        <input type="date" id="work-date" name="work-date" class="form-control" min="${today}" required>
        <small class="form-text text-muted">작업을 희망하시는 날짜를 선택해주세요. (오늘 이후 날짜만 선택 가능)</small>
      </div>
    `;

    switch(serviceType) {
      case '벌초':
        formContent += `
          <div class="form-group">
            <label for="grave-type" class="form-label" data-label="묘지 유형">묘지 유형</label>
            <select id="grave-type" name="grave-type" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="mound">일반 봉분묘</option>
              <option value="individual">평장묘</option>
              <option value="joint">공동묘지</option>
            </select>
          </div>
          <div id="grave-count-options" class="form-group" style="display: none;">
            <label for="grave-count" class="form-label" data-label="봉분 기수">봉분 기수</label>
            <select id="grave-count" name="grave-count" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="1">1기</option>
              <option value="2">2기</option>
              <option value="3">3기</option>
              <option value="4">4기</option>
              <option value="5">5기</option>
              <option value="6">6기</option>
              <option value="custom">직접입력</option>
            </select>
          </div>
          <div id="custom-grave-count" class="form-group" style="display: none;">
            <label for="custom-count" class="form-label" data-label="봉분 기수">봉분 기수</label>
            <input type="number" id="custom-count" name="custom-count" class="form-control" min="1" placeholder="봉분 기수를 입력하세요">
          </div>
          <div class="form-group">
            <label for="area-size" class="form-label" data-label="면적">면적 (평)</label>
            <input type="number" id="area-size" name="area-size" class="form-control" min="1" step="0.1" required>
            <small class="form-text text-muted">제곱미터: <span id="area-size-m2">0</span>㎡</small>
          </div>
        `;
        break;
      case '예초':
        formContent += `
          <div class="form-group">
            <label for="area-size" class="form-label" data-label="면적">면적 (평)</label>
            <input type="number" id="area-size" class="form-control" min="1" step="0.1" required>
            <small class="form-text text-muted">제곱미터: <span id="area-size-m2">0</span>㎡</small>
          </div>
          <div class="form-group">
            <label for="grass-height" class="form-label" data-label="풀 높이">풀 높이</label>
            <select id="grass-height" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="low">낮음 (30cm 이하)</option>
              <option value="medium">중간 (30~50cm)</option>
              <option value="high">높음 (50~80cm)</option>
              <option value="very-high">매우 높음 (80cm 이상)</option>
            </select>
            <small class="form-text text-warning">80cm 이상의 경우 추가 요금이 발생할 수 있습니다.</small>
          </div>
          <div class="form-group">
            <label for="disposal-type" class="form-label" data-label="폐기물 처리">폐기물 처리</label>
            <select id="disposal-type" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="cut-only">풀을 자르기만 할게요</option>
              <option value="collect-one">자르고 한곳으로 모아주세요 (현장에서 모으기)</option>
              <option value="collect-multiple">여러곳에 모아주세요 (현장에서 모으기)</option>
              <option value="specific-location">지정된 장소로 배출해주세요 (현장 외 지정 장소로 배출)</option>
              <option value="complete-disposal">자른 풀까지 완전히 폐기해주세요 (작업자가 폐기물 완전배출)</option>
            </select>
          </div>
        `;
        break;
      case '태양광 예초':
        formContent += `
          <div class="form-group">
            <label for="area-size" class="form-label" data-label="면적">면적 (평)</label>
            <input type="number" id="area-size" class="form-control" min="1" step="0.1" required>
            <small class="form-text text-muted">제곱미터: <span id="area-size-m2">0</span>㎡</small>
          </div>
          <div class="form-group">
            <label for="grass-height" class="form-label" data-label="풀 높이">풀 높이</label>
            <select id="grass-height" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="low">낮음 (30cm 이하)</option>
              <option value="medium">중간 (30~50cm)</option>
              <option value="high">높음 (50~80cm)</option>
              <option value="very-high">매우 높음 (80cm 이상)</option>
            </select>
            <small class="form-text text-warning">80cm 이상의 경우 추가 요금이 발생할 수 있습니다.</small>
          </div>
          <div class="form-group">
            <label for="disposal-type" class="form-label" data-label="폐기물 처리">폐기물 처리</label>
            <select id="disposal-type" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="cut-only">풀을 자르기만 할게요</option>
              <option value="collect-one">자르고 한곳으로 모아주세요 (현장에서 모으기)</option>
              <option value="collect-multiple">여러곳에 모아주세요 (현장에서 모으기)</option>
              <option value="specific-location">지정된 장소로 배출해주세요 (현장 외 지정 장소로 배출)</option>
              <option value="complete-disposal">자른 풀까지 완전히 폐기해주세요 (작업자가 폐기물 완전배출)</option>
            </select>
          </div>
          <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle"></i> 1만평 이상의 대규모 태양광 단지 유지관리는 별도 전화 상담이 필요합니다.
            <br>
            <small class="text-muted">전화: 010-1234-5678</small>
          </div>
        `;
        break;
      case '가지치기':
        formContent += `
          <div class="form-group">
            <label for="pruning-type" class="form-label" data-label="가지치기 유형">가지치기 유형</label>
            <select id="pruning-type" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="pine">소나무 전정</option>
              <option value="landscape">조경수 전지</option>
              <option value="general">가지치기</option>
              <option value="custom">기타 (직접입력)</option>
            </select>
          </div>
          <div id="custom-pruning-type" class="form-group" style="display: none;">
            <label for="custom-type" class="form-label" data-label="가지치기 유형">가지치기 유형</label>
            <input type="text" id="custom-type" class="form-control" placeholder="가지치기 유형을 입력하세요">
          </div>
          <div class="form-group">
            <label for="area-size" class="form-label" data-label="면적">면적 (평)</label>
            <input type="number" id="area-size" class="form-control" min="1" step="0.1" required>
            <small class="form-text text-muted">제곱미터: <span id="area-size-m2">0</span>㎡</small>
          </div>
        `;
        break;
      case '벌목':
        formContent += `
          <div class="form-group">
            <label for="tree-height" class="form-label" data-label="나무 높이">나무 높이</label>
            <select id="tree-height" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="low">낮음 (5m 이하)</option>
              <option value="medium">중간 (5~10m)</option>
              <option value="high">높음 (10~15m)</option>
              <option value="very-high">매우 높음 (15m 이상)</option>
            </select>
            <small class="form-text text-warning">10m 이상의 경우 추가 요금이 발생할 수 있습니다.</small>
          </div>
          <div class="form-group">
            <label for="tree-count" class="form-label" data-label="벌목할 나무 수">벌목할 나무 수</label>
            <select id="tree-count" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="1">1그루</option>
              <option value="2-3">2~3그루</option>
              <option value="4-5">4~5그루</option>
              <option value="6-10">6~10그루</option>
              <option value="custom">직접입력</option>
            </select>
          </div>
          <div id="custom-tree-count" class="form-group" style="display: none;">
            <label for="custom-count" class="form-label" data-label="벌목할 나무 수">벌목할 나무 수</label>
            <input type="number" id="custom-count" class="form-control" min="1" placeholder="벌목할 나무 수를 입력하세요">
          </div>
          <div class="form-group">
            <label for="disposal-type" class="form-label" data-label="폐기물 처리">폐기물 처리</label>
            <select id="disposal-type" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="cut-only">나무를 자르기만 할게요</option>
              <option value="collect">자른 나무를 한곳으로 모아주세요</option>
              <option value="specific-location">지정된 장소로 배출해주세요</option>
              <option value="complete-disposal">자른 나무까지 완전히 폐기해주세요 (작업자가 폐기물 완전배출)</option>
            </select>
          </div>
        `;
        break;
      case '제초제 살포':
        formContent += `
          <div class="form-group">
            <label for="herbicide-type" class="form-label" data-label="제초제 종류">제초제 종류</label>
            <select id="herbicide-type" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="non-selective">비선택성 제초제 (모든 식물에 효과)</option>
              <option value="selective">선택성 제초제 (잡초만 제거)</option>
              <option value="consult">제초제 종류를 모르겠어요 (전문가 상담 필요)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="application-area" class="form-label" data-label="살포 대상">살포 대상</label>
            <select id="application-area" class="form-control" required>
              <option value="">선택하세요</option>
              <option value="grave">묘지 관리</option>
              <option value="building">건물 화단</option>
              <option value="garden">정원/텃밭</option>
              <option value="farm">농경지</option>
              <option value="custom">기타 (직접입력)</option>
            </select>
          </div>
          <div id="custom-application-area" class="form-group" style="display: none;">
            <label for="custom-area" class="form-label" data-label="살포 대상">살포 대상</label>
            <input type="text" id="custom-area" class="form-control" placeholder="살포 대상을 입력하세요">
          </div>
          <div class="form-group">
            <label for="area-size" class="form-label" data-label="면적">면적 (평)</label>
            <input type="number" id="area-size" class="form-control" min="1" step="0.1" required>
            <small class="form-text text-muted">제곱미터: <span id="area-size-m2">0</span>㎡</small>
          </div>
          <div class="alert alert-warning mt-3">
            <i class="fas fa-exclamation-triangle"></i> 제초제 살포 시 주의사항:
            <ul class="mb-0 mt-2">
              <li>살포 후 24시간 동안 해당 지역 접근을 제한해야 합니다.</li>
              <li>작업 시 보호장비를 착용합니다.</li>
              <li>날씨와 기온에 따라 살포 효과가 달라질 수 있습니다.</li>
            </ul>
          </div>
        `;
        break;
      // 나머지 case 추가
      default:
        formContent = `<p>선택한 서비스에 대한 상세 정보를 입력해주세요.</p>`;
    }
    
    detailForm.innerHTML = formContent;

    // 벌초 서비스의 경우 추가 이벤트 리스너 설정
    if (serviceType === '벌초') {
      const graveTypeSelect = document.getElementById('grave-type');
      const graveCountOptions = document.getElementById('grave-count-options');
      const graveCountSelect = document.getElementById('grave-count');
      const customGraveCount = document.getElementById('custom-grave-count');
      const areaSizeInput = document.getElementById('area-size');
      const areaSizeM2 = document.getElementById('area-size-m2');

      // 묘지 유형 선택 시 봉분 기수 옵션 표시
      if (graveTypeSelect && graveCountOptions) {
        graveTypeSelect.addEventListener('change', function() {
          graveCountOptions.style.display = this.value ? 'block' : 'none';
          if (customGraveCount) {
            customGraveCount.style.display = 'none';
          }
        });
      }

      // 묘지 수 선택 시 직접입력 필드 표시/숨김
      if (graveCountSelect && customGraveCount) {
        graveCountSelect.addEventListener('change', function() {
          customGraveCount.style.display = this.value === 'custom' ? 'block' : 'none';
          if (areaSizeInput) {
            // 묘지 수에 따른 면적 자동 계산
            const areaMap = {
              '1': 20,
              '2': 30,
              '3': 40,
              '4': 50,
              '5': 60,
              '6': 70
            };
            if (this.value !== 'custom') {
              areaSizeInput.value = areaMap[this.value] || '';
              updateAreaM2(areaSizeInput.value);
            }
          }
        });
      }

      // 면적 입력 시 제곱미터 변환
      if (areaSizeInput && areaSizeM2) {
        areaSizeInput.addEventListener('input', function() {
          updateAreaM2(this.value);
        });
      }

      // 제곱미터 변환 함수
      function updateAreaM2(pyeong) {
        if (areaSizeM2) {
          const m2 = (pyeong * 3.30578).toFixed(2);
          areaSizeM2.textContent = m2;
        }
      }
    }

    // 예초 서비스의 경우 추가 이벤트 리스너 설정
    if (serviceType === '예초') {
      const areaSizeInput = document.getElementById('area-size');
      const areaSizeM2 = document.getElementById('area-size-m2');

      // 면적 입력 시 제곱미터 변환
      areaSizeInput.addEventListener('input', function() {
        updateAreaM2(this.value);
      });

      // 제곱미터 변환 함수
      function updateAreaM2(pyeong) {
        const m2 = (pyeong * 3.30578).toFixed(2);
        areaSizeM2.textContent = m2;
      }
    }

    // 태양광 예초 서비스의 경우 추가 이벤트 리스너 설정
    if (serviceType === '태양광 예초') {
      const areaSizeInput = document.getElementById('area-size');
      const areaSizeM2 = document.getElementById('area-size-m2');

      // 면적 입력 시 제곱미터 변환
      areaSizeInput.addEventListener('input', function() {
        updateAreaM2(this.value);
      });

      // 제곱미터 변환 함수
      function updateAreaM2(pyeong) {
        const m2 = (pyeong * 3.30578).toFixed(2);
        areaSizeM2.textContent = m2;
      }
    }

    // 가지치기 서비스의 경우 추가 이벤트 리스너 설정
    if (serviceType === '가지치기') {
      const pruningTypeSelect = document.getElementById('pruning-type');
      const customPruningType = document.getElementById('custom-pruning-type');
      const areaSizeInput = document.getElementById('area-size');
      const areaSizeM2 = document.getElementById('area-size-m2');

      // 가지치기 유형 선택 시 직접입력 필드 표시/숨김
      pruningTypeSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
          customPruningType.style.display = 'block';
        } else {
          customPruningType.style.display = 'none';
        }
      });

      // 면적 입력 시 제곱미터 변환
      areaSizeInput.addEventListener('input', function() {
        updateAreaM2(this.value);
      });

      // 제곱미터 변환 함수
      function updateAreaM2(pyeong) {
        const m2 = (pyeong * 3.30578).toFixed(2);
        areaSizeM2.textContent = m2;
      }
    }

    // 벌목 서비스의 경우 추가 이벤트 리스너 설정
    if (serviceType === '벌목') {
      const treeCountSelect = document.getElementById('tree-count');
      const customTreeCount = document.getElementById('custom-tree-count');

      // 나무 수 선택 시 직접입력 필드 표시/숨김
      treeCountSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
          customTreeCount.style.display = 'block';
        } else {
          customTreeCount.style.display = 'none';
        }
      });
    }

    // 제초제 살포 서비스의 경우 추가 이벤트 리스너 설정
    if (serviceType === '제초제 살포') {
      const applicationAreaSelect = document.getElementById('application-area');
      const customApplicationArea = document.getElementById('custom-application-area');
      const areaSizeInput = document.getElementById('area-size');
      const areaSizeM2 = document.getElementById('area-size-m2');

      // 살포 대상 선택 시 직접입력 필드 표시/숨김
      applicationAreaSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
          customApplicationArea.style.display = 'block';
        } else {
          customApplicationArea.style.display = 'none';
        }
      });

      // 면적 입력 시 제곱미터 변환
      areaSizeInput.addEventListener('input', function() {
        updateAreaM2(this.value);
      });

      // 제곱미터 변환 함수
      function updateAreaM2(pyeong) {
        const m2 = (pyeong * 3.30578).toFixed(2);
        areaSizeM2.textContent = m2;
      }
    }
  } catch (error) {
    console.error('서비스 상세 폼 로드 오류:', error);
    if (detailForm) {
      detailForm.innerHTML = '<p class="text-danger">서비스 상세 폼을 로드하는 중 오류가 발생했습니다.</p>';
    }
  } finally {
    if (loading) {
      loading.style.display = 'none';
    }
  }
}

// 서비스 신청 제출 함수 수정
async function submitServiceRequest(formData) {
  try {
    console.log('서비스 신청 시작');
    const user = firebase.auth().currentUser;
    if (!user) {
      if (confirm('서비스 신청을 위해서는 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
        saveFormData();
        window.location.href = '/login.html?redirect=request.html';
      }
      return;
    }

    // 필수 필드 검증
    const requiredFields = {
      'applicant-name': '신청자 이름',
      'applicant-phone': '연락처',
      'address': '주소',
      'work-date': '작업 희망일'
    };

    // 필수 필드 검증 및 오류 메시지 표시
    for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
      const field = document.getElementById(fieldId);
      if (!field || !field.value.trim()) {
        alert(`${fieldName}을(를) 입력해주세요.`);
        if (field) {
          field.focus();
          field.classList.add('is-invalid');
        }
        throw new Error(`${fieldName}을(를) 입력해주세요.`);
      } else {
        field.classList.remove('is-invalid');
      }
    }

    // 약관 동의 체크
    const privacyAgree = document.getElementById('privacy-agree');
    const termsAgree = document.getElementById('terms-agree');
    
    console.log('약관 동의 상태:', {
      privacyAgree: privacyAgree?.checked,
      termsAgree: termsAgree?.checked,
      privacyAgreeElement: privacyAgree,
      termsAgreeElement: termsAgree
    });

    // 약관 동의 체크박스가 존재하는지 확인
    if (!privacyAgree || !termsAgree) {
      console.error('약관 동의 체크박스를 찾을 수 없습니다.');
      return;
    }

    // 약관 동의 상태 확인
    if (!privacyAgree.checked || !termsAgree.checked) {
      console.log('약관 동의가 필요합니다.');
      alert('모든 약관에 동의해주세요.');
      return;
    }

    console.log('약관 동의 완료');

    // 서비스 타입 확인
    if (!formData.serviceType) {
      console.log('서비스 타입이 선택되지 않음');
      alert('서비스 유형을 선택해주세요.');
      throw new Error('서비스 유형을 선택해주세요.');
    }

    // 견적 계산
    const estimate = calculateEstimate(formData.serviceType);
    console.log('계산된 견적:', estimate);
    
    // 서비스 요청 데이터 생성
    const serviceRequestData = {
      customerId: user.uid,
      customerName: formData.applicantName,
      phone: formData.applicantPhone,
      serviceType: formData.serviceType,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      address: formData.address,
      region: formData.address,
      latitude: parseFloat(formData.lat) || 0,
      longitude: parseFloat(formData.lng) || 0,
      workDate: formData.workDate,
      details: {
        areaSize: formData.areaSize || '',
        graveCount: formData.graveCount || '',
        graveType: formData.graveType || ''
      },
      estimatedCost: {
        baseCost: estimate.baseCost,
        extraCostDetails: {
          areaExtra: estimate.areaExtra,
          graveExtra: estimate.graveExtra
        },
        totalCost: estimate.totalCost
      },
      termsAgreed: {
        privacy: privacyAgree.checked,
        service: termsAgree.checked,
        agreedAt: firebase.firestore.FieldValue.serverTimestamp()
      }
    };

    console.log('저장할 서비스 요청 데이터:', serviceRequestData);

    // Firestore에 저장
    const docRef = await firebase.firestore().collection('serviceRequests').add(serviceRequestData);
    console.log('저장된 문서 ID:', docRef.id);
    
    // 서비스 신청 성공 시 localStorage 데이터 삭제
    localStorage.removeItem('serviceRequestData');
    
    return docRef.id;
  } catch (error) {
    console.error('서비스 신청 오류:', error);
    alert(error.message || '서비스 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    throw error;
  }
}

// 견적서 생성 함수 수정
function generateEstimate() {
  const serviceType = document.querySelector('input[name="serviceType"]:checked')?.value;
  if (!serviceType) {
    console.error('서비스 타입이 선택되지 않았습니다.');
    return;
  }

  const estimateContent = document.getElementById('estimate-content');
  if (!estimateContent) {
    console.error('견적서 컨테이너를 찾을 수 없습니다.');
    return;
  }

  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`;
  
  const estimate = calculateEstimate(serviceType);
  
  let estimateHTML = `
    <div class="estimate-container">
      <div class="estimate-header text-center mb-4">
        <h3 class="mb-2">원스톱 벌초</h3>
        <h4 class="text-primary mb-3">예상 견적서</h4>
        <p class="text-muted">발행일: ${formattedDate}</p>
      </div>
      
      <div class="estimate-body">
        <div class="estimate-section mb-4">
          <h5 class="section-title">서비스 정보</h5>
          <div class="estimate-details">
            <div class="detail-row">
              <span class="detail-label">서비스 유형:</span>
              <span class="detail-value">${serviceType}</span>
            </div>
          </div>
        </div>
        
        <div class="estimate-section mb-4">
          <h5 class="section-title">신청자 정보</h5>
          <div class="estimate-details">
            <div class="detail-row">
              <span class="detail-label">신청자명:</span>
              <span class="detail-value">${document.getElementById('applicant-name')?.value || '-'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">연락처:</span>
              <span class="detail-value">${document.getElementById('applicant-phone')?.value || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="estimate-section mb-4">
          <h5 class="section-title">예상 견적</h5>
          <div class="estimate-details">
            <div class="detail-row">
              <span class="detail-label">기본 비용:</span>
              <span class="detail-value">${estimate.baseCost.toLocaleString()}원</span>
            </div>
            ${estimate.areaExtra > 0 ? `
            <div class="detail-row">
              <span class="detail-label">면적 추가 비용:</span>
              <span class="detail-value">${estimate.areaExtra.toLocaleString()}원</span>
            </div>
            ` : ''}
            ${estimate.graveExtra > 0 ? `
            <div class="detail-row">
              <span class="detail-label">묘지 수 추가 비용:</span>
              <span class="detail-value">${estimate.graveExtra.toLocaleString()}원</span>
            </div>
            ` : ''}
            <div class="detail-row total-price">
              <span class="detail-label">총 예상 금액:</span>
              <span class="detail-value">${estimate.totalCost.toLocaleString()}원</span>
            </div>
            <div class="estimate-note">
              <small class="text-muted">* 최종 견적은 현장 확인 후 결정됩니다.</small>
            </div>
          </div>
        </div>

        <div class="estimate-section">
          <h5 class="section-title">약관 동의</h5>
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="privacy-agree" name="privacy-agree">
            <label class="form-check-label" for="privacy-agree">
              <a href="#" data-bs-toggle="modal" data-bs-target="#privacyModal">개인정보 수집 및 이용</a>에 동의합니다.
            </label>
          </div>
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="terms-agree" name="terms-agree">
            <label class="form-check-label" for="terms-agree">
              <a href="#" data-bs-toggle="modal" data-bs-target="#serviceModal">서비스 이용약관</a>에 동의합니다.
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  estimateContent.innerHTML = estimateHTML;

  // 서비스 신청 버튼 표시
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.style.display = 'inline-flex';
    submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> 서비스 신청하기';
  }
}

// 견적 계산 함수 수정
function calculateEstimate(serviceType) {
  let baseCost = 0;
  let areaExtra = 0;
  let graveExtra = 0;
  
  // 기본 서비스 가격 계산
  switch(serviceType) {
    case '벌초':
      const graveType = document.getElementById('grave-type')?.value;
      const graveCount = document.getElementById('grave-count')?.value;
      const areaSize = document.getElementById('area-size')?.value;
      
      // 묘지 유형별 기본 가격
      const basePrices = {
        'mound': 150000,
        'individual': 200000,
        'joint': 250000
      };
      
      baseCost = basePrices[graveType] || 150000;
      
      // 묘지 수에 따른 추가 비용
      if (graveCount && graveCount !== 'custom') {
        graveExtra = (parseInt(graveCount) - 1) * 50000;
      }
      
      // 면적에 따른 추가 비용
      if (areaSize) {
        areaExtra = parseInt(areaSize) * 10000;
      }
      break;
      
    case '예초':
      const grassArea = document.getElementById('area-size')?.value;
      baseCost = 100000; // 기본 비용
      if (grassArea) {
        areaExtra = parseInt(grassArea) * 5000;
      }
      break;
      
    case '태양광 예초':
      const solarArea = document.getElementById('area-size')?.value;
      baseCost = 150000; // 기본 비용
      if (solarArea) {
        areaExtra = parseInt(solarArea) * 8000;
      }
      break;
      
    case '제초제 살포':
      const applicationArea = document.getElementById('area-size')?.value;
      baseCost = 80000; // 기본 비용
      if (applicationArea) {
        areaExtra = parseInt(applicationArea) * 3000;
      }
      break;
  }
  
  const totalCost = baseCost + areaExtra + graveExtra;
  
  return {
    baseCost,
    areaExtra,
    graveExtra,
    totalCost
  };
}

// 단계별 버튼 표시 함수 수정
function showStepButtons(step) {
  console.log('showStepButtons 호출됨, step:', step);
  
  const prevToStep1 = document.getElementById('prev-to-step1');
  const nextToStep2 = document.getElementById('next-to-step2');
  const prevToStep2 = document.getElementById('prev-to-step2');
  const nextToStep3 = document.getElementById('next-to-step3');
  const prevToStep3 = document.getElementById('prev-to-step3');
  const nextToStep4 = document.getElementById('next-to-step4');
  const prevToStep4 = document.getElementById('prev-to-step4');
  const submitBtn = document.getElementById('submit-btn');

  // 모든 버튼 숨기기
  [prevToStep1, nextToStep2, prevToStep2, nextToStep3, prevToStep3, 
   nextToStep4, prevToStep4, submitBtn].forEach(btn => {
    if (btn) btn.style.display = 'none';
  });

  // 현재 단계에 따라 버튼 표시
  switch(step) {
    case 1:
      if (nextToStep2) nextToStep2.style.display = 'inline-flex';
      break;
    case 2:
      if (prevToStep1) prevToStep1.style.display = 'inline-flex';
      if (nextToStep3) nextToStep3.style.display = 'inline-flex';
      break;
    case 3:
      if (prevToStep2) prevToStep2.style.display = 'inline-flex';
      if (nextToStep4) nextToStep4.style.display = 'inline-flex';
      break;
    case 4:
      if (prevToStep3) prevToStep3.style.display = 'inline-flex';
      if (submitBtn) {
        submitBtn.style.display = 'inline-flex';
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> 서비스 신청하기';
      }
      break;
  }

  console.log('버튼 상태 업데이트 완료');
}

// 묘지 유형 한글명 변환
function getGraveTypeName(type) {
  const graveTypes = {
    'mound': '일반 봉분묘',
    'individual': '평장묘',
    'joint': '공동묘지',
    'other': '기타'
  };
  return graveTypes[type] || '일반 봉분묘';
}

// 서비스별 상세 정보 수집 함수
function getServiceDetails(serviceType) {
  const details = {};
  
  switch(serviceType) {
    case '벌초':
      details.graveType = document.getElementById('grave-type').value;
      details.graveCount = document.getElementById('grave-count').value;
      details.areaSize = document.getElementById('area-size').value;
      break;
    case '예초':
      details.grassArea = document.getElementById('grass-area').value;
      details.workScope = document.getElementById('work-scope').value;
      break;
    case '태양광 예초':
      details.grassArea = document.getElementById('grass-area').value;
      details.workScope = document.getElementById('work-scope').value;
      break;
    case '제초제 살포':
      details.herbicideType = document.getElementById('herbicide-type').value;
      details.applicationArea = document.getElementById('application-area').value;
      details.areaSize = document.getElementById('area-size').value;
      break;
  }
  
  return details;
}

// 견적서 다운로드 함수
function downloadEstimate() {
  const estimateContent = document.querySelector('.estimate-container').cloneNode(true);
  
  // 다운로드 버튼과 공유 버튼 제거
  const actionsDiv = estimateContent.querySelector('.estimate-actions');
  if (actionsDiv) actionsDiv.remove();
  
  // 약관 동의 섹션 제거
  const termsSection = estimateContent.querySelector('.terms-section');
  if (termsSection) termsSection.remove();

  // PDF 옵션 설정
  const opt = {
    margin: 1,
    filename: `원스톱벌초_견적서_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: { 
      unit: 'cm', 
      format: 'a4', 
      orientation: 'portrait' 
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  // 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    .estimate-container {
      font-family: 'Noto Sans KR', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: white;
    }
    .estimate-header {
      border-bottom: 2px solid #1E88E5;
      padding-bottom: 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    .estimate-header h3 {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }
    .estimate-header h4 {
      font-size: 20px;
      font-weight: 600;
      color: #1E88E5;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding: 8px 0;
      border-bottom: 1px dashed #e0e0e0;
    }
    .detail-label {
      font-weight: 500;
      color: #555;
      font-size: 15px;
    }
    .detail-value {
      color: #333;
      font-size: 15px;
    }
    .total-price {
      font-size: 18px;
      font-weight: 600;
      color: #1E88E5;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #e0e0e0;
      border-bottom: none;
    }
    .estimate-note {
      margin-top: 15px;
      font-size: 13px;
      color: #666;
      text-align: right;
    }
    .estimate-footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
    }
    .company-info {
      font-size: 11px;
      color: #999;
      line-height: 1.4;
    }
  `;
  estimateContent.insertBefore(style, estimateContent.firstChild);

  // PDF 생성 및 다운로드
  html2pdf().set(opt).from(estimateContent).save();
} 