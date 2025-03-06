// /onestopbeolcho/app.js
function initializeAppWhenFirebaseReady(attempt = 0, maxAttempts = 100) {
  if (attempt >= maxAttempts) {
    console.error('Firebase SDK 로드 실패: 최대 재시도 횟수 초과. 앱 초기화 실패.');
    alert('Firebase SDK를 로드할 수 없습니다. 네트워크 상태를 확인하거나 나중에 다시 시도해주세요.');
    return;
  }

  if (typeof firebase === 'undefined' || !firebase.firestore || !firebase.storage) {
    console.log(`Firebase SDK 로드 대기 중... (시도 ${attempt + 1}/${maxAttempts})`);
    setTimeout(() => initializeAppWhenFirebaseReady(attempt + 1, maxAttempts), 100);
    return;
  }

  firebase.firestore().settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
  firebase.firestore().clearPersistence();
  
  const db = firebase.firestore();
  const storage = firebase.storage();
  let map, marker;
  let selectedPosition = null;
  let isSubmitting = false;
  let estimatedCost = 0;

  const serviceTypeSelect = document.getElementById('service-type');
  const beolchoFields = document.getElementById('beolcho-fields');
  const yechoFields = document.getElementById('yecho-fields');
  const solarFields = document.getElementById('solar-fields');
  const graveCountSelect = document.getElementById('grave-count');
  const graveCountCustom = document.getElementById('grave-count-custom');
  const beolchoAreaSizeInput = document.getElementById('beolcho-area-size');
  const areaSizeInput = document.getElementById('area-size');
  const solarAreaSizeInput = document.getElementById('solar-area-size');
  const yechoDisposeMethodSelect = document.getElementById('yecho-dispose-method');
  const solarDisposeMethodSelect = document.getElementById('solar-dispose-method');
  const addressSearchBtn = document.getElementById('address-search-btn');
  const addressInput = document.getElementById('address');
  const customerPhoneInput = document.getElementById('customer-phone');
  const submitBtn = document.getElementById('submit-btn');
  const confirmModal = document.getElementById('confirm-modal');
  const confirmSubmitBtn = document.getElementById('confirm-submit-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const mapAddressInfo = document.getElementById('map-address-info');
  const estimatedCostDiv = document.getElementById('estimated-cost');

  const mapContainer = document.getElementById('nv-map');
  kakao.maps.load(() => {
    const mapOption = {
      center: new kakao.maps.LatLng(37.566826, 126.9786567),
      level: 3
    };
    map = new kakao.maps.Map(mapContainer, mapOption);
    map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
    marker = new kakao.maps.Marker({
      position: map.getCenter(),
      draggable: true
    });
    marker.setMap(map);

    kakao.maps.event.addListener(marker, 'dragend', () => {
      const position = marker.getPosition();
      selectedPosition = {
        latitude: position.getLat(),
        longitude: position.getLng()
      };
      mapAddressInfo.innerText = `정확한 위치: 위도 ${position.getLat().toFixed(6)}, 경도 ${position.getLng().toFixed(6)}`;
    });

    kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
      const latlng = mouseEvent.latLng;
      marker.setPosition(latlng);
      selectedPosition = {
        latitude: latlng.getLat(),
        longitude: latlng.getLng()
      };
      mapAddressInfo.innerText = `정확한 위치: 위도 ${latlng.getLat().toFixed(6)}, 경도 ${latlng.getLng().toFixed(6)}`;
    });

    // loadPresetFromUrl(); // 임시로 주석 처리 (presets 접근 비활성화)
  });

  async function loadPresetFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const presetId = urlParams.get('preset');
    if (presetId) {
      const doc = await db.collection('presets').doc(presetId).get();
      if (doc.exists) {
        const data = doc.data();
        addressInput.value = data.address;
        selectedPosition = { latitude: data.latitude, longitude: data.longitude };
        marker.setPosition(new kakao.maps.LatLng(data.latitude, data.longitude));
        map.setCenter(new kakao.maps.LatLng(data.latitude, data.longitude));
        mapAddressInfo.innerText = `프리셋 주소: ${data.address}`;
        if (data.graveInfo) {
          document.getElementById('grave-type').value = data.graveInfo;
        }
      }
    }
  }

  customerPhoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3 && value.length <= 7) {
      value = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      value = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    e.target.value = value;
  });

  function calculateEstimatedCost() {
    const serviceType = serviceTypeSelect.value;
    let cost = 0;

    function calculateAreaCost(areaSize) {
      let areaCost = 0;
      if (areaSize <= 200) {
        areaCost = areaSize * 2200;
      } else if (areaSize <= 1000) {
        areaCost = (200 * 2200) + (areaSize - 200) * 650;
      } else if (areaSize <= 2000) {
        areaCost = 660000 + ((990000 - 660000) / (2000 - 1000)) * (areaSize - 1000);
      } else if (areaSize <= 3000) {
        areaCost = 990000 + ((1540000 - 990000) / (3000 - 2000)) * (areaSize - 2000);
      } else if (areaSize <= 4000) {
        areaCost = 1540000 + ((1760000 - 1540000) / (4000 - 3000)) * (areaSize - 3000);
      } else {
        areaCost = 1760000 + (areaSize - 4000) * 650;
      }

      if (areaSize === 1000) areaCost = 660000;
      else if (areaSize === 2000) areaCost = 990000;
      else if (areaSize === 3000) areaCost = 1540000;
      else if (areaSize === 4000) areaCost = 1760000;

      return Math.round(areaCost);
    }

    if (serviceType === '벌초') {
      const areaSize = parseInt(beolchoAreaSizeInput?.value) || 0;
      let graveCount = parseInt(graveCountSelect.value) || 0;
      if (graveCountSelect.value === '직접입력') {
        graveCount = parseInt(graveCountCustom?.value) || 0;
      }

      cost += calculateAreaCost(areaSize);
      if (graveCount > 0) {
        cost += 66000;
        if (graveCount > 1) {
          cost += (graveCount - 1) * 33000;
        }
      }
    } else if (serviceType === '예초') {
      const areaSize = parseInt(areaSizeInput?.value) || 0;
      const disposeMethod = yechoDisposeMethodSelect?.value || 'none';

      cost += calculateAreaCost(areaSize);
      if (disposeMethod === 'multiple') {
        cost += areaSize * 300;
      } else if (disposeMethod === 'single') {
        cost += areaSize * 500;
      } else if (disposeMethod === 'complete') {
        cost += areaSize * 1800;
      }
    } else if (serviceType === '태양광 전문 예초') {
      const areaSize = parseInt(solarAreaSizeInput?.value) || 0;
      const disposeMethod = solarDisposeMethodSelect?.value || 'none';

      cost += calculateAreaCost(areaSize);
      if (disposeMethod === 'multiple') {
        cost += areaSize * 300;
      } else if (disposeMethod === 'single') {
        cost += areaSize * 500;
      } else if (disposeMethod === 'complete') {
        cost += areaSize * 1800;
      }
    }

    estimatedCost = cost;
    const formattedCost = cost.toLocaleString('ko-KR');
    estimatedCostDiv.innerHTML = `
      예상 견적 비용: ${formattedCost}원
      <p style="font-size: 0.85em; color: #777; margin-top: 5px;">
        ※ 예상 견적이며, 정확한 비용은 현장 확인 후 변동될 수 있습니다.
      </p>
    `;
  }

  serviceTypeSelect.addEventListener('change', (e) => {
    const serviceType = e.target.value;
    const allFields = [beolchoFields, yechoFields, solarFields];
    allFields.forEach(field => {
      field.style.display = 'none';
      const inputs = field.querySelectorAll('[data-required="true"]');
      inputs.forEach(input => {
        input.removeAttribute('required');
      });
    });

    if (serviceType === '벌초') {
      beolchoFields.style.display = 'block';
      const beolchoInputs = beolchoFields.querySelectorAll('[data-required="true"]');
      beolchoInputs.forEach(input => input.setAttribute('required', ''));
    } else if (serviceType === '예초') {
      yechoFields.style.display = 'block';
      const yechoInputs = yechoFields.querySelectorAll('[data-required="true"]');
      yechoInputs.forEach(input => input.setAttribute('required', ''));
    } else if (serviceType === '태양광 전문 예초') {
      solarFields.style.display = 'block';
      const solarInputs = solarFields.querySelectorAll('[data-required="true"]');
      solarInputs.forEach(input => input.setAttribute('required', ''));
    }

    calculateEstimatedCost();
  });

  graveCountSelect.addEventListener('change', (e) => {
    if (e.target.value === '직접입력') {
      graveCountCustom.style.display = 'block';
      graveCountCustom.setAttribute('required', '');
    } else {
      graveCountCustom.style.display = 'none';
      graveCountCustom.removeAttribute('required');
    }
    calculateEstimatedCost();
  });

  if (beolchoAreaSizeInput) beolchoAreaSizeInput.addEventListener('input', calculateEstimatedCost);
  if (areaSizeInput) areaSizeInput.addEventListener('input', calculateEstimatedCost);
  if (solarAreaSizeInput) solarAreaSizeInput.addEventListener('input', calculateEstimatedCost);
  if (graveCountCustom) graveCountCustom.addEventListener('input', calculateEstimatedCost);
  if (yechoDisposeMethodSelect) yechoDisposeMethodSelect.addEventListener('change', calculateEstimatedCost);
  if (solarDisposeMethodSelect) solarDisposeMethodSelect.addEventListener('change', calculateEstimatedCost);

  addressSearchBtn.addEventListener('click', () => {
    new daum.Postcode({
      oncomplete: function(data) {
        const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        const jibun = data.jibunAddress;
        addressInput.value = `${addr} (${jibun.split(' ').pop()})`;

        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(addr, (result, status) => {
          if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
            map.setCenter(coords);
            marker.setPosition(coords);
            selectedPosition = {
              latitude: result[0].y,
              longitude: result[0].x
            };
            mapAddressInfo.innerText = `선택한 주소: ${addr} (${jibun.split(' ').pop()})`;
          }
        });
      }
    }).open();
  });

  const handleSubmitClick = () => {
    console.log('Submit button clicked');
    if (isSubmitting) return;
    const form = document.getElementById('service-form');
    if (form.checkValidity()) {
      if (!selectedPosition) {
        alert('지도에서 위치를 지정해주세요.');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = '제출 중...';
      confirmModal.style.display = 'block';
    } else {
      console.log('Form validation failed');
      form.reportValidity();
    }
  };

  submitBtn.removeEventListener('click', handleSubmitClick);
  submitBtn.addEventListener('click', handleSubmitClick);

  const handleCancelClick = () => {
    console.log('Cancel button clicked');
    confirmModal.style.display = 'none';
    submitBtn.disabled = false;
    submitBtn.textContent = '신청 제출';
  };

  cancelModalBtn.removeEventListener('click', handleCancelClick);
  cancelModalBtn.addEventListener('click', handleCancelClick);

  const handleConfirmSubmitClick = async () => {
    console.log('Confirm submit button clicked');
    if (isSubmitting) return;
    isSubmitting = true;

    confirmSubmitBtn.disabled = true;
    confirmSubmitBtn.textContent = '제출 중...';

    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerPassword = document.getElementById('customer-password').value;
    const address = addressInput.value;
    const serviceType = serviceTypeSelect.value;
    const workDate = document.getElementById('work-date').value;
    const workerRequest = document.getElementById('worker-request').value;
    const requestFiles = document.getElementById('request-files').files;

    calculateEstimatedCost();

    const user = firebase.auth().currentUser;
    const userId = user ? user.uid : null;
    console.log('Submitting with userId:', userId);

    if (!userId) {
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      window.location.href = '/login.html';
      isSubmitting = false;
      confirmSubmitBtn.disabled = false;
      confirmSubmitBtn.textContent = '확인';
      submitBtn.disabled = false;
      submitBtn.textContent = '신청 제출';
      confirmModal.style.display = 'none';
      return;
    }

    let serviceData = {
      customerName,
      customerPhone,
      customerPassword,
      address,
      serviceType,
      workDate,
      workerRequest: workerRequest || '없음',
      userId: userId,
      latitude: selectedPosition.latitude,
      longitude: selectedPosition.longitude,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      workerAssigned: '',
      estimatedCost: estimatedCost
    };

    if (serviceType === '벌초') {
      const graveType = document.getElementById('grave-type').value;
      const graveCount = graveCountSelect.value === '직접입력' 
        ? document.getElementById('grave-count-custom').value 
        : graveCountSelect.value;
      const beolchoAreaSize = document.getElementById('beolcho-area-size').value;
      serviceData.graveType = graveType;
      serviceData.graveCount = graveCount;
      serviceData.beolchoAreaSize = beolchoAreaSize;
    } else if (serviceType === '예초') {
      const areaSize = document.getElementById('area-size').value;
      const disposeMethod = yechoDisposeMethodSelect.value;
      serviceData.areaSize = areaSize;
      serviceData.grassDisposalMethod = disposeMethod;
    } else if (serviceType === '태양광 전문 예초') {
      const areaSize = document.getElementById('solar-area-size').value;
      const disposeMethod = solarDisposeMethodSelect.value;
      serviceData.solarAreaSize = areaSize;
      serviceData.grassDisposalMethod = disposeMethod;
    }

    try {
      console.log('Attempting to save serviceData:', serviceData);
      const docRef = await db.collection('serviceRequests').add(serviceData);
      console.log('Service request saved with ID:', docRef.id, 'userId:', userId);

      // 파일 업로드 (선택적, 테스트 위해 주석 처리 가능)
      if (requestFiles.length > 0) {
        const uploadPromises = Array.from(requestFiles).map(file => {
          const storageRef = storage.ref(`requests/${docRef.id}/${file.name}`);
          return storageRef.put(file).then(() => storageRef.getDownloadURL());
        });
        const fileUrls = await Promise.all(uploadPromises);
        await docRef.update({ fileUrls });
      }

      alert('신청이 성공적으로 제출되었습니다!');
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('신청 제출 실패: ' + error.message);
    } finally {
      isSubmitting = false;
      confirmSubmitBtn.disabled = false;
      confirmSubmitBtn.textContent = '확인';
      submitBtn.disabled = false;
      submitBtn.textContent = '신청 제출';
      confirmModal.style.display = 'none';
      document.getElementById('service-form').reset();
      beolchoFields.style.display = 'none';
      yechoFields.style.display = 'none';
      solarFields.style.display = 'none';
      marker.setPosition(null);
      mapAddressInfo.innerText = '';
      selectedPosition = null;
      calculateEstimatedCost();
    }
  };

  confirmSubmitBtn.removeEventListener('click', handleConfirmSubmitClick);
  confirmSubmitBtn.addEventListener('click', handleConfirmSubmitClick);
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAppWhenFirebaseReady();
});