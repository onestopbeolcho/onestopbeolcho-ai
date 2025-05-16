import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, serverTimestamp, addDoc } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM 요소
const profileImage = document.getElementById('profile-image');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userPhone = document.getElementById('user-phone');
const userJoinDate = document.getElementById('user-join-date');
const serviceRequestsList = document.getElementById('serviceRequestsList');
const profileUpload = document.getElementById('profile-upload');
const changePasswordBtn = document.querySelector('.change-password-btn');
const passwordModal = document.querySelector('.password-change-modal');
const closePasswordModal = document.querySelector('.close-password-modal');
const passwordForm = document.querySelector('.password-form');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

// 페이지네이션 설정
const ITEMS_PER_PAGE = 5;
let currentPage = 1;
let currentStatus = 'all';
let currentSearch = '';

// 재신청 모달 관련 변수
let reRequestModal;
let changeWorkerModal;
let currentServiceId = null;
let currentWorkerId = null;

// 피드백 모달 초기화
let feedbackModal;

// 결제 내역 관리
let currentReceiptId = null;

// 카카오맵 관련 변수들
let kakaoMap = null;
let mapMarker = null;

// 주소를 위도/경도로 변환하는 지오코더
let geocoder = null;

// 주소로 지도 표시
function showMapForAddress(address) {
  // 모달 열기
  const mapModal = new bootstrap.Modal(document.getElementById('mapModal'));
  mapModal.show();

  // 지도 컨테이너
  const mapContainer = document.getElementById('kakaoMap');
  
  // 지도 초기화
  if (!kakaoMap) {
    // 초기 위치 (서울 중심)
    const defaultPosition = new kakao.maps.LatLng(37.566826, 126.9786567);
    
    // 지도 옵션
    const mapOptions = {
      center: defaultPosition,
      level: 3
    };

    // 지도 생성
    kakaoMap = new kakao.maps.Map(mapContainer, mapOptions);

    // 지오코더 초기화
    geocoder = new kakao.maps.services.Geocoder();

    // 지도 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
    
    // 지도 타입 컨트롤 추가
    const mapTypeControl = new kakao.maps.MapTypeControl();
    kakaoMap.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
  }

  // 주소로 좌표 검색
  geocoder.addressSearch(address, function(result, status) {
    // 정상적으로 검색이 완료됐으면
    if (status === kakao.maps.services.Status.OK) {
      // 검색된 좌표
      const coords = new kakao.maps.LatLng(result[0].y, result[0].x);

      // 기존 마커가 있으면 제거
      if (mapMarker) {
        mapMarker.setMap(null);
      }

      // 결과값으로 받은 위치에 마커 표시
      mapMarker = new kakao.maps.Marker({
        map: kakaoMap,
        position: coords
      });

      // 인포윈도우로 장소에 대한 설명 표시
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="width:150px;text-align:center;padding:6px 0;">${address}</div>`
      });
      infowindow.open(kakaoMap, mapMarker);

      // 지도 중심을 결과값으로 받은 위치로 이동
      kakaoMap.setCenter(coords);
      
      // 위성 지도로 자동 변경
      kakaoMap.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
    } else {
      alert('주소를 찾을 수 없습니다. 다시 시도해주세요.');
    }
  });
}

// 지도 유형 전환 버튼 이벤트
document.getElementById('toggleMapType').addEventListener('click', function() {
  if (kakaoMap) {
    // 현재 지도 타입
    const currentType = kakaoMap.getMapTypeId();
    
    // 지도 타입 전환
    if (currentType === kakao.maps.MapTypeId.HYBRID) {
      kakaoMap.setMapTypeId(kakao.maps.MapTypeId.ROADMAP); // 일반 지도로 전환
    } else {
      kakaoMap.setMapTypeId(kakao.maps.MapTypeId.HYBRID); // 위성 지도로 전환
    }
  }
});

// 길찾기 버튼 이벤트
document.getElementById('findRoute').addEventListener('click', function() {
  if (mapMarker) {
    const position = mapMarker.getPosition();
    
    // 카카오맵 길찾기 URL 열기 (모바일에서는 카카오맵 앱 열림)
    const url = `https://map.kakao.com/link/to,${position.getLat()},${position.getLng()}`;
    window.open(url, '_blank');
  } else {
    alert('먼저 위치를 지정해주세요.');
  }
});

// 사용자 인증 상태 확인
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        console.log('현재 로그인한 사용자 정보:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        });
        
        // 사용자 정보 표시
        userName.textContent = user.displayName || '이름 없음';
        userEmail.textContent = user.email || '이메일 없음';

        // Firestore에서 추가 사용자 정보 로드
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        console.log('Firestore 사용자 문서:', userDoc.exists() ? userDoc.data() : '문서 없음');
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('사용자 데이터:', userData);
            
            if (userData.displayName) userName.textContent = userData.displayName;
            if (userData.photoURL) profileImage.src = userData.photoURL;
            if (userData.phone) userPhone.textContent = userData.phone;
            if (userData.createdAt) {
                const joinDate = userData.createdAt.toDate();
                console.log('가입일:', joinDate);
                userJoinDate.textContent = joinDate.toLocaleDateString('ko-KR');
            }
        }

        // 서비스 요청 목록 로드
        await loadServiceRequests(user.uid);
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        showAlert('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    }
});

