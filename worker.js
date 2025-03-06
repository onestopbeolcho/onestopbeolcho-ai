// /onestopbeolcho/worker.js
document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.firestore();
    const storage = firebase.storage();
    let map;
    let markers = [];
    let selectedMarker = null;
    let requests = [];
    let filteredRequests = [];
    let sortState = { field: null, direction: null };
  
    // 작업자 ID 및 지역 (하드코딩, 나중에 인증 로직으로 대체 가능)
    const workerId = "worker1"; // 작업자 ID
  
    // DOM 요소 참조
    const tableBody = document.querySelector('#request-table tbody');
    const workerMap = document.getElementById('worker-map');
    const workerMapContainer = document.querySelector('.worker-map');
    const toggleMapBtn = document.getElementById('toggle-map-btn');
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    const statusFilter = document.getElementById('status-filter');
    const serviceTypeFilter = document.getElementById('service-type-filter');
    const searchInput = document.getElementById('search-input');
  
    // 카카오맵 초기화
    kakao.maps.load(() => {
      const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567),
        level: 3
      };
      map = new kakao.maps.Map(workerMap, mapOption);
      map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
    });
  
    // URL 쿼리 파라미터에서 초기 상태 로드
    const urlParams = new URLSearchParams(window.location.search);
    statusFilter.value = urlParams.get('status') || 'all';
    serviceTypeFilter.value = urlParams.get('serviceType') || 'all';
    searchInput.value = urlParams.get('search') || '';
    const sortParam = urlParams.get('sort');
    if (sortParam) {
      const [field, direction] = sortParam.split('-');
      sortState = { field, direction };
      const sortHeader = document.querySelector(`th[data-sort="${field}"]`);
      if (sortHeader) {
        const sortIcon = sortHeader.querySelector('.sort-icon');
        sortIcon.innerHTML = direction === 'asc' ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
      }
    }
  
    // 작업자의 지역 정보 가져오기
    let workerRegion = '';
    db.collection('workers').doc(workerId).get().then(doc => {
      if (doc.exists) {
        workerRegion = doc.data().region || '서울'; // 기본값 설정
        loadRequests();
      } else {
        console.error('작업자 정보를 찾을 수 없습니다.');
        workerRegion = '서울'; // 기본값 설정
        loadRequests();
      }
    });
  
    // 신청 목록 로드 및 표시 (작업자 배정 및 지역 기준)
    function loadRequests() {
      db.collection('serviceRequests')
        .where('workerAssigned', '==', workerId)
        .where('region', '==', workerRegion)
        .onSnapshot(snapshot => {
          requests = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            requests.push(data);
          });
          filterAndSortRequests();
        });
    }
  
    // 지도 토글 버튼 이벤트
    toggleMapBtn.addEventListener('click', () => {
      if (workerMapContainer.style.display === 'none') {
        workerMapContainer.style.display = 'flex';
        toggleMapBtn.textContent = '지도 숨기기';
        setTimeout(() => map.relayout(), 0);
      } else {
        workerMapContainer.style.display = 'none';
        toggleMapBtn.textContent = '지도 보기';
      }
    });
  
    // 전체 CSV 다운로드 버튼 이벤트
    downloadCsvBtn.addEventListener('click', () => {
      let csvContent = '\uFEFF';
      const headers = ['고객명', '서비스 유형', '주소', '신청 날짜', '상태', '작업 상태'];
      csvContent += headers.join(',') + '\n';
  
      filteredRequests.forEach(request => {
        const createdAt = request.createdAt ? new Date(request.createdAt.toDate()).toISOString().split('T')[0] : '미지정';
        const row = [
          `"${request.customerName}"`,
          `"${request.serviceType}"`,
          `"${request.address}"`,
          `"${createdAt}"`,
          request.status === 'pending' ? '대기중' : '완료',
          request.workerStatus === 'not_started' ? '작업 시작 전' :
          request.workerStatus === 'started' ? '작업 시작' :
          request.workerStatus === 'in_progress' ? '작업 중' :
          request.workerStatus === 'completed' ? '작업 완료' : '미지정'
        ];
        csvContent += row.join(',') + '\n';
      });
  
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `작업리스트_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  
    // 테이블 렌더링
    function renderTable(requestsToRender) {
      tableBody.innerHTML = '';
      requestsToRender.forEach(request => {
        const createdAt = request.createdAt ? new Date(request.createdAt.toDate()).toISOString().split('T')[0] : '미지정';
        const row = document.createElement('tr');
        row.classList.add(request.status === 'pending' ? 'pending' : 'completed');
        row.innerHTML = `
          <td class="clickable">${request.customerName}</td>
          <td class="clickable">${request.serviceType}</td>
          <td>${request.address}</td>
          <td>${createdAt}</td>
          <td>${request.status === 'pending' ? '대기중' : '완료'}</td>
          <td>
            <select class="worker-status-select" data-id="${request.id}">
              <option value="not_started" ${request.workerStatus === 'not_started' ? 'selected' : ''}>작업 시작 전</option>
              <option value="started" ${request.workerStatus === 'started' ? 'selected' : ''}>작업 시작</option>
              <option value="in_progress" ${request.workerStatus === 'in_progress' ? 'selected' : ''}>작업 중</option>
              <option value="completed" ${request.workerStatus === 'completed' ? 'selected' : ''}>작업 완료</option>
            </select>
          </td>
          <td>
            ${request.workerAcceptance === 'pending' ? `
              <button class="accept-btn" data-id="${request.id}">수락</button>
              <button class="reject-btn" data-id="${request.id}">거부</button>
            ` : request.workerAcceptance === 'accepted' ? `
              <button class="upload-btn before-upload" data-id="${request.id}" data-type="before">작업 전 사진</button>
              <button class="upload-btn during-upload" data-id="${request.id}" data-type="during">작업 중 사진</button>
              <button class="upload-btn after-upload" data-id="${request.id}" data-type="after">작업 후 사진</button>
              <br>
              <textarea class="worker-notes-input" data-id="${request.id}" placeholder="고객에게 전달사항 입력 (예: 추가 비용 발생)">${request.workerNotes || ''}</textarea>
            ` : '작업 거부됨'}
          </td>
          <td>
            <button class="row-share-btn" data-id="${request.id}">링크 복사</button>
          </td>
        `;
  
        // 특정 셀 클릭 시 팝업 창 열기
        row.querySelectorAll('.clickable').forEach(cell => {
          cell.addEventListener('click', () => {
            const url = `/view-request.html?requestId=${request.id}`;
            window.open(url, 'RequestDetails', 'width=650,height=700,scrollbars=yes');
          });
        });
  
        tableBody.appendChild(row);
      });
  
      // 작업 수락 버튼 이벤트
      document.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          db.collection('serviceRequests').doc(id).update({
            workerAcceptance: 'accepted'
          });
        });
      });
  
      // 작업 거부 버튼 이벤트
      document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          db.collection('serviceRequests').doc(id).update({
            workerAcceptance: 'rejected',
            workerAssigned: '' // 작업 거부 시 작업자 배정 초기화
          });
        });
      });
  
      // 작업 상태 변경 이벤트
      document.querySelectorAll('.worker-status-select').forEach(select => {
        select.addEventListener('change', (e) => {
          e.stopPropagation();
          const id = select.getAttribute('data-id');
          const workerStatus = e.target.value;
          db.collection('serviceRequests').doc(id).update({
            workerStatus: workerStatus
          });
        });
      });
  
      // 사진 업로드 버튼 이벤트
      document.querySelectorAll('.upload-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const type = btn.getAttribute('data-type');
  
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = async (event) => {
            const files = Array.from(event.target.files);
            const uploadPromises = files.map(file => {
              const storageRef = storage.ref(`requests/${id}/${type}/${file.name}`);
              return storageRef.put(file).then(() => storageRef.getDownloadURL());
            });
  
            try {
              const urls = await Promise.all(uploadPromises);
              const field = `${type}Photos`;
              const docRef = db.collection('serviceRequests').doc(id);
              const doc = await docRef.get();
              const existingUrls = doc.data()[field] || [];
              const updatedUrls = [...existingUrls, ...urls];
              docRef.update({ [field]: updatedUrls });
            } catch (error) {
              console.error('사진 업로드 실패:', error);
              alert('사진 업로드에 실패했습니다.');
            }
          };
          input.click();
        });
      });
  
      // 전달사항 메모 입력 이벤트
      document.querySelectorAll('.worker-notes-input').forEach(textarea => {
        textarea.addEventListener('blur', (e) => {
          const id = textarea.getAttribute('data-id');
          const workerNotes = textarea.value;
          db.collection('serviceRequests').doc(id).update({
            workerNotes: workerNotes
          });
        });
      });
  
      // 개별 신청 링크 복사 이벤트
      document.querySelectorAll('.row-share-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          shareRequestLink(id);
        });
      });
    }
  
    // 링크 공유 함수
    function shareRequestLink(requestId) {
      const shareUrl = `${window.location.origin}/view-request.html?requestId=${requestId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('신청 링크가 클립보드에 복사되었습니다!');
      }).catch(err => {
        console.error('링크 복사 실패:', err);
        alert('링크 복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
      });
    }
  
    // 필터링 및 정렬 기능
    function filterAndSortRequests() {
      const status = statusFilter.value;
      const serviceType = serviceTypeFilter.value;
      const searchText = searchInput.value.toLowerCase();
  
      filteredRequests = [...requests];
  
      if (status !== 'all') {
        filteredRequests = filteredRequests.filter(request => request.status === status);
      }
  
      if (serviceType !== 'all') {
        filteredRequests = filteredRequests.filter(request => request.serviceType === serviceType);
      }
  
      if (searchText) {
        filteredRequests = filteredRequests.filter(request =>
          request.customerName.toLowerCase().includes(searchText) ||
          request.customerPhone?.toLowerCase().includes(searchText) ||
          request.address.toLowerCase().includes(searchText)
        );
      }
  
      if (sortState.field === 'createdAt') {
        filteredRequests.sort((a, b) => {
          const aDate = a.createdAt ? a.createdAt.toDate() : new Date(0);
          const bDate = b.createdAt ? b.createdAt.toDate() : new Date(0);
          return sortState.direction === 'asc' ? aDate - bDate : bDate - aDate;
        });
      }
  
      renderTable(filteredRequests);
      renderAllMarkers(filteredRequests);
  
      const params = new URLSearchParams();
      if (statusFilter.value !== 'all') params.set('status', statusFilter.value);
      if (serviceTypeFilter.value !== 'all') params.set('serviceType', statusFilter.value);
      if (searchInput.value) params.set('search', searchInput.value);
      if (sortState.field) params.set('sort', `${sortState.field}-${sortState.direction}`);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  
    // 모든 마커 표시
    function renderAllMarkers(requestsToRender) {
      markers.forEach(marker => marker.setMap(null));
      markers = [];
  
      requestsToRender.forEach(request => {
        if (request.latitude && request.longitude) {
          const position = new kakao.maps.LatLng(request.latitude, request.longitude);
          const marker = new kakao.maps.Marker({
            position: position,
            map: map
          });
  
          const infowindow = new kakao.maps.InfoWindow({
            content: `
              <div style="padding:5px; font-size:12px;">
                <strong>${request.customerName}</strong><br>
                ${request.serviceType} | ${request.status === 'pending' ? '대기중' : '완료'}<br>
                작업 상태: ${request.workerStatus === 'not_started' ? '작업 시작 전' :
                             request.workerStatus === 'started' ? '작업 시작' :
                             request.workerStatus === 'in_progress' ? '작업 중' :
                             request.workerStatus === 'completed' ? '작업 완료' : '미지정'}
              </div>
            `
          });
          kakao.maps.event.addListener(marker, 'click', () => {
            if (selectedMarker && selectedMarker.infowindow) {
              selectedMarker.infowindow.close();
            }
            infowindow.open(map, marker);
            map.panTo(position);
            selectedMarker = { marker, infowindow };
          });
  
          markers.push(marker);
        }
      });
    }
  
    // 정렬 이벤트 리스너
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        const sortIcon = th.querySelector('.sort-icon');
  
        if (sortState.field !== field) {
          sortState = { field, direction: 'desc' };
          sortIcon.innerHTML = '<i class="fas fa-arrow-down"></i>';
        } else if (sortState.direction === 'desc') {
          sortState.direction = 'asc';
          sortIcon.innerHTML = '<i class="fas fa-arrow-up"></i>';
        } else {
          sortState = { field: null, direction: null };
          sortIcon.innerHTML = '';
        }
  
        document.querySelectorAll('th.sortable .sort-icon').forEach(icon => {
          if (icon !== sortIcon) icon.innerHTML = '';
        });
  
        filterAndSortRequests();
      });
    });
  
    // 필터링 및 검색 이벤트 리스너
    statusFilter.addEventListener('change', filterAndSortRequests);
    serviceTypeFilter.addEventListener('change', filterAndSortRequests);
    searchInput.addEventListener('input', filterAndSortRequests);
  });