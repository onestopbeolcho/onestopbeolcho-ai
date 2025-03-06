// /onestopbeolcho/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.firestore();
    const storage = firebase.storage();
    let map;
    let markers = [];
    let selectedMarker = null;
    let workers = [];
    let requests = [];
    let filteredRequests = [];
    let sortState = { field: null, direction: null };
  
    // DOM 요소 참조
    const tableBody = document.querySelector('#request-table tbody');
    const adminMap = document.getElementById('admin-map');
    const adminMapContainer = document.querySelector('.admin-map');
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
      map = new kakao.maps.Map(adminMap, mapOption);
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
  
    // 작업자 목록 로드
    db.collection('workers').onSnapshot(snapshot => {
      workers = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        workers.push(data);
      });
      renderTable(filteredRequests);
    });
  
    // 신청 목록 로드 및 표시
    db.collection('serviceRequests').onSnapshot(snapshot => {
      requests = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        requests.push(data);
      });
      filterAndSortRequests();
    });
  
    // 지도 토글 버튼 이벤트
    toggleMapBtn.addEventListener('click', () => {
      if (adminMapContainer.style.display === 'none') {
        adminMapContainer.style.display = 'flex';
        toggleMapBtn.textContent = '지도 숨기기';
        setTimeout(() => map.relayout(), 0);
      } else {
        adminMapContainer.style.display = 'none';
        toggleMapBtn.textContent = '지도 보기';
      }
    });
  
    // 전체 CSV 다운로드 버튼 이벤트
    downloadCsvBtn.addEventListener('click', () => {
      let csvContent = '\uFEFF';
      const headers = ['고객명', '서비스 유형', '주소', '신청 날짜', '상태', '작업자'];
      csvContent += headers.join(',') + '\n';
  
      filteredRequests.forEach(request => {
        const createdAt = request.createdAt ? new Date(request.createdAt.toDate()).toISOString().split('T')[0] : '미지정';
        const workerName = workers.find(w => w.workerId === request.workerAssigned)?.name || '미배정';
        const row = [
          `"${request.customerName}"`,
          `"${request.serviceType}"`,
          `"${request.address}"`,
          `"${createdAt}"`,
          request.status === 'pending' ? '대기중' : '완료',
          `"${workerName}"`
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
            <select class="worker-select" data-id="${request.id}">
              <option value="">미배정</option>
              ${workers.map(worker => `
                <option value="${worker.workerId}" ${request.workerAssigned === worker.workerId ? 'selected' : ''}>
                  ${worker.name}
                </option>
              `).join('')}
            </select>
          </td>
          <td>
            <button class="status-btn ${request.status}" data-id="${request.id}">
              ${request.status === 'pending' ? '완료 처리' : '대기 처리'}
            </button>
            <button class="delete-btn" data-id="${request.id}">삭제</button>
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
  
      // 상태 변경 버튼 이벤트
      document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const request = requests.find(r => r.id === id);
          const newStatus = request.status === 'pending' ? 'completed' : 'pending';
          db.collection('serviceRequests').doc(id).update({ status: newStatus });
        });
      });
  
      // 삭제 버튼 이벤트
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('이 신청을 삭제하시겠습니까?')) {
            const id = btn.getAttribute('data-id');
            db.collection('serviceRequests').doc(id).delete();
          }
        });
      });
  
      // 작업자 배정 이벤트
      document.querySelectorAll('.worker-select').forEach(select => {
        select.addEventListener('change', (e) => {
          e.stopPropagation();
          const id = select.getAttribute('data-id');
          const workerId = e.target.value;
          db.collection('serviceRequests').doc(id).update({ workerAssigned: workerId });
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
                작업자: ${workers.find(w => w.workerId === request.workerAssigned)?.name || '미배정'}
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