// 서비스 요청 목록 로드
async function loadServiceRequests(userId) {
    console.log('서비스 요청 조회 시작 - 사용자 ID:', userId);
    try {
        const serviceRequestsRef = collection(db, 'serviceRequests');
        const q = query(
            serviceRequestsRef,
            where('customerId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        
        console.log('Firestore 쿼리 실행:', {
            collection: 'serviceRequests',
            where: ['customerId', '==', userId],
            orderBy: ['createdAt', 'desc']
        });
        
        const snapshot = await getDocs(q);
        console.log('조회된 서비스 요청 수:', snapshot.size);

        if (snapshot.empty) {
            console.log('서비스 요청 없음');
            serviceRequestsList.innerHTML = '<div class="text-center p-4">서비스 신청 내역이 없습니다.</div>';
            return;
        }

        const requests = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('서비스 요청 데이터:', {
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toDate() : null
            });
            return { id: doc.id, ...data };
        });
        
        renderServiceRequests(requests);

    } catch (error) {
        console.error('서비스 요청 목록 로드 오류:', error);
        if (error.code === 'failed-precondition') {
            const indexLink = error.message.match(/https:\/\/console\.firebase\.google\.com[^"]+/);
            if (indexLink) {
                console.error('필요한 인덱스를 생성하려면 다음 링크를 클릭하세요:', indexLink[0]);
                serviceRequestsList.innerHTML = `
                    <div class="alert alert-warning">
                        <p>서비스 요청 목록을 불러오기 위해 인덱스가 필요합니다.</p>
                        <p>다음 링크를 클릭하여 인덱스를 생성해주세요:</p>
                        <a href="${indexLink[0]}" target="_blank" class="btn btn-primary">인덱스 생성하기</a>
                    </div>
                `;
            }
        } else {
            serviceRequestsList.innerHTML = '<div class="alert alert-danger">데이터를 불러오는 중 오류가 발생했습니다.</div>';
        }
    }
}

// 서비스 요청 목록 렌더링
function renderServiceRequests(requests) {
    console.log('렌더링할 서비스 요청 목록:', requests);
    let html = '';
    
    requests.forEach(request => {
        console.log('개별 서비스 요청 데이터:', request);
        const statusClass = getStatusClass(request.status);
        const date = request.createdAt ? 
            new Date(request.createdAt.toDate()).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '날짜 정보 없음';

        html += `
            <div class="service-request-card">
                <div class="service-request-header">
                    <h5 class="service-request-title">${request.serviceType || '서비스 유형 없음'}</h5>
                    <span class="service-request-status ${statusClass}">${getStatusText(request.status)}</span>
                </div>
                <div class="service-request-details">
                    <div class="detail-section">
                        <h6><i class="fas fa-info-circle"></i> 기본 정보</h6>
                        <p><i class="fas fa-user"></i> 신청자: ${request.applicantName || '이름 없음'}</p>
                        <p><i class="fas fa-phone"></i> 연락처: ${request.applicantPhone || '연락처 없음'}</p>
                        <p><i class="fas fa-map-marker-alt"></i> 주소: ${request.address || '주소 없음'}</p>
                        <p><i class="fas fa-calendar"></i> 희망 작업일: ${request.workDate || '날짜 없음'}</p>
                    </div>
                    <div class="detail-section">
                        <h6><i class="fas fa-calculator"></i> 서비스 상세</h6>
                        <p><i class="fas fa-ruler"></i> 면적: ${request.areaSize || '0'}평</p>
                        <p><i class="fas fa-monument"></i> 묘지 수: ${request.graveCount || '0'}기</p>
                        <p><i class="fas fa-tag"></i> 묘지 유형: ${getGraveTypeText(request.graveType)}</p>
                    </div>
                </div>
                <div class="service-request-actions">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            ${request.status === 'pending' ? `
                                <button class="btn btn-sm btn-outline-danger" data-action="cancel" data-id="${request.id}">
                                    <i class="fas fa-times"></i> 취소
                                </button>
                            ` : ''}
                            ${request.status === 'completed' ? `
                                <button class="btn btn-sm btn-outline-success" data-action="reapply" data-id="${request.id}">
                                    <i class="fas fa-redo"></i> 재신청
                                </button>
                            ` : ''}
                        </div>
                        <div class="additional-service-buttons">
                            <button class="btn btn-outline-success btn-sm" onclick="requestAdditionalService('${request.id}', 'weeding')">
                                벌초 신청
                            </button>
                            <button class="btn btn-outline-success btn-sm ms-2" onclick="requestAdditionalService('${request.id}', 'herbicide')">
                                제초제 살포 신청
                            </button>
                            <button class="btn btn-outline-success btn-sm ms-2" onclick="requestAdditionalService('${request.id}', 'tree')">
                                벌목 신청
                            </button>
                            <button class="btn btn-outline-success btn-sm ms-2" onclick="requestAdditionalService('${request.id}', 'other')">
                                기타 추가 서비스 신청
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    serviceRequestsList.innerHTML = html;

    // 이벤트 리스너 등록
    serviceRequestsList.querySelectorAll('button[data-action]').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.closest('button').dataset.action;
            const id = e.target.closest('button').dataset.id;
            
            if (action === 'cancel') {
                cancelServiceRequest(id);
            } else if (action === 'reapply') {
                reapplyService(id);
            }
        });
    });
}

// 페이지네이션 렌더링
function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    let html = '';

    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">이전</a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">다음</a>
        </li>
    `;

    pagination.innerHTML = html;

    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                loadServiceRequests(auth.currentUser.uid);
            }
        });
    });
}

