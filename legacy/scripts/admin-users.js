import { checkAdminAccess } from './auth.js';

// 페이지 로드 시 관리자 권한 확인
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAdminAccess();
        initializeUserManagement();
    } catch (error) {
        console.error('관리자 권한 확인 실패:', error);
        window.location.href = 'login.html';
    }
});

// 사용자 관리 초기화
function initializeUserManagement() {
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 초기 사용자 목록 로드
    loadUsers();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 이벤트
    document.getElementById('userSearch').addEventListener('input', debounce(handleSearch, 300));
    
    // 필터 이벤트
    document.getElementById('roleFilter').addEventListener('change', handleFilter);
    document.getElementById('statusFilter').addEventListener('change', handleFilter);
    
    // 페이지네이션 이벤트
    document.getElementById('prevPage').addEventListener('click', handlePrevPage);
    document.getElementById('nextPage').addEventListener('click', handleNextPage);
    
    // 모달 이벤트
    document.getElementById('userForm').addEventListener('submit', handleUserSave);
    document.querySelector('.btn-delete').addEventListener('click', handleUserDelete);
    document.querySelector('.btn-cancel').addEventListener('click', closeModal);
}

// Firestore에서 사용자 데이터 로드
function loadUsers() {
    const db = firebase.firestore();
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = ''; // 기존 데이터 초기화

    // Firestore에서 모든 사용자 정보 가져오기
    db.collection('users').get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                console.log('사용자 정보가 없습니다.');
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">등록된 사용자가 없습니다.</td></tr>';
                return;
            }
            
            let users = [];
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                users.push({
                    id: doc.id,
                    ...userData
                });
            });
            
            // 사용자 정보 테이블에 표시
            renderUserList(users);
        })
        .catch((error) => {
            console.error('사용자 정보 가져오기 오류:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">데이터 로드 중 오류가 발생했습니다.</td></tr>';
        });
}

// 사용자 목록 렌더링
function renderUserList(users) {
    const tableBody = document.getElementById('userTableBody');
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>${user.role || '-'}</td>
            <td>${user.status || 'active'}</td>
            <td>${user.joinDate ? new Date(user.joinDate).toLocaleDateString() : '-'}</td>
            <td>${user.lastAccess ? new Date(user.lastAccess).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="showUserDetails('${user.id}')">
                    <i class="fas fa-edit"></i> 수정
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 사용자 상세 정보 표시
function showUserDetails(userId) {
    const db = firebase.firestore();
    
    db.collection('users').doc(userId).get()
        .then((doc) => {
            if (!doc.exists) {
                console.log('해당 ID의 사용자가 없습니다.');
                return;
            }
            
            const userData = doc.data();
            const modal = document.getElementById('userModal');
            
            // 모달 폼에 사용자 정보 설정
            document.getElementById('userName').value = userData.name || '';
            document.getElementById('userEmail').value = userData.email || '';
            document.getElementById('userRole').value = userData.role || 'user';
            document.getElementById('userStatus').value = userData.status || 'active';
            
            // 현재 사용자 ID를 폼에 저장
            modal.dataset.userId = userId;
            
            // 모달 표시
            modal.style.display = 'block';
        })
        .catch((error) => {
            console.error('사용자 정보 가져오기 오류:', error);
        });
}

// 사용자 정보 저장
function saveUserData(event) {
    event.preventDefault();
    
    const modal = document.getElementById('userModal');
    const userId = modal.dataset.userId;
    const db = firebase.firestore();
    
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        status: document.getElementById('userStatus').value,
        updatedAt: new Date()
    };
    
    db.collection('users').doc(userId).update(userData)
        .then(() => {
            console.log('사용자 정보가 성공적으로 업데이트되었습니다.');
            modal.style.display = 'none';
            
            // 목록 새로고침
            loadUsers();
        })
        .catch((error) => {
            console.error('사용자 정보 업데이트 오류:', error);
            alert('사용자 정보 저장 중 오류가 발생했습니다.');
        });
}

// 모달 닫기
function closeUserModal() {
    const modal = document.getElementById('userModal');
    modal.style.display = 'none';
}

// 검색 처리
function handleSearch(event) {
    const searchTerm = event.target.value;
    // 검색 API 호출 및 결과 표시
}

// 필터 처리
function handleFilter() {
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;
    // 필터 API 호출 및 결과 표시
}

// 페이지네이션 처리
function handlePrevPage() {
    const currentPage = parseInt(document.getElementById('pageInfo').textContent.split('/')[0]);
    if (currentPage > 1) {
        loadUsers(currentPage - 1);
    }
}

function handleNextPage() {
    const [currentPage, totalPages] = document.getElementById('pageInfo').textContent.split('/').map(Number);
    if (currentPage < totalPages) {
        loadUsers(currentPage + 1);
    }
}

// 모달 관련 함수
function showUserModal(userId) {
    // 사용자 상세 정보 로드 및 모달 표시
}

function closeModal() {
    document.getElementById('userModal').style.display = 'none';
}

function handleUserSave(event) {
    event.preventDefault();
    // 사용자 정보 저장
}

function handleUserDelete() {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
        // 사용자 삭제 처리
    }
}

// 유틸리티 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getRoleLabel(role) {
    const roles = {
        'admin': '관리자',
        'worker': '작업자',
        'user': '일반 사용자'
    };
    return roles[role] || role;
}

function getStatusLabel(status) {
    const statuses = {
        'active': '활성',
        'inactive': '비활성',
        'suspended': '정지'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
}

function showError(message) {
    // 에러 메시지 표시
    alert(message);
} 