// 빈 상태 표시
function showEmptyState() {
    serviceRequestsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-list"></i>
            <h3>서비스 내역이 없습니다</h3>
            <p>아직 서비스를 신청하지 않았습니다. 서비스를 신청하면 이곳에서 확인할 수 있습니다.</p>
            <a href="request.html" class="btn btn-primary">서비스 신청하기</a>
        </div>
    `;
}

// 에러 상태 표시
function showErrorState() {
    serviceRequestsList.innerHTML = `
        <div class="alert alert-danger">
            서비스 요청 목록을 불러오는 중 오류가 발생했습니다.
        </div>
    `;
}

// 묘지 유형 한글명 변환 함수
function getGraveTypeText(type) {
    const graveTypes = {
        'mound': '일반 봉분묘',
        'individual': '평장묘',
        'joint': '공동묘지'
    };
    return graveTypes[type] || type;
}

// 상태 텍스트 변환 함수
function getStatusText(status) {
    const statusTexts = {
        'pending': '대기중',
        'confirmed': '확인됨',
        'in_progress': '진행중',
        'completed': '완료',
        'cancelled': '취소됨'
    };
    return statusTexts[status] || status;
}

// 상태 클래스 반환 함수
function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'in_progress': 'status-progress',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || '';
}

// 서비스 요청 취소
async function cancelServiceRequest(requestId) {
    if (!confirm('정말로 서비스 신청을 취소하시겠습니까?')) {
        return;
    }

    try {
        const requestRef = doc(db, 'serviceRequests', requestId);
        await updateDoc(requestRef, {
            status: 'cancelled',
            updatedAt: serverTimestamp()
        });

        alert('서비스 신청이 취소되었습니다.');
        loadServiceRequests(auth.currentUser.uid);
    } catch (error) {
        console.error('서비스 취소 오류:', error);
        alert('서비스 취소 중 오류가 발생했습니다.');
    }
}

// 프로필 이미지 업로드
profileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image/*')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인되지 않았습니다.');

        const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        profileImage.src = downloadURL;
        await updateDoc(doc(db, 'users', user.uid), {
            photoURL: downloadURL,
            updatedAt: serverTimestamp()
        });

        alert('프로필 이미지가 업데이트되었습니다.');
    } catch (error) {
        console.error('이미지 업로드 오류:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
    }
});

// 비밀번호 변경 모달
changePasswordBtn.addEventListener('click', () => {
    const passwordChangeModal = new bootstrap.Modal(document.getElementById('passwordChangeModal'));
    passwordChangeModal.show();
});

closePasswordModal.addEventListener('click', () => {
    const passwordChangeModal = bootstrap.Modal.getInstance(document.getElementById('passwordChangeModal'));
    passwordChangeModal.hide();
});

passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('모든 필드를 입력해주세요.', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('새 비밀번호가 일치하지 않습니다.', 'warning');
        return;
    }

    if (newPassword.length < 6) {
        showAlert('비밀번호는 최소 6자 이상이어야 합니다.', 'warning');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인되지 않았습니다.');

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        passwordForm.reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('passwordChangeModal'));
        modal.hide();

        showAlert('비밀번호가 성공적으로 변경되었습니다.', 'success');
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        if (error.code === 'auth/wrong-password') {
            showAlert('현재 비밀번호가 올바르지 않습니다.', 'error');
        } else {
            showAlert('비밀번호 변경 중 오류가 발생했습니다: ' + error.message, 'error');
        }
    }
});

// 알림 표시 함수
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.mypage-container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

// 재신청 기능
async function reapplyService(serviceId) {
    try {
        const serviceRef = doc(db, 'serviceRequests', serviceId);
        const serviceDoc = await getDoc(serviceRef);
        
        if (!serviceDoc.exists()) throw new Error('서비스 요청을 찾을 수 없습니다.');

        const serviceData = serviceDoc.data();
        const newServiceData = {
            ...serviceData,
            customerId: auth.currentUser.uid,
            status: 'pending',
            createdAt: serverTimestamp(),
            isReapplication: true,
            originalRequestId: serviceId
        };

        await addDoc(collection(db, 'serviceRequests'), newServiceData);
        alert('재신청이 완료되었습니다.');
        loadServiceRequests(auth.currentUser.uid);
    } catch (error) {
        console.error('재신청 오류:', error);
        alert('재신청 중 오류가 발생했습니다.');
    }
}

// 모달 초기화
document.addEventListener('DOMContentLoaded', () => {
    reRequestModal = new bootstrap.Modal(document.getElementById('reRequestModal'));
    changeWorkerModal = new bootstrap.Modal(document.getElementById('changeWorkerModal'));

    document.getElementById('submitReRequest').addEventListener('click', submitReRequest);
    document.getElementById('change-worker-btn').addEventListener('click', showChangeWorkerModal);
    document.getElementById('submitChangeRequest').addEventListener('click', submitChangeRequest);
    document.getElementById('submitFeedback').addEventListener('click', handleFeedbackSubmit);

    // 비밀번호 변경 버튼 이벤트 리스너
    const changePasswordButton = document.getElementById('changePasswordButton');
    if (changePasswordButton) {
        changePasswordButton.addEventListener('click', handlePasswordChange);
    }
});

// 재신청 제출
async function submitReRequest() {
    try {
        const form = document.getElementById('reRequestForm');
        const formData = new FormData(form);
        const user = auth.currentUser;

        const requestData = {
            userId: user.uid,
            serviceType: formData.get('serviceType'),
            serviceCategory: formData.get('serviceCategory'),
            quantity: parseInt(formData.get('quantity')),
            preferredDate: formData.get('preferredDate'),
            notes: formData.get('notes'),
            requestDate: new Date(),
            status: 'pending',
            previousServiceId: currentServiceId,
            previousWorkerId: currentWorkerId,
            isReRequest: true
        };

        await addDoc(collection(db, 'serviceRequests'), requestData);
        reRequestModal.hide();
        showAlert('서비스가 재신청되었습니다.', 'success');
        loadServiceRequests(user.uid);
    } catch (error) {
        console.error('재신청 제출 중 오류:', error);
        showAlert('재신청 처리 중 오류가 발생했습니다.', 'error');
    }
}

// 작업자 변경 요청 모달 표시
function showChangeWorkerModal() {
    changeWorkerModal.show();
}

// 작업자 변경 요청 제출
async function submitChangeRequest() {
    try {
        const form = document.getElementById('changeWorkerForm');
        const formData = new FormData(form);
        const user = auth.currentUser;

        const changeRequestData = {
            userId: user.uid,
            serviceId: currentServiceId,
            currentWorkerId: currentWorkerId,
            reason: formData.get('changeReason'),
            requestDate: new Date(),
            status: 'pending'
        };

        await addDoc(collection(db, 'workerChangeRequests'), changeRequestData);
        changeWorkerModal.hide();
        reRequestModal.hide();
        showAlert('작업자 변경 요청이 접수되었습니다.', 'success');
    } catch (error) {
        console.error('작업자 변경 요청 제출 중 오류:', error);
        showAlert('작업자 변경 요청 처리 중 오류가 발생했습니다.', 'error');
    }
}

// 피드백 제출 처리
async function handleFeedbackSubmit() {
    try {
        const serviceId = document.getElementById('feedbackServiceId').value;
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const comment = document.getElementById('feedbackComment').value;
        const recommend = document.getElementById('recommendWorker').checked;

        if (!rating) {
            showAlert('평점을 선택해주세요.', 'warning');
            return;
        }

        await updateDoc(doc(db, 'serviceRequests', serviceId), {
            rating: parseInt(rating),
            feedback: comment,
            recommendWorker: recommend,
            feedbackDate: serverTimestamp()
        });

        feedbackModal.hide();
        showAlert('평가가 등록되었습니다.', 'success');
        loadServiceRequests(auth.currentUser.uid);
    } catch (error) {
        console.error('피드백 제출 중 오류:', error);
        showAlert('평가 등록 중 오류가 발생했습니다.', 'error');
    }
}

// 피드백 모달 표시
function showFeedbackModal(serviceId) {
    document.getElementById('feedbackServiceId').value = serviceId;
    feedbackModal = new bootstrap.Modal(document.getElementById('feedbackModal'));
    feedbackModal.show();
}

// 서비스 요청 카드 생성 함수 수정
function createServiceRequestCard(request) {
    console.log('카드 생성 데이터:', request);
    const statusClass = getStatusClass(request.status);

    // 생성 날짜 포맷팅
    const date = request.createdAt ? 
        new Date(request.createdAt.toDate()).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '날짜 정보 없음';

    // 희망 날짜 포맷팅
    const preferredDate = request.preferredDate ? 
        new Date(request.preferredDate).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '날짜 정보 없음';

    // 서비스 요청 카드 생성
    const card = document.createElement('div');
    card.className = 'service-request-card';
    card.innerHTML = `
        <div class="service-request-header">
            <h5 class="service-request-title">${request.serviceType ? getServiceTypeText(request.serviceType) : '서비스 유형 없음'}</h5>
            <span class="service-request-status ${statusClass}">${getStatusText(request.status)}</span>
        </div>
        <div class="service-request-details">
            <div class="detail-section">
                <h6><i class="fas fa-info-circle"></i> 기본 정보</h6>
                <p><i class="fas fa-user"></i> 신청자: ${request.applicantName || '이름 없음'}</p>
                <p><i class="fas fa-phone"></i> 연락처: ${request.applicantPhone || '연락처 없음'}</p>
                <p>
                    <i class="fas fa-map-marker-alt"></i> 주소: ${request.address || '주소 없음'}
                    <button class="btn btn-sm btn-outline-primary view-map-btn" data-address="${request.address || ''}">
                        <i class="fas fa-map"></i> 지도 보기
                    </button>
                </p>
                <p><i class="fas fa-calendar"></i> 신청일: ${date}</p>
                <p><i class="fas fa-clock"></i> 희망 작업일: ${preferredDate}</p>
            </div>
            <div class="detail-section">
                <h6><i class="fas fa-clipboard-list"></i> 서비스 정보</h6>
                <p><i class="fas fa-ruler"></i> 면적: ${request.areaSize || '0'}평</p>
                <p><i class="fas fa-tag"></i> 서비스 범위: ${request.serviceScope || '정보 없음'}</p>
                <p><i class="fas fa-money-bill-wave"></i> 예상 비용: ${request.estimatedCost ? formatCurrency(request.estimatedCost) : '미정'}</p>
            </div>
            <div class="detail-section">
                <h6><i class="fas fa-comment-alt"></i> 요청 사항</h6>
                <p><i class="fas fa-exclamation-circle"></i> 특별 요청: ${request.specialRequests || '없음'}</p>
                <p><i class="fas fa-plus-circle"></i> 추가 요청: ${request.additionalRequests || '없음'}</p>
                <p><i class="fas fa-clipboard-check"></i> 상세 내용: ${request.notes || '없음'}</p>
            </div>
        </div>
        <div class="service-request-actions">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    ${request.status === 'pending' ? `
                        <button class="btn btn-sm btn-outline-danger" data-action="cancel" data-id="${request.id}">
                            <i class="fas fa-times"></i> 취소
                        </button>
                        <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${request.id}">
                            <i class="fas fa-edit"></i> 정보 수정
                        </button>
                    ` : ''}
                    ${request.estimateStatus === 'pending' && request.status === 'pending' ? `
                        <button class="btn btn-sm btn-outline-info" data-action="show-estimate" data-id="${request.id}">
                            <i class="fas fa-file-invoice-dollar"></i> 견적 확인
                        </button>
                    ` : ''}
                </div>
                <div class="additional-service-buttons">
                    <button class="btn btn-outline-success btn-sm" onclick="requestAdditionalService('${request.id}', 'weeding')">
                        벌초 신청
                    </button>
                    <button class="btn btn-outline-success btn-sm ms-2" onclick="requestAdditionalService('${request.id}', 'herbicide')">
                        제초제 살포 신청
                    </button>
                    <button class="btn btn-outline-success btn-sm ms-2" onclick="requestAdditionalService('${request.id}', 'tree')">
                        벌목 신청
                    </button>
                    <button class="btn btn-outline-success btn-sm ms-2" onclick="requestAdditionalService('${request.id}', 'other')">
                        기타 추가 서비스 신청
                    </button>
                </div>
            </div>
        </div>
    `;

    // 지도 보기 버튼 이벤트 리스너 추가
    const mapButtons = card.querySelectorAll('.view-map-btn');
    mapButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const address = button.getAttribute('data-address');
            if (address) {
                showMapForAddress(address);
            } else {
                alert('주소 정보가 없습니다.');
            }
        });
    });

    return card;
}

// 금액 포맷팅 함수
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

// 서비스 유형 텍스트 변환 함수
function getServiceTypeText(type) {
    const typeMap = {
        'weeding': '벌초',
        'herbicide': '제초제 살포',
        'tree': '벌목',
        'other': '기타 서비스'
    };
    return typeMap[type] || type;
}

// DOM 요소 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // 모달 초기화 및 이벤트 설정
    const mapModal = new bootstrap.Modal(document.getElementById('mapModal'));
    
    // 사용자 인증 상태가 변경되면 필요한 초기화 수행
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('사용자가 로그인되어 있습니다:', user.uid);
            await loadServiceRequests(user.uid);
        } else {
            console.log('로그인이 필요합니다');
            window.location.href = 'login.html';
        }
    });
});