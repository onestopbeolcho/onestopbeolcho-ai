// Firebase 모듈 import
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, Timestamp, addDoc, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyD8K67dD2un4dU74KPi37mkq7el5VdZD9s",
    authDomain: "onestop-88b05.firebaseapp.com",
    projectId: "onestop-88b05",
    storageBucket: "onestop-88b05.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef1234567890"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 설정
const db = firebase.firestore();
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// 인증 상태 확인
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // 사용자 역할 확인
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    const isAdmin = userData.role === 'admin' || 
                                  (Array.isArray(userData.roles) && userData.roles.includes('admin'));
                    
                    if (isAdmin) {
                        // 관리자 권한이 있는 경우 대시보드 표시
                        document.getElementById('adminDashboard').style.display = 'block';
                        initializeAdminDashboard();
                    } else {
                        // 관리자 권한이 없는 경우 메인 페이지로 리다이렉트
                        window.location.href = 'index.html';
                    }
                } else {
                    // 사용자 데이터가 없는 경우 메인 페이지로 리다이렉트
                    window.location.href = 'index.html';
                }
            })
            .catch(error => {
                console.error('사용자 데이터 확인 중 오류:', error);
                window.location.href = 'index.html';
            });
    } else {
        // 로그인되지 않은 경우 메인 페이지로 리다이렉트
        window.location.href = 'index.html';
    }
});

// 로그아웃 버튼 이벤트 리스너
document.getElementById('logoutBtn').addEventListener('click', () => {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('로그아웃 중 오류:', error);
        });
});

// 새로고침 버튼 이벤트 리스너
document.getElementById('refreshBtn').addEventListener('click', () => {
    location.reload();
});

// 관리자 권한 확인 함수
async function checkAdminRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return false;
        
        const userData = userDoc.data();
        return userData.role === 'admin' || userData.roles?.includes('admin');
    } catch (error) {
        console.error('관리자 권한 확인 중 오류:', error);
        return false;
    }
}

// 로그인 폼 이벤트 리스너
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        // Firebase 인증으로 로그인
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // onAuthStateChanged에서 자동으로 처리됨
    } catch (error) {
        console.error('로그인 오류:', error);
        document.getElementById('adminLoginError').textContent = '로그인에 실패했습니다.';
    }
});

// 보안 관련 상수
const ENCRYPTION_KEY = 'YOUR_ENCRYPTION_KEY'; // 실제 운영 환경에서는 환경 변수로 관리
const ADMIN_ROLES = ['super_admin', 'admin', 'manager'];

// 관리자 권한 검증
async function verifyAdminAccess() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('로그인이 필요합니다.');
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            throw new Error('사용자 정보를 찾을 수 없습니다.');
        }

        const userData = userDoc.data();
        if (!userData.isAdmin) {
            throw new Error('관리자 권한이 없습니다.');
        }

        // 세션 타임아웃 설정 (30분)
        setTimeout(() => {
            firebase.auth().signOut();
            window.location.href = '/login.html';
        }, 30 * 60 * 1000);

        return userData;
    } catch (error) {
        console.error('권한 검증 오류:', error);
        window.location.href = '/login.html';
    }
}

// API 키 암호화/복호화
function encryptApiKey(apiKey) {
    try {
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.substring(0, 16));
        const encrypted = CryptoJS.AES.encrypt(apiKey, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypted.toString();
    } catch (error) {
        console.error('API 키 암호화 오류:', error);
        throw new Error('API 키 암호화에 실패했습니다.');
    }
}

function decryptApiKey(encryptedApiKey) {
    try {
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.substring(0, 16));
        const decrypted = CryptoJS.AES.decrypt(encryptedApiKey, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('API 키 복호화 오류:', error);
        throw new Error('API 키 복호화에 실패했습니다.');
    }
}

// API 키 저장
async function saveApiKey(apiKey, keyType) {
    try {
        const encryptedKey = encryptApiKey(apiKey);
        await db.collection('apiKeys').doc(keyType).set({
            key: encryptedKey,
            updatedAt: new Date(),
            updatedBy: firebase.auth().currentUser.uid
        });
        return true;
    } catch (error) {
        console.error('API 키 저장 오류:', error);
        throw new Error('API 키 저장에 실패했습니다.');
    }
}

// API 키 로드
async function loadApiKey(keyType) {
    try {
        const doc = await db.collection('apiKeys').doc(keyType).get();
        if (!doc.exists) {
            return null;
        }
        const encryptedKey = doc.data().key;
        return decryptApiKey(encryptedKey);
    } catch (error) {
        console.error('API 키 로드 오류:', error);
        throw new Error('API 키 로드에 실패했습니다.');
    }
}

// 로그인 보안 강화
function enhanceLoginSecurity() {
    // 로그인 시도 제한
    let loginAttempts = 0;
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 30 * 60 * 1000; // 30분

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userData = await verifyAdminAccess();
                if (!userData) {
                    await firebase.auth().signOut();
                    window.location.href = '/login.html';
                }
            } catch (error) {
                console.error('로그인 검증 오류:', error);
                await firebase.auth().signOut();
                window.location.href = '/login.html';
            }
        }
    });

    // 로그인 시도 제한 설정
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            showError('로그인 시도가 너무 많습니다. 30분 후에 다시 시도해주세요.');
            return;
        }

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            loginAttempts = 0;
        } catch (error) {
            loginAttempts++;
            if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                setTimeout(() => {
                    loginAttempts = 0;
                }, LOCKOUT_DURATION);
            }
            showError('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
    });
}

// 대시보드 초기화
function initializeAdminDashboard() {
    // 실시간 데이터 구독
    subscribeToRealTimeData();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 초기 데이터 로드
    loadInitialData();
    
    // 새로운 기능 초기화
    loadPortfolios();
    loadMessages();
    loadNotifications();
    loadTemplates();
    loadRecipients();
    
    // AI 분석 초기화
    initializeAIAnalysis();
    
    // 고객 관리 초기화
    loadCustomers();
    
    // 설정 관리 초기화
    initializeSettings();
    initializeSiteSettings();
    initializeSystemMonitoring();
    enhanceLoginSecurity();
    verifyAdminAccess();
    
    // 성능 모니터링 시작
    performanceMonitor.startMeasure('dashboard-initialization');
    
    // 지연 로딩 설정
    lazyLoadImages();
    
    // 이벤트 리스너 최적화
    const debouncedSearch = debounce(handleSearch, 300);
    document.getElementById('searchInput')?.addEventListener('input', debouncedSearch);
    
    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScroll);
    
    // 성능 모니터링 종료
    performanceMonitor.endMeasure('dashboard-initialization');
    
    // 페이지 언로드 시 리소스 정리
    window.addEventListener('unload', () => {
        resourceManager.cleanup();
    });
    
    // UX 기능 초기화
    uxManager.setupTooltips();
    uxManager.setupMobileSidebar();
    
    // 접근성 모드 복원
    if (localStorage.getItem('highContrastMode') === 'true') {
        document.body.classList.add('high-contrast');
    }
    
    // 작업자 알림 초기화
    initializeWorkerNotifications();
    // 작업자 상세 관리 초기화
    initializeWorkerDetails();
    // 고객 관리 초기화
    initializeCustomerManagement();
    // 서비스 관리 초기화
    initializeServiceManagement();
    // 결제 관리 초기화
    initializePaymentManagement();
    // 정산 관리 초기화
    initializeSettlementManagement();
    // 통계 및 분석 초기화
    initializeStatistics();
    initializeSystemSettings();
    // 사용자 관리 초기화
    initializeUserManagement();
    // 사용자 권한 관리 초기화
    initializeUserPermissions();
    // 사용자 활동 로그 초기화
    initializeUserActivityLogs();
    // 시스템 백업 및 복구 초기화
    initializeBackupAndRecovery();
    // 시스템 로그 분석 초기화
    initializeLogAnalysis();
    // 시스템 성능 모니터링 초기화
    initializePerformanceMonitoring();
    // 시스템 알림 초기화
    initializeSystemNotifications();
    // 시스템 통계 초기화
    initializeSystemStatistics();
    // 시스템 보안 초기화
    initializeSystemSecurity();
    // 시스템 통합 기능 초기화
    initializeSystemIntegration();
}

// 실시간 데이터 구독
function subscribeToRealTimeData() {
    // 오늘의 서비스 요청
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    db.collection('serviceRequests')
        .where('createdAt', '>=', today)
        .onSnapshot((snapshot) => {
            document.getElementById('todayRequests').textContent = snapshot.size;
        }, (error) => {
            console.error('서비스 요청 구독 오류:', error);
        });

    // 진행 중인 작업
    db.collection('jobs')
        .where('status', '==', 'in_progress')
        .onSnapshot((snapshot) => {
            document.getElementById('activeJobs').textContent = snapshot.size;
        }, (error) => {
            console.error('작업 구독 오류:', error);
        });

    // 등록된 작업자
    db.collection('workers')
        .onSnapshot((snapshot) => {
            document.getElementById('totalWorkers').textContent = snapshot.size;
        }, (error) => {
            console.error('작업자 구독 오류:', error);
        });

    // 총 사용자
    db.collection('users')
        .onSnapshot((snapshot) => {
            document.getElementById('totalUsers').textContent = snapshot.size;
        }, (error) => {
            console.error('사용자 구독 오류:', error);
        });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 사이드바 네비게이션
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            showSection(targetId);
        });
    });
    
    // AI 분석 필터 변경 이벤트
    document.getElementById('customerFilter').addEventListener('change', analyzeCustomerPreferences);
    document.getElementById('timeFilter').addEventListener('change', analyzeCustomerPreferences);
    document.getElementById('serviceTypeFilter').addEventListener('change', analyzeServicePatterns);
    document.getElementById('regionFilter').addEventListener('change', analyzeWorkerMatching);
    
    // 고객 관리 필터 이벤트
    document.getElementById('customerStatusFilter').addEventListener('change', loadCustomers);
    document.getElementById('customerRegionFilter').addEventListener('change', loadCustomers);
    document.getElementById('customerSearch').addEventListener('input', loadCustomers);
}

// 섹션 표시
function showSection(sectionId) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // 선택한 섹션 표시
    document.getElementById(sectionId).classList.add('active');

    // 사이드바 활성화 상태 업데이트
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
}

// 초기 데이터 로드
async function loadInitialData() {
    try {
        // 사용자 데이터 로드
        await loadUsers();
        
        // 작업자 데이터 로드
        await loadWorkers();
        
        // 서비스 데이터 로드
        await loadServices();
        
        // 통계 데이터 로드
        await loadStatistics();
    } catch (error) {
        console.error('초기 데이터 로드 오류:', error);
        showError('데이터를 불러올 수 없습니다.');
    }
}

// 사용자 관리 초기화
function initializeUserManagement() {
    loadUsers();
    setupUserFilters();
    setupUserActions();
}

// 사용자 목록 로드
async function loadUsers() {
    try {
        const roleFilter = document.getElementById('userRoleFilter').value;
        const statusFilter = document.getElementById('userStatusFilter').value;
        const searchQuery = document.getElementById('userSearch').value.toLowerCase();
        
        let query = db.collection('users');
        
        if (roleFilter !== 'all') {
            query = query.where('role', '==', roleFilter);
        }
        
        if (statusFilter !== 'all') {
            query = query.where('status', '==', statusFilter);
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const users = [];
        
        snapshot.forEach(doc => {
            const user = doc.data();
            if (searchQuery === '' || 
                user.name.toLowerCase().includes(searchQuery) ||
                user.email.toLowerCase().includes(searchQuery)) {
                users.push({
                    id: doc.id,
                    ...user
                });
            }
        });
        
        updateUserList(users);
    } catch (error) {
        console.error('사용자 목록 로드 중 오류:', error);
        showError('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    }
}

// 사용자 목록 업데이트
function updateUserList(users) {
    const tbody = document.getElementById('userList');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.status}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <button class="view-btn" data-id="${user.id}">상세보기</button>
                <button class="edit-btn" data-id="${user.id}">수정</button>
                <button class="delete-btn" data-id="${user.id}">삭제</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 사용자 필터 설정
function setupUserFilters() {
    document.getElementById('userRoleFilter').addEventListener('change', loadUsers);
    document.getElementById('userStatusFilter').addEventListener('change', loadUsers);
    document.getElementById('userSearch').addEventListener('input', loadUsers);
}

// 사용자 액션 설정
function setupUserActions() {
    // 사용자 상세 보기
    document.getElementById('userList').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('view-btn')) {
            const userId = target.dataset.id;
            viewUserDetails(userId);
        }
    });
    
    // 사용자 수정
    document.getElementById('userList').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            const userId = target.dataset.id;
            editUser(userId);
        }
    });
    
    // 사용자 삭제
    document.getElementById('userList').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('delete-btn')) {
            const userId = target.dataset.id;
            deleteUser(userId);
        }
    });
    
    // 새 사용자 추가
    document.getElementById('addUserBtn').addEventListener('click', () => {
        showAddUserForm();
    });
}

// 사용자 상세 정보 보기
async function viewUserDetails(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.data();
        
        // 사용자 상세 정보를 모달로 표시
        showUserDetailsModal(user);
    } catch (error) {
        console.error('사용자 상세 정보 로드 중 오류:', error);
        showError('사용자 상세 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 사용자 수정
async function editUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.data();
        
        // 사용자 수정 폼을 모달로 표시
        showEditUserForm(user);
    } catch (error) {
        console.error('사용자 정보 로드 중 오류:', error);
        showError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 사용자 삭제
async function deleteUser(userId) {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
        try {
            await db.collection('users').doc(userId).delete();
            showSuccess('사용자가 삭제되었습니다.');
            loadUsers();
        } catch (error) {
            console.error('사용자 삭제 중 오류:', error);
            showError('사용자를 삭제하는 중 오류가 발생했습니다.');
        }
    }
}

// 새 사용자 추가 폼 표시
function showAddUserForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>새 사용자 추가</h3>
            <form id="addUserForm">
                <div class="form-group">
                    <label for="newUserName">이름</label>
                    <input type="text" id="newUserName" required>
                </div>
                <div class="form-group">
                    <label for="newUserEmail">이메일</label>
                    <input type="email" id="newUserEmail" required>
                </div>
                <div class="form-group">
                    <label for="newUserRole">역할</label>
                    <select id="newUserRole" required>
                        <option value="admin">관리자</option>
                        <option value="manager">매니저</option>
                        <option value="user">일반 사용자</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="newUserPassword">비밀번호</label>
                    <input type="password" id="newUserPassword" required>
                </div>
                <div class="form-actions">
                    <button type="submit">추가</button>
                    <button type="button" class="cancel-btn">취소</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 폼 제출 이벤트
    modal.querySelector('#addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const userData = {
                name: document.getElementById('newUserName').value,
                email: document.getElementById('newUserEmail').value,
                role: document.getElementById('newUserRole').value,
                status: 'active',
                createdAt: new Date()
            };
            
            // Firebase Auth에 사용자 추가
            const userCredential = await auth.createUserWithEmailAndPassword(
                userData.email,
                document.getElementById('newUserPassword').value
            );
            
            // Firestore에 사용자 데이터 저장
            await db.collection('users').doc(userCredential.user.uid).set(userData);
            
            showSuccess('사용자가 추가되었습니다.');
            modal.remove();
            loadUsers();
        } catch (error) {
            console.error('사용자 추가 중 오류:', error);
            showError('사용자를 추가하는 중 오류가 발생했습니다.');
        }
    });
    
    // 취소 버튼 이벤트
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });
}

// 사용자 상세 정보 모달 표시
function showUserDetailsModal(user) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>사용자 상세 정보</h3>
            <div class="user-details">
                <div class="detail-item">
                    <span class="label">이름:</span>
                    <span class="value">${user.name}</span>
                </div>
                <div class="detail-item">
                    <span class="label">이메일:</span>
                    <span class="value">${user.email}</span>
                </div>
                <div class="detail-item">
                    <span class="label">역할:</span>
                    <span class="value">${user.role}</span>
                </div>
                <div class="detail-item">
                    <span class="label">상태:</span>
                    <span class="value">${user.status}</span>
                </div>
                <div class="detail-item">
                    <span class="label">가입일:</span>
                    <span class="value">${formatDate(user.createdAt)}</span>
                </div>
                ${user.lastLoginAt ? `
                <div class="detail-item">
                    <span class="label">마지막 로그인:</span>
                    <span class="value">${formatDate(user.lastLoginAt)}</span>
                </div>
                ` : ''}
            </div>
            <div class="modal-actions">
                <button class="close-modal">닫기</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// 사용자 수정 폼 표시
function showEditUserForm(user) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>사용자 정보 수정</h3>
            <form id="editUserForm">
                <div class="form-group">
                    <label for="editUserName">이름</label>
                    <input type="text" id="editUserName" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label for="editUserEmail">이메일</label>
                    <input type="email" id="editUserEmail" value="${user.email}" required>
                </div>
                <div class="form-group">
                    <label for="editUserRole">역할</label>
                    <select id="editUserRole" required>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>관리자</option>
                        <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>매니저</option>
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>일반 사용자</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editUserStatus">상태</label>
                    <select id="editUserStatus" required>
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>활성</option>
                        <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>비활성</option>
                        <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>정지</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editUserPassword">비밀번호 (변경시에만 입력)</label>
                    <input type="password" id="editUserPassword">
                </div>
                <div class="form-actions">
                    <button type="submit">저장</button>
                    <button type="button" class="cancel-btn">취소</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 폼 제출 이벤트
    modal.querySelector('#editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const userData = {
                name: document.getElementById('editUserName').value,
                email: document.getElementById('editUserEmail').value,
                role: document.getElementById('editUserRole').value,
                status: document.getElementById('editUserStatus').value,
                updatedAt: new Date()
            };
            
            // 비밀번호 변경이 필요한 경우
            const newPassword = document.getElementById('editUserPassword').value;
            if (newPassword) {
                await auth.updatePassword(user.uid, newPassword);
            }
            
            // Firestore에 사용자 데이터 업데이트
            await db.collection('users').doc(user.id).update(userData);
            
            showSuccess('사용자 정보가 수정되었습니다.');
            modal.remove();
            loadUsers();
        } catch (error) {
            console.error('사용자 정보 수정 중 오류:', error);
            showError('사용자 정보를 수정하는 중 오류가 발생했습니다.');
        }
    });
    
    // 취소 버튼 이벤트
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });
}

// 시스템 설정 초기화
function initializeSystemSettings() {
    loadSystemSettings();
    setupSettingsListeners();
    setupSettingsValidation();
}

// 시스템 설정 로드
async function loadSystemSettings() {
    try {
        const settings = await fetchSystemSettings();
        updateSettingsForm(settings);
    } catch (error) {
        console.error('시스템 설정 로드 중 오류:', error);
        showError('시스템 설정을 불러오는 중 오류가 발생했습니다.');
    }
}

// 시스템 설정 가져오기
async function fetchSystemSettings() {
    const doc = await db.collection('systemSettings').doc('settings').get();
    return doc.exists ? doc.data() : getDefaultSettings();
}

// 기본 설정 가져오기
function getDefaultSettings() {
    return {
        general: {
            siteName: '원스톱 플랫폼',
            siteDescription: '원스톱 서비스 플랫폼',
            timezone: 'Asia/Seoul',
            language: 'ko',
            maintenanceMode: false
        },
        security: {
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true
            },
            sessionTimeout: 30, // 분
            maxLoginAttempts: 5,
            twoFactorAuth: false
        },
        notifications: {
            emailNotifications: true,
            pushNotifications: true,
            notificationTypes: {
                system: true,
                security: true,
                updates: true,
                marketing: false
            }
        },
        integrations: {
            paymentGateway: 'stripe',
            smsGateway: 'twilio',
            emailService: 'sendgrid',
            analytics: 'google'
        },
        backup: {
            autoBackup: true,
            backupFrequency: 'daily',
            backupRetention: 30, // 일
            backupLocation: 'firebase'
        }
    };
}

// 설정 폼 업데이트
function updateSettingsForm(settings) {
    // 일반 설정
    document.getElementById('siteName').value = settings.general.siteName;
    document.getElementById('siteDescription').value = settings.general.siteDescription;
    document.getElementById('timezone').value = settings.general.timezone;
    document.getElementById('language').value = settings.general.language;
    document.getElementById('maintenanceMode').checked = settings.general.maintenanceMode;

    // 보안 설정
    document.getElementById('passwordMinLength').value = settings.security.passwordPolicy.minLength;
    document.getElementById('requireUppercase').checked = settings.security.passwordPolicy.requireUppercase;
    document.getElementById('requireLowercase').checked = settings.security.passwordPolicy.requireLowercase;
    document.getElementById('requireNumbers').checked = settings.security.passwordPolicy.requireNumbers;
    document.getElementById('requireSpecialChars').checked = settings.security.passwordPolicy.requireSpecialChars;
    document.getElementById('sessionTimeout').value = settings.security.sessionTimeout;
    document.getElementById('maxLoginAttempts').value = settings.security.maxLoginAttempts;
    document.getElementById('twoFactorAuth').checked = settings.security.twoFactorAuth;

    // 알림 설정
    document.getElementById('emailNotifications').checked = settings.notifications.emailNotifications;
    document.getElementById('pushNotifications').checked = settings.notifications.pushNotifications;
    document.getElementById('systemNotifications').checked = settings.notifications.notificationTypes.system;
    document.getElementById('securityNotifications').checked = settings.notifications.notificationTypes.security;
    document.getElementById('updateNotifications').checked = settings.notifications.notificationTypes.updates;
    document.getElementById('marketingNotifications').checked = settings.notifications.notificationTypes.marketing;

    // 통합 설정
    document.getElementById('paymentGateway').value = settings.integrations.paymentGateway;
    document.getElementById('smsGateway').value = settings.integrations.smsGateway;
    document.getElementById('emailService').value = settings.integrations.emailService;
    document.getElementById('analytics').value = settings.integrations.analytics;

    // 백업 설정
    document.getElementById('autoBackup').checked = settings.backup.autoBackup;
    document.getElementById('backupFrequency').value = settings.backup.backupFrequency;
    document.getElementById('backupRetention').value = settings.backup.backupRetention;
    document.getElementById('backupLocation').value = settings.backup.backupLocation;
}

// 설정 리스너 설정
function setupSettingsListeners() {
    // 설정 저장 버튼
    document.getElementById('saveSettings').addEventListener('click', saveSystemSettings);
    
    // 설정 변경 감지
    const settingsForm = document.getElementById('settingsForm');
    settingsForm.addEventListener('change', () => {
        document.getElementById('saveSettings').disabled = false;
    });
}

// 설정 유효성 검사 설정
function setupSettingsValidation() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateSettings()) {
            saveSystemSettings();
        }
    });
}

// 설정 유효성 검사
function validateSettings() {
    const passwordMinLength = parseInt(document.getElementById('passwordMinLength').value);
    const sessionTimeout = parseInt(document.getElementById('sessionTimeout').value);
    const maxLoginAttempts = parseInt(document.getElementById('maxLoginAttempts').value);
    const backupRetention = parseInt(document.getElementById('backupRetention').value);

    if (passwordMinLength < 6) {
        showError('비밀번호 최소 길이는 6자 이상이어야 합니다.');
        return false;
    }

    if (sessionTimeout < 5) {
        showError('세션 타임아웃은 5분 이상이어야 합니다.');
        return false;
    }

    if (maxLoginAttempts < 3) {
        showError('최대 로그인 시도 횟수는 3회 이상이어야 합니다.');
        return false;
    }

    if (backupRetention < 7) {
        showError('백업 보관 기간은 7일 이상이어야 합니다.');
        return false;
    }

    return true;
}

// 시스템 설정 저장
async function saveSystemSettings() {
    try {
        const settings = {
            general: {
                siteName: document.getElementById('siteName').value,
                siteDescription: document.getElementById('siteDescription').value,
                timezone: document.getElementById('timezone').value,
                language: document.getElementById('language').value,
                maintenanceMode: document.getElementById('maintenanceMode').checked
            },
            security: {
                passwordPolicy: {
                    minLength: parseInt(document.getElementById('passwordMinLength').value),
                    requireUppercase: document.getElementById('requireUppercase').checked,
                    requireLowercase: document.getElementById('requireLowercase').checked,
                    requireNumbers: document.getElementById('requireNumbers').checked,
                    requireSpecialChars: document.getElementById('requireSpecialChars').checked
                },
                sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
                maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value),
                twoFactorAuth: document.getElementById('twoFactorAuth').checked
            },
            notifications: {
                emailNotifications: document.getElementById('emailNotifications').checked,
                pushNotifications: document.getElementById('pushNotifications').checked,
                notificationTypes: {
                    system: document.getElementById('systemNotifications').checked,
                    security: document.getElementById('securityNotifications').checked,
                    updates: document.getElementById('updateNotifications').checked,
                    marketing: document.getElementById('marketingNotifications').checked
                }
            },
            integrations: {
                paymentGateway: document.getElementById('paymentGateway').value,
                smsGateway: document.getElementById('smsGateway').value,
                emailService: document.getElementById('emailService').value,
                analytics: document.getElementById('analytics').value
            },
            backup: {
                autoBackup: document.getElementById('autoBackup').checked,
                backupFrequency: document.getElementById('backupFrequency').value,
                backupRetention: parseInt(document.getElementById('backupRetention').value),
                backupLocation: document.getElementById('backupLocation').value
            }
        };

        await db.collection('systemSettings').doc('settings').set(settings, { merge: true });
        
        // 설정 변경 알림
        await sendNotification(
            '시스템 설정 변경',
            '시스템 설정이 성공적으로 업데이트되었습니다.',
            'success'
        );
        
        showSuccess('시스템 설정이 저장되었습니다.');
        document.getElementById('saveSettings').disabled = true;
    } catch (error) {
        console.error('시스템 설정 저장 중 오류:', error);
        showError('시스템 설정을 저장하는 중 오류가 발생했습니다.');
    }
}

// 사용자 권한 관리 초기화
function initializeUserPermissions() {
    loadUserPermissions();
    setupPermissionActions();
}

// 사용자 권한 로드
async function loadUserPermissions() {
    try {
        const snapshot = await db.collection('permissions').get();
        const permissions = {};
        
        snapshot.forEach(doc => {
            permissions[doc.id] = doc.data();
        });
        
        updatePermissionList(permissions);
    } catch (error) {
        console.error('사용자 권한 로드 중 오류:', error);
        showError('사용자 권한을 불러오는 중 오류가 발생했습니다.');
    }
}

// 권한 목록 업데이트
function updatePermissionList(permissions) {
    const tbody = document.getElementById('permissionList');
    tbody.innerHTML = '';
    
    Object.entries(permissions).forEach(([role, data]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${role}</td>
            <td>
                <div class="permission-item">
                    <input type="checkbox" id="view_${role}" ${data.view ? 'checked' : ''}>
                    <label for="view_${role}">조회</label>
                </div>
                <div class="permission-item">
                    <input type="checkbox" id="create_${role}" ${data.create ? 'checked' : ''}>
                    <label for="create_${role}">생성</label>
                </div>
                <div class="permission-item">
                    <input type="checkbox" id="edit_${role}" ${data.edit ? 'checked' : ''}>
                    <label for="edit_${role}">수정</label>
                </div>
                <div class="permission-item">
                    <input type="checkbox" id="delete_${role}" ${data.delete ? 'checked' : ''}>
                    <label for="delete_${role}">삭제</label>
                </div>
            </td>
            <td>
                <button class="save-permission-btn" data-role="${role}">저장</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 권한 액션 설정
function setupPermissionActions() {
    document.getElementById('permissionList').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('save-permission-btn')) {
            const role = target.dataset.role;
            savePermissions(role);
        }
    });
}

// 권한 저장
async function savePermissions(role) {
    try {
        const permissions = {
            view: document.getElementById(`view_${role}`).checked,
            create: document.getElementById(`create_${role}`).checked,
            edit: document.getElementById(`edit_${role}`).checked,
            delete: document.getElementById(`delete_${role}`).checked
        };
        
        await db.collection('permissions').doc(role).set(permissions);
        showSuccess('권한이 저장되었습니다.');
    } catch (error) {
        console.error('권한 저장 중 오류:', error);
        showError('권한을 저장하는 중 오류가 발생했습니다.');
    }
}

// 사용자 권한 확인
async function checkUserPermission(userId, action) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.data();
        
        const permissionDoc = await db.collection('permissions').doc(user.role).get();
        const permissions = permissionDoc.data();
        
        return permissions[action] || false;
    } catch (error) {
        console.error('권한 확인 중 오류:', error);
        return false;
    }
}

// 권한 기반 액션 제어
async function handlePermissionBasedAction(userId, action, callback) {
    const hasPermission = await checkUserPermission(userId, action);
    if (hasPermission) {
        callback();
    } else {
        showError('이 작업을 수행할 권한이 없습니다.');
    }
}

// 사용자 활동 로그 초기화
function initializeUserActivityLogs() {
    loadActivityLogs();
    setupActivityFilters();
}

// 활동 로그 로드
async function loadActivityLogs() {
    try {
        const userFilter = document.getElementById('activityUserFilter').value;
        const typeFilter = document.getElementById('activityTypeFilter').value;
        const dateFilter = document.getElementById('activityDateFilter').value;
        
        let query = db.collection('activity_logs');
        
        if (userFilter !== 'all') {
            query = query.where('userId', '==', userFilter);
        }
        
        if (typeFilter !== 'all') {
            query = query.where('type', '==', typeFilter);
        }
        
        if (dateFilter) {
            const startDate = new Date(dateFilter);
            const endDate = new Date(dateFilter);
            endDate.setDate(endDate.getDate() + 1);
            
            query = query.where('timestamp', '>=', startDate)
                        .where('timestamp', '<', endDate);
        }
        
        const snapshot = await query.orderBy('timestamp', 'desc').get();
        const logs = [];
        
        snapshot.forEach(doc => {
            logs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateActivityLogList(logs);
    } catch (error) {
        console.error('활동 로그 로드 중 오류:', error);
        showError('활동 로그를 불러오는 중 오류가 발생했습니다.');
    }
}

// 활동 로그 목록 업데이트
function updateActivityLogList(logs) {
    const tbody = document.getElementById('activityLogList');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(log.timestamp)}</td>
            <td>${log.userName || log.userId}</td>
            <td>${getActivityTypeText(log.type)}</td>
            <td>${log.description}</td>
            <td>${log.ipAddress || '-'}</td>
            <td>
                <button class="view-activity-btn" data-id="${log.id}">상세보기</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 활동 유형 텍스트 변환
function getActivityTypeText(type) {
    const types = {
        'login': '로그인',
        'logout': '로그아웃',
        'create': '생성',
        'update': '수정',
        'delete': '삭제',
        'view': '조회',
        'download': '다운로드',
        'upload': '업로드',
        'payment': '결제',
        'refund': '환불',
        'settings': '설정 변경',
        'error': '오류'
    };
    return types[type] || type;
}

// 활동 필터 설정
function setupActivityFilters() {
    document.getElementById('activityUserFilter').addEventListener('change', loadActivityLogs);
    document.getElementById('activityTypeFilter').addEventListener('change', loadActivityLogs);
    document.getElementById('activityDateFilter').addEventListener('change', loadActivityLogs);
}

// 활동 로그 상세 보기
async function viewActivityLogDetails(logId) {
    try {
        const logDoc = await db.collection('activity_logs').doc(logId).get();
        const log = logDoc.data();
        
        showActivityLogModal(log);
    } catch (error) {
        console.error('활동 로그 상세 정보 로드 중 오류:', error);
        showError('활동 로그 상세 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 활동 로그 모달 표시
function showActivityLogModal(log) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>활동 로그 상세 정보</h3>
            <div class="log-details">
                <div class="detail-item">
                    <span class="label">시간:</span>
                    <span class="value">${formatDate(log.timestamp)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">사용자:</span>
                    <span class="value">${log.userName || log.userId}</span>
                </div>
                <div class="detail-item">
                    <span class="label">유형:</span>
                    <span class="value">${getActivityTypeText(log.type)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">설명:</span>
                    <span class="value">${log.description}</span>
                </div>
                <div class="detail-item">
                    <span class="label">IP 주소:</span>
                    <span class="value">${log.ipAddress || '-'}</span>
                </div>
                ${log.details ? `
                <div class="detail-item">
                    <span class="label">상세 정보:</span>
                    <pre class="value">${JSON.stringify(log.details, null, 2)}</pre>
                </div>
                ` : ''}
            </div>
            <div class="modal-actions">
                <button class="close-modal">닫기</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// 사용자 활동 로깅
async function logUserActivity(userId, type, description, details = null) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        const logData = {
            userId: userId,
            userName: userData?.name || null,
            type: type,
            description: description,
            details: details,
            ipAddress: await getClientIP(),
            timestamp: new Date()
        };
        
        await db.collection('activity_logs').add(logData);
    } catch (error) {
        console.error('활동 로그 저장 중 오류:', error);
    }
}

// 클라이언트 IP 주소 가져오기
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('IP 주소 가져오기 오류:', error);
        return null;
    }
}

// 시스템 모니터링 초기화
function initializeSystemMonitoring() {
    loadSystemStatus();
    setupMonitoringFilters();
    startRealTimeMonitoring();
}

// 시스템 상태 로드
async function loadSystemStatus() {
    try {
        // API 상태 확인
        const apiStatus = await checkApiStatus();
        updateApiStatus(apiStatus);
        
        // 데이터베이스 상태 확인
        const dbStatus = await checkDatabaseStatus();
        updateDatabaseStatus(dbStatus);
        
        // 서비스 상태 확인
        const serviceStatus = await checkServiceStatus();
        updateServiceStatus(serviceStatus);
        
        // 에러 로그 로드
        await loadErrorLogs();
    } catch (error) {
        console.error('시스템 상태 로드 중 오류:', error);
        showError('시스템 상태를 불러오는 중 오류가 발생했습니다.');
    }
}

// API 상태 확인
async function checkApiStatus() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        return {
            status: data.status === 'ok',
            responseTime: data.responseTime,
            lastChecked: new Date()
        };
    } catch (error) {
        return {
            status: false,
            responseTime: null,
            lastChecked: new Date()
        };
    }
}

// 데이터베이스 상태 확인
async function checkDatabaseStatus() {
    try {
        const startTime = Date.now();
        await db.collection('system_status').doc('db').get();
        const responseTime = Date.now() - startTime;
        
        return {
            status: true,
            responseTime: responseTime,
            lastChecked: new Date()
        };
    } catch (error) {
        return {
            status: false,
            responseTime: null,
            lastChecked: new Date()
        };
    }
}

// 서비스 상태 확인
async function checkServiceStatus() {
    try {
        const services = ['auth', 'storage', 'functions'];
        const status = {};
        
        for (const service of services) {
            const startTime = Date.now();
            try {
                await db.collection('system_status').doc(service).get();
                status[service] = {
                    status: true,
                    responseTime: Date.now() - startTime,
                    lastChecked: new Date()
                };
            } catch (error) {
                status[service] = {
                    status: false,
                    responseTime: null,
                    lastChecked: new Date()
                };
            }
        }
        
        return status;
    } catch (error) {
        return null;
    }
}

// API 상태 업데이트
function updateApiStatus(status) {
    const statusElement = document.getElementById('apiStatus');
    const timeElement = document.getElementById('apiResponseTime');
    
    statusElement.textContent = status.status ? '정상' : '오류';
    statusElement.className = `status-indicator ${status.status ? 'success' : 'error'}`;
    
    if (status.responseTime) {
        timeElement.textContent = `${status.responseTime}ms`;
    } else {
        timeElement.textContent = '-';
    }
}

// 데이터베이스 상태 업데이트
function updateDatabaseStatus(status) {
    const statusElement = document.getElementById('dbStatus');
    const timeElement = document.getElementById('dbResponseTime');
    
    statusElement.textContent = status.status ? '정상' : '오류';
    statusElement.className = `status-indicator ${status.status ? 'success' : 'error'}`;
    
    if (status.responseTime) {
        timeElement.textContent = `${status.responseTime}ms`;
    } else {
        timeElement.textContent = '-';
    }
}

// 서비스 상태 업데이트
function updateServiceStatus(status) {
    if (!status) return;
    
    for (const [service, data] of Object.entries(status)) {
        const statusElement = document.getElementById(`${service}Status`);
        const timeElement = document.getElementById(`${service}ResponseTime`);
        
        if (statusElement && timeElement) {
            statusElement.textContent = data.status ? '정상' : '오류';
            statusElement.className = `status-indicator ${data.status ? 'success' : 'error'}`;
            
            if (data.responseTime) {
                timeElement.textContent = `${data.responseTime}ms`;
            } else {
                timeElement.textContent = '-';
            }
        }
    }
}

// 에러 로그 로드
async function loadErrorLogs() {
    try {
        const levelFilter = document.getElementById('errorLevelFilter').value;
        const dateFilter = document.getElementById('errorDateFilter').value;
        
        let query = db.collection('error_logs');
        
        if (levelFilter !== 'all') {
            query = query.where('level', '==', levelFilter);
        }
        
        if (dateFilter) {
            const startDate = new Date(dateFilter);
            const endDate = new Date(dateFilter);
            endDate.setDate(endDate.getDate() + 1);
            
            query = query.where('timestamp', '>=', startDate)
                        .where('timestamp', '<', endDate);
        }
        
        const snapshot = await query.orderBy('timestamp', 'desc').get();
        const logs = [];
        
        snapshot.forEach(doc => {
            logs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateErrorLogList(logs);
    } catch (error) {
        console.error('에러 로그 로드 중 오류:', error);
        showError('에러 로그를 불러오는 중 오류가 발생했습니다.');
    }
}

// 에러 로그 목록 업데이트
function updateErrorLogList(logs) {
    const tbody = document.getElementById('errorLogList');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(log.timestamp)}</td>
            <td>${getErrorLevelText(log.level)}</td>
            <td>${log.message}</td>
            <td>${log.source || '-'}</td>
            <td>
                <button class="view-error-btn" data-id="${log.id}">상세보기</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 에러 레벨 텍스트 변환
function getErrorLevelText(level) {
    const levels = {
        'critical': '치명적',
        'error': '오류',
        'warning': '경고',
        'info': '정보'
    };
    return levels[level] || level;
}

// 모니터링 필터 설정
function setupMonitoringFilters() {
    document.getElementById('errorLevelFilter').addEventListener('change', loadErrorLogs);
    document.getElementById('errorDateFilter').addEventListener('change', loadErrorLogs);
}

// 실시간 모니터링 시작
function startRealTimeMonitoring() {
    // API 상태 모니터링 (1분마다)
    setInterval(async () => {
        const status = await checkApiStatus();
        updateApiStatus(status);
    }, 60000);
    
    // 데이터베이스 상태 모니터링 (1분마다)
    setInterval(async () => {
        const status = await checkDatabaseStatus();
        updateDatabaseStatus(status);
    }, 60000);
    
    // 서비스 상태 모니터링 (1분마다)
    setInterval(async () => {
        const status = await checkServiceStatus();
        updateServiceStatus(status);
    }, 60000);
    
    // 에러 로그 실시간 구독
    db.collection('error_logs')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            if (!snapshot.empty) {
                loadErrorLogs();
            }
        });
}

// 에러 로그 상세 보기
async function viewErrorLogDetails(logId) {
    try {
        const logDoc = await db.collection('error_logs').doc(logId).get();
        const log = logDoc.data();
        
        showErrorLogModal(log);
    } catch (error) {
        console.error('에러 로그 상세 정보 로드 중 오류:', error);
        showError('에러 로그 상세 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 에러 로그 모달 표시
function showErrorLogModal(log) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>에러 로그 상세 정보</h3>
            <div class="log-details">
                <div class="detail-item">
                    <span class="label">시간:</span>
                    <span class="value">${formatDate(log.timestamp)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">레벨:</span>
                    <span class="value">${getErrorLevelText(log.level)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">메시지:</span>
                    <span class="value">${log.message}</span>
                </div>
                <div class="detail-item">
                    <span class="label">소스:</span>
                    <span class="value">${log.source || '-'}</span>
                </div>
                ${log.stackTrace ? `
                <div class="detail-item">
                    <span class="label">스택 트레이스:</span>
                    <pre class="value">${log.stackTrace}</pre>
                </div>
                ` : ''}
                ${log.additionalData ? `
                <div class="detail-item">
                    <span class="label">추가 정보:</span>
                    <pre class="value">${JSON.stringify(log.additionalData, null, 2)}</pre>
                </div>
                ` : ''}
            </div>
            <div class="modal-actions">
                <button class="close-modal">닫기</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// 시스템 백업 및 복구 초기화
function initializeBackupAndRecovery() {
    loadBackupHistory();
    setupBackupActions();
}

// 백업 이력 로드
async function loadBackupHistory() {
    try {
        const snapshot = await db.collection('backups')
            .orderBy('createdAt', 'desc')
            .get();
        
        const backups = [];
        snapshot.forEach(doc => {
            backups.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateBackupList(backups);
    } catch (error) {
        console.error('백업 이력 로드 중 오류:', error);
        showError('백업 이력을 불러오는 중 오류가 발생했습니다.');
    }
}

// 백업 목록 업데이트
function updateBackupList(backups) {
    const tbody = document.getElementById('backupList');
    tbody.innerHTML = '';
    
    backups.forEach(backup => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(backup.createdAt)}</td>
            <td>${backup.type}</td>
            <td>${formatFileSize(backup.size)}</td>
            <td>${backup.status}</td>
            <td>${backup.createdBy}</td>
            <td>
                <button class="download-backup-btn" data-id="${backup.id}">다운로드</button>
                <button class="restore-backup-btn" data-id="${backup.id}">복구</button>
                <button class="delete-backup-btn" data-id="${backup.id}">삭제</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 파일 크기 포맷
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 백업 액션 설정
function setupBackupActions() {
    // 수동 백업
    document.getElementById('manualBackupBtn').addEventListener('click', createManualBackup);
    
    // 자동 백업 설정
    document.getElementById('autoBackupToggle').addEventListener('change', updateAutoBackupSettings);
    document.getElementById('backupFrequency').addEventListener('change', updateAutoBackupSettings);
    document.getElementById('backupRetention').addEventListener('change', updateAutoBackupSettings);
    
    // 백업 목록 액션
    document.getElementById('backupList').addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('download-backup-btn')) {
            downloadBackup(target.dataset.id);
        } else if (target.classList.contains('restore-backup-btn')) {
            restoreBackup(target.dataset.id);
        } else if (target.classList.contains('delete-backup-btn')) {
            deleteBackup(target.dataset.id);
        }
    });
}

// 수동 백업 생성
async function createManualBackup() {
    try {
        showLoading('백업을 생성하는 중입니다...');
        
        // 백업 데이터 수집
        const collections = await db.listCollections();
        const backupData = {};
        
        for (const collection of collections) {
            const snapshot = await collection.get();
            backupData[collection.id] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
        
        // 백업 파일 생성
        const backupBlob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
        const backupFile = new File([backupBlob], `backup_${Date.now()}.json`);
        
        // 스토리지에 백업 파일 업로드
        const storageRef = firebase.storage().ref();
        const backupRef = storageRef.child(`backups/${backupFile.name}`);
        await backupRef.put(backupFile);
        
        // 백업 메타데이터 저장
        const backupDoc = {
            type: 'manual',
            size: backupBlob.size,
            status: 'completed',
            createdAt: new Date(),
            createdBy: firebase.auth().currentUser.uid,
            storagePath: `backups/${backupFile.name}`
        };
        
        await db.collection('backups').add(backupDoc);
        
        hideLoading();
        showSuccess('백업이 성공적으로 생성되었습니다.');
        loadBackupHistory();
    } catch (error) {
        hideLoading();
        console.error('백업 생성 중 오류:', error);
        showError('백업을 생성하는 중 오류가 발생했습니다.');
    }
}

// 자동 백업 설정 업데이트
async function updateAutoBackupSettings() {
    try {
        const settings = {
            enabled: document.getElementById('autoBackupToggle').checked,
            frequency: document.getElementById('backupFrequency').value,
            retention: parseInt(document.getElementById('backupRetention').value)
        };
        
        await db.collection('system_settings').doc('backup').set(settings);
        showSuccess('자동 백업 설정이 저장되었습니다.');
        
        if (settings.enabled) {
            scheduleAutoBackup(settings.frequency);
        }
    } catch (error) {
        console.error('자동 백업 설정 업데이트 중 오류:', error);
        showError('자동 백업 설정을 업데이트하는 중 오류가 발생했습니다.');
    }
}

// 자동 백업 스케줄링
function scheduleAutoBackup(frequency) {
    let interval;
    switch (frequency) {
        case 'hourly':
            interval = 60 * 60 * 1000; // 1시간
            break;
        case 'daily':
            interval = 24 * 60 * 60 * 1000; // 1일
            break;
        case 'weekly':
            interval = 7 * 24 * 60 * 60 * 1000; // 1주
            break;
        default:
            return;
    }
    
    setInterval(createAutoBackup, interval);
}

// 자동 백업 생성
async function createAutoBackup() {
    try {
        const backupDoc = {
            type: 'auto',
            status: 'in_progress',
            createdAt: new Date(),
            createdBy: 'system'
        };
        
        const backupRef = await db.collection('backups').add(backupDoc);
        
        // 백업 데이터 수집
        const collections = await db.listCollections();
        const backupData = {};
        
        for (const collection of collections) {
            const snapshot = await collection.get();
            backupData[collection.id] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
        
        // 백업 파일 생성
        const backupBlob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
        const backupFile = new File([backupBlob], `auto_backup_${Date.now()}.json`);
        
        // 스토리지에 백업 파일 업로드
        const storageRef = firebase.storage().ref();
        const backupStorageRef = storageRef.child(`backups/${backupFile.name}`);
        await backupStorageRef.put(backupFile);
        
        // 백업 메타데이터 업데이트
        await backupRef.update({
            size: backupBlob.size,
            status: 'completed',
            storagePath: `backups/${backupFile.name}`
        });
        
        // 오래된 백업 삭제
        await cleanupOldBackups();
    } catch (error) {
        console.error('자동 백업 생성 중 오류:', error);
    }
}

// 오래된 백업 정리
async function cleanupOldBackups() {
    try {
        const settingsDoc = await db.collection('system_settings').doc('backup').get();
        const settings = settingsDoc.data();
        
        if (!settings || !settings.retention) return;
        
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - settings.retention);
        
        const snapshot = await db.collection('backups')
            .where('createdAt', '<', retentionDate)
            .get();
        
        for (const doc of snapshot.docs) {
            const backup = doc.data();
            if (backup.storagePath) {
                const storageRef = firebase.storage().ref(backup.storagePath);
                await storageRef.delete();
            }
            await doc.ref.delete();
        }
    } catch (error) {
        console.error('오래된 백업 정리 중 오류:', error);
    }
}

// 백업 다운로드
async function downloadBackup(backupId) {
    try {
        const backupDoc = await db.collection('backups').doc(backupId).get();
        const backup = backupDoc.data();
        
        if (!backup.storagePath) {
            throw new Error('백업 파일을 찾을 수 없습니다.');
        }
        
        const storageRef = firebase.storage().ref(backup.storagePath);
        const url = await storageRef.getDownloadURL();
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${formatDate(backup.createdAt)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error('백업 다운로드 중 오류:', error);
        showError('백업을 다운로드하는 중 오류가 발생했습니다.');
    }
}

// 백업 복구
async function restoreBackup(backupId) {
    if (!confirm('이 백업으로 시스템을 복구하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    try {
        showLoading('백업을 복구하는 중입니다...');
        
        const backupDoc = await db.collection('backups').doc(backupId).get();
        const backup = backupDoc.data();
        
        if (!backup.storagePath) {
            throw new Error('백업 파일을 찾을 수 없습니다.');
        }
        
        const storageRef = firebase.storage().ref(backup.storagePath);
        const url = await storageRef.getDownloadURL();
        
        const response = await fetch(url);
        const backupData = await response.json();
        
        // 현재 데이터 백업
        await createManualBackup();
        
        // 데이터 복구
        for (const [collectionId, docs] of Object.entries(backupData)) {
            const batch = db.batch();
            const collectionRef = db.collection(collectionId);
            
            // 기존 데이터 삭제
            const existingDocs = await collectionRef.get();
            existingDocs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 백업 데이터 복구
            docs.forEach(doc => {
                const docRef = collectionRef.doc(doc.id);
                delete doc.id;
                batch.set(docRef, doc);
            });
            
            await batch.commit();
        }
        
        hideLoading();
        showSuccess('백업이 성공적으로 복구되었습니다.');
        location.reload();
    } catch (error) {
        hideLoading();
        console.error('백업 복구 중 오류:', error);
        showError('백업을 복구하는 중 오류가 발생했습니다.');
    }
}

// 백업 삭제
async function deleteBackup(backupId) {
    if (!confirm('이 백업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    try {
        const backupDoc = await db.collection('backups').doc(backupId).get();
        const backup = backupDoc.data();
        
        if (backup.storagePath) {
            const storageRef = firebase.storage().ref(backup.storagePath);
            await storageRef.delete();
        }
        
        await backupDoc.ref.delete();
        showSuccess('백업이 삭제되었습니다.');
        loadBackupHistory();
    } catch (error) {
        console.error('백업 삭제 중 오류:', error);
        showError('백업을 삭제하는 중 오류가 발생했습니다.');
    }
}

// 시스템 로그 분석 초기화
function initializeLogAnalysis() {
    loadLogAnalysis();
    setupLogFilters();
    setupLogCharts();
}

// 로그 분석 데이터 로드
async function loadLogAnalysis() {
    try {
        const startDate = document.getElementById('logStartDate').value;
        const endDate = document.getElementById('logEndDate').value;
        const logType = document.getElementById('logTypeFilter').value;
        
        const logs = await fetchLogs(startDate, endDate, logType);
        const analysis = analyzeLogs(logs);
        
        updateLogAnalysis(analysis);
        updateLogCharts(analysis);
    } catch (error) {
        console.error('로그 분석 데이터 로드 중 오류:', error);
        showError('로그 분석 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 로그 데이터 가져오기
async function fetchLogs(startDate, endDate, logType) {
    let query = db.collection('logs');
    
    if (startDate) {
        query = query.where('timestamp', '>=', new Date(startDate));
    }
    if (endDate) {
        query = query.where('timestamp', '<=', new Date(endDate));
    }
    if (logType !== 'all') {
        query = query.where('type', '==', logType);
    }
    
    const snapshot = await query.orderBy('timestamp', 'desc').get();
    const logs = [];
    
    snapshot.forEach(doc => {
        logs.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return logs;
}

// 로그 분석
function analyzeLogs(logs) {
    const analysis = {
        totalLogs: logs.length,
        logTypes: {},
        errorLevels: {},
        timeDistribution: {},
        userActivities: {},
        ipAddresses: {},
        errorPatterns: {}
    };
    
    logs.forEach(log => {
        // 로그 유형 분석
        analysis.logTypes[log.type] = (analysis.logTypes[log.type] || 0) + 1;
        
        // 에러 레벨 분석
        if (log.level) {
            analysis.errorLevels[log.level] = (analysis.errorLevels[log.level] || 0) + 1;
        }
        
        // 시간 분포 분석
        const hour = new Date(log.timestamp).getHours();
        analysis.timeDistribution[hour] = (analysis.timeDistribution[hour] || 0) + 1;
        
        // 사용자 활동 분석
        if (log.userId) {
            analysis.userActivities[log.userId] = (analysis.userActivities[log.userId] || 0) + 1;
        }
        
        // IP 주소 분석
        if (log.ipAddress) {
            analysis.ipAddresses[log.ipAddress] = (analysis.ipAddresses[log.ipAddress] || 0) + 1;
        }
        
        // 에러 패턴 분석
        if (log.type === 'error' && log.message) {
            const errorKey = log.message.substring(0, 50);
            analysis.errorPatterns[errorKey] = (analysis.errorPatterns[errorKey] || 0) + 1;
        }
    });
    
    return analysis;
}

// 로그 분석 결과 업데이트
function updateLogAnalysis(analysis) {
    // 총 로그 수
    document.getElementById('totalLogs').textContent = analysis.totalLogs;
    
    // 로그 유형 통계
    const logTypesList = document.getElementById('logTypesList');
    logTypesList.innerHTML = '';
    Object.entries(analysis.logTypes).forEach(([type, count]) => {
        const li = document.createElement('li');
        li.innerHTML = `${type}: ${count} (${((count / analysis.totalLogs) * 100).toFixed(1)}%)`;
        logTypesList.appendChild(li);
    });
    
    // 에러 레벨 통계
    const errorLevelsList = document.getElementById('errorLevelsList');
    errorLevelsList.innerHTML = '';
    Object.entries(analysis.errorLevels).forEach(([level, count]) => {
        const li = document.createElement('li');
        li.innerHTML = `${level}: ${count}`;
        errorLevelsList.appendChild(li);
    });
    
    // 사용자 활동 통계
    const userActivitiesList = document.getElementById('userActivitiesList');
    userActivitiesList.innerHTML = '';
    Object.entries(analysis.userActivities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([userId, count]) => {
            const li = document.createElement('li');
            li.innerHTML = `${userId}: ${count} 활동`;
            userActivitiesList.appendChild(li);
        });
    
    // IP 주소 통계
    const ipAddressesList = document.getElementById('ipAddressesList');
    ipAddressesList.innerHTML = '';
    Object.entries(analysis.ipAddresses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([ip, count]) => {
            const li = document.createElement('li');
            li.innerHTML = `${ip}: ${count} 요청`;
            ipAddressesList.appendChild(li);
        });
    
    // 에러 패턴 통계
    const errorPatternsList = document.getElementById('errorPatternsList');
    errorPatternsList.innerHTML = '';
    Object.entries(analysis.errorPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([pattern, count]) => {
            const li = document.createElement('li');
            li.innerHTML = `${pattern}: ${count}회`;
            errorPatternsList.appendChild(li);
        });
}

// 로그 차트 설정
function setupLogCharts() {
    // 로그 유형 차트
    const logTypeCtx = document.getElementById('logTypeChart').getContext('2d');
    new Chart(logTypeCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '로그 유형 분포'
            }
        }
    });
    
    // 시간 분포 차트
    const timeDistributionCtx = document.getElementById('timeDistributionChart').getContext('2d');
    new Chart(timeDistributionCtx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}시`),
            datasets: [{
                label: '로그 발생 수',
                data: [],
                borderColor: '#36A2EB',
                fill: false
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '시간대별 로그 발생 수'
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // 에러 레벨 차트
    const errorLevelCtx = document.getElementById('errorLevelChart').getContext('2d');
    new Chart(errorLevelCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '에러 수',
                data: [],
                backgroundColor: '#FF6384'
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '에러 레벨 분포'
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 로그 차트 업데이트
function updateLogCharts(analysis) {
    // 로그 유형 차트 업데이트
    const logTypeChart = Chart.getChart('logTypeChart');
    logTypeChart.data.labels = Object.keys(analysis.logTypes);
    logTypeChart.data.datasets[0].data = Object.values(analysis.logTypes);
    logTypeChart.update();
    
    // 시간 분포 차트 업데이트
    const timeDistributionChart = Chart.getChart('timeDistributionChart');
    timeDistributionChart.data.datasets[0].data = Array.from({length: 24}, (_, i) => analysis.timeDistribution[i] || 0);
    timeDistributionChart.update();
    
    // 에러 레벨 차트 업데이트
    const errorLevelChart = Chart.getChart('errorLevelChart');
    errorLevelChart.data.labels = Object.keys(analysis.errorLevels);
    errorLevelChart.data.datasets[0].data = Object.values(analysis.errorLevels);
    errorLevelChart.update();
}

// 로그 필터 설정
function setupLogFilters() {
    document.getElementById('logStartDate').addEventListener('change', loadLogAnalysis);
    document.getElementById('logEndDate').addEventListener('change', loadLogAnalysis);
    document.getElementById('logTypeFilter').addEventListener('change', loadLogAnalysis);
}

// 시스템 성능 모니터링 초기화
function initializePerformanceMonitoring() {
    loadPerformanceMetrics();
    setupPerformanceCharts();
    startRealTimePerformanceMonitoring();
}

// 성능 메트릭 로드
async function loadPerformanceMetrics() {
    try {
        const metrics = await fetchPerformanceMetrics();
        updatePerformanceMetrics(metrics);
        updatePerformanceCharts(metrics);
    } catch (error) {
        console.error('성능 메트릭 로드 중 오류:', error);
        showError('성능 메트릭을 불러오는 중 오류가 발생했습니다.');
    }
}

// 성능 메트릭 가져오기
async function fetchPerformanceMetrics() {
    const metrics = {
        cpu: {
            usage: 0,
            temperature: 0,
            cores: 0
        },
        memory: {
            total: 0,
            used: 0,
            free: 0
        },
        disk: {
            total: 0,
            used: 0,
            free: 0
        },
        network: {
            upload: 0,
            download: 0,
            connections: 0
        },
        responseTime: {
            average: 0,
            max: 0,
            min: 0
        },
        requests: {
            total: 0,
            success: 0,
            error: 0
        }
    };

    // 실제 구현에서는 서버 API를 통해 메트릭을 가져옵니다
    // 여기서는 임시 데이터를 사용합니다
    return metrics;
}

// 성능 메트릭 업데이트
function updatePerformanceMetrics(metrics) {
    // CPU 메트릭
    document.getElementById('cpuUsage').textContent = `${metrics.cpu.usage}%`;
    document.getElementById('cpuTemperature').textContent = `${metrics.cpu.temperature}°C`;
    document.getElementById('cpuCores').textContent = metrics.cpu.cores;

    // 메모리 메트릭
    document.getElementById('memoryTotal').textContent = formatBytes(metrics.memory.total);
    document.getElementById('memoryUsed').textContent = formatBytes(metrics.memory.used);
    document.getElementById('memoryFree').textContent = formatBytes(metrics.memory.free);
    document.getElementById('memoryUsage').textContent = 
        `${((metrics.memory.used / metrics.memory.total) * 100).toFixed(1)}%`;

    // 디스크 메트릭
    document.getElementById('diskTotal').textContent = formatBytes(metrics.disk.total);
    document.getElementById('diskUsed').textContent = formatBytes(metrics.disk.used);
    document.getElementById('diskFree').textContent = formatBytes(metrics.disk.free);
    document.getElementById('diskUsage').textContent = 
        `${((metrics.disk.used / metrics.disk.total) * 100).toFixed(1)}%`;

    // 네트워크 메트릭
    document.getElementById('networkUpload').textContent = formatBytes(metrics.network.upload);
    document.getElementById('networkDownload').textContent = formatBytes(metrics.network.download);
    document.getElementById('networkConnections').textContent = metrics.network.connections;

    // 응답 시간 메트릭
    document.getElementById('responseTimeAvg').textContent = `${metrics.responseTime.average}ms`;
    document.getElementById('responseTimeMax').textContent = `${metrics.responseTime.max}ms`;
    document.getElementById('responseTimeMin').textContent = `${metrics.responseTime.min}ms`;

    // 요청 메트릭
    document.getElementById('requestsTotal').textContent = metrics.requests.total;
    document.getElementById('requestsSuccess').textContent = metrics.requests.success;
    document.getElementById('requestsError').textContent = metrics.requests.error;
    document.getElementById('requestsSuccessRate').textContent = 
        `${((metrics.requests.success / metrics.requests.total) * 100).toFixed(1)}%`;
}

// 성능 차트 설정
function setupPerformanceCharts() {
    // CPU 사용량 차트
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    new Chart(cpuCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CPU 사용량 (%)',
                data: [],
                borderColor: '#FF6384',
                fill: false
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'CPU 사용량 추이'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // 메모리 사용량 차트
    const memoryCtx = document.getElementById('memoryChart').getContext('2d');
    new Chart(memoryCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '메모리 사용량 (MB)',
                data: [],
                borderColor: '#36A2EB',
                fill: false
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '메모리 사용량 추이'
            }
        }
    });

    // 네트워크 트래픽 차트
    const networkCtx = document.getElementById('networkChart').getContext('2d');
    new Chart(networkCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '업로드 (MB/s)',
                data: [],
                borderColor: '#FFCE56',
                fill: false
            }, {
                label: '다운로드 (MB/s)',
                data: [],
                borderColor: '#4BC0C0',
                fill: false
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '네트워크 트래픽 추이'
            }
        }
    });

    // 응답 시간 차트
    const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
    new Chart(responseTimeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '평균 응답 시간 (ms)',
                data: [],
                borderColor: '#9966FF',
                fill: false
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '응답 시간 추이'
            }
        }
    });
}

// 성능 차트 업데이트
function updatePerformanceCharts(metrics) {
    const now = new Date();
    const timeLabel = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    // CPU 차트 업데이트
    const cpuChart = Chart.getChart('cpuChart');
    cpuChart.data.labels.push(timeLabel);
    cpuChart.data.datasets[0].data.push(metrics.cpu.usage);
    if (cpuChart.data.labels.length > 20) {
        cpuChart.data.labels.shift();
        cpuChart.data.datasets[0].data.shift();
    }
    cpuChart.update();

    // 메모리 차트 업데이트
    const memoryChart = Chart.getChart('memoryChart');
    memoryChart.data.labels.push(timeLabel);
    memoryChart.data.datasets[0].data.push(metrics.memory.used / (1024 * 1024));
    if (memoryChart.data.labels.length > 20) {
        memoryChart.data.labels.shift();
        memoryChart.data.datasets[0].data.shift();
    }
    memoryChart.update();

    // 네트워크 차트 업데이트
    const networkChart = Chart.getChart('networkChart');
    networkChart.data.labels.push(timeLabel);
    networkChart.data.datasets[0].data.push(metrics.network.upload / (1024 * 1024));
    networkChart.data.datasets[1].data.push(metrics.network.download / (1024 * 1024));
    if (networkChart.data.labels.length > 20) {
        networkChart.data.labels.shift();
        networkChart.data.datasets[0].data.shift();
        networkChart.data.datasets[1].data.shift();
    }
    networkChart.update();

    // 응답 시간 차트 업데이트
    const responseTimeChart = Chart.getChart('responseTimeChart');
    responseTimeChart.data.labels.push(timeLabel);
    responseTimeChart.data.datasets[0].data.push(metrics.responseTime.average);
    if (responseTimeChart.data.labels.length > 20) {
        responseTimeChart.data.labels.shift();
        responseTimeChart.data.datasets[0].data.shift();
    }
    responseTimeChart.update();
}

// 실시간 성능 모니터링 시작
function startRealTimePerformanceMonitoring() {
    // 5초마다 성능 메트릭 업데이트
    setInterval(loadPerformanceMetrics, 5000);
}

// 바이트 포맷팅
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 시스템 알림 초기화
function initializeSystemNotifications() {
    loadNotifications();
    setupNotificationListeners();
    setupNotificationPreferences();
}

// 알림 로드
async function loadNotifications() {
    try {
        const notifications = await fetchNotifications();
        updateNotificationList(notifications);
    } catch (error) {
        console.error('알림 로드 중 오류:', error);
        showError('알림을 불러오는 중 오류가 발생했습니다.');
    }
}

// 알림 가져오기
async function fetchNotifications() {
    const snapshot = await db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
    
    const notifications = [];
    snapshot.forEach(doc => {
        notifications.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return notifications;
}

// 알림 목록 업데이트
function updateNotificationList(notifications) {
    const list = document.getElementById('notificationList');
    list.innerHTML = '';
    
    notifications.forEach(notification => {
        const item = createNotificationItem(notification);
        list.appendChild(item);
    });
}

// 알림 아이템 생성
function createNotificationItem(notification) {
    const item = document.createElement('div');
    item.className = `notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}`;
    item.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${getNotificationIcon(notification.type)}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${formatTime(notification.timestamp)}</div>
        </div>
        <div class="notification-actions">
            <button onclick="markNotificationAsRead('${notification.id}')" class="btn-read">
                <i class="fas fa-check"></i>
            </button>
            <button onclick="deleteNotification('${notification.id}')" class="btn-delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return item;
}

// 알림 아이콘 가져오기
function getNotificationIcon(type) {
    const icons = {
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-triangle',
        'error': 'fa-exclamation-circle',
        'success': 'fa-check-circle',
        'system': 'fa-cog'
    };
    return icons[type] || 'fa-bell';
}

// 알림 리스너 설정
function setupNotificationListeners() {
    // 실시간 알림 구독
    db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const notification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    showNewNotification(notification);
                    updateNotificationBadge();
                }
            });
        });
}

// 새 알림 표시
function showNewNotification(notification) {
    // 알림 목록에 추가
    const list = document.getElementById('notificationList');
    const item = createNotificationItem(notification);
    list.insertBefore(item, list.firstChild);
    
    // 데스크톱 알림 표시
    if (Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/images/logo.png'
        });
    }
}

// 알림 배지 업데이트
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'block' : 'none';
}

// 알림 읽음 표시
async function markNotificationAsRead(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            read: true,
            readAt: new Date()
        });
        updateNotificationBadge();
    } catch (error) {
        console.error('알림 읽음 표시 중 오류:', error);
        showError('알림을 읽음 표시하는 중 오류가 발생했습니다.');
    }
}

// 알림 삭제
async function deleteNotification(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).delete();
        updateNotificationBadge();
    } catch (error) {
        console.error('알림 삭제 중 오류:', error);
        showError('알림을 삭제하는 중 오류가 발생했습니다.');
    }
}

// 알림 설정 관리
function setupNotificationPreferences() {
    // 알림 권한 요청
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // 알림 설정 저장
    document.getElementById('notificationSettings').addEventListener('change', async (e) => {
        const setting = e.target.id;
        const value = e.target.checked;
        
        try {
            await db.collection('users').doc(currentUser.uid).update({
                [`notificationSettings.${setting}`]: value
            });
        } catch (error) {
            console.error('알림 설정 저장 중 오류:', error);
            showError('알림 설정을 저장하는 중 오류가 발생했습니다.');
        }
    });
}

// 알림 전송
async function sendNotification(title, message, type = 'info', userId = null) {
    try {
        const notification = {
            title,
            message,
            type,
            timestamp: new Date(),
            read: false,
            userId
        };
        
        await db.collection('notifications').add(notification);
    } catch (error) {
        console.error('알림 전송 중 오류:', error);
        showError('알림을 전송하는 중 오류가 발생했습니다.');
    }
}

// 시스템 통계 초기화
function initializeSystemStatistics() {
    loadStatistics();
    setupStatisticsCharts();
    setupReportGeneration();
}

// 통계 데이터 로드
async function loadStatistics() {
    try {
        const statistics = await fetchStatistics();
        updateStatisticsDisplay(statistics);
        updateStatisticsCharts(statistics);
    } catch (error) {
        console.error('통계 데이터 로드 중 오류:', error);
        showError('통계 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 통계 데이터 가져오기
async function fetchStatistics() {
    const statistics = {
        users: {
            total: 0,
            active: 0,
            new: 0,
            byRole: {}
        },
        services: {
            total: 0,
            active: 0,
            byCategory: {},
            byStatus: {}
        },
        payments: {
            total: 0,
            monthly: 0,
            byMethod: {},
            byStatus: {}
        },
        performance: {
            responseTime: 0,
            uptime: 0,
            errorRate: 0
        }
    };

    // 사용자 통계
    const usersSnapshot = await db.collection('users').get();
    statistics.users.total = usersSnapshot.size;
    usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.status === 'active') statistics.users.active++;
        if (user.createdAt && new Date(user.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
            statistics.users.new++;
        }
        statistics.users.byRole[user.role] = (statistics.users.byRole[user.role] || 0) + 1;
    });

    // 서비스 통계
    const servicesSnapshot = await db.collection('services').get();
    statistics.services.total = servicesSnapshot.size;
    servicesSnapshot.forEach(doc => {
        const service = doc.data();
        if (service.status === 'active') statistics.services.active++;
        statistics.services.byCategory[service.category] = (statistics.services.byCategory[service.category] || 0) + 1;
        statistics.services.byStatus[service.status] = (statistics.services.byStatus[service.status] || 0) + 1;
    });

    // 결제 통계
    const paymentsSnapshot = await db.collection('payments')
        .where('timestamp', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .get();
    
    paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        statistics.payments.total += payment.amount;
        if (new Date(payment.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
            statistics.payments.monthly += payment.amount;
        }
        statistics.payments.byMethod[payment.method] = (statistics.payments.byMethod[payment.method] || 0) + payment.amount;
        statistics.payments.byStatus[payment.status] = (statistics.payments.byStatus[payment.status] || 0) + payment.amount;
    });

    // 성능 통계
    const performanceSnapshot = await db.collection('performance_metrics')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
    
    let totalResponseTime = 0;
    let totalErrors = 0;
    let totalRequests = 0;
    
    performanceSnapshot.forEach(doc => {
        const metric = doc.data();
        totalResponseTime += metric.responseTime || 0;
        totalErrors += metric.errors || 0;
        totalRequests += metric.requests || 0;
    });
    
    statistics.performance.responseTime = totalResponseTime / performanceSnapshot.size;
    statistics.performance.errorRate = (totalErrors / totalRequests) * 100;
    statistics.performance.uptime = 100 - statistics.performance.errorRate;

    return statistics;
}

// 통계 표시 업데이트
function updateStatisticsDisplay(statistics) {
    // 사용자 통계
    document.getElementById('totalUsers').textContent = statistics.users.total;
    document.getElementById('activeUsers').textContent = statistics.users.active;
    document.getElementById('newUsers').textContent = statistics.users.new;

    // 서비스 통계
    document.getElementById('totalServices').textContent = statistics.services.total;
    document.getElementById('activeServices').textContent = statistics.services.active;

    // 결제 통계
    document.getElementById('totalPayments').textContent = formatCurrency(statistics.payments.total);
    document.getElementById('monthlyPayments').textContent = formatCurrency(statistics.payments.monthly);

    // 성능 통계
    document.getElementById('avgResponseTime').textContent = `${statistics.performance.responseTime.toFixed(2)}ms`;
    document.getElementById('systemUptime').textContent = `${statistics.performance.uptime.toFixed(2)}%`;
    document.getElementById('errorRate').textContent = `${statistics.performance.errorRate.toFixed(2)}%`;
}

// 통계 차트 설정
function setupStatisticsCharts() {
    // 사용자 역할 분포 차트
    const userRoleCtx = document.getElementById('userRoleChart').getContext('2d');
    new Chart(userRoleCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '사용자 역할 분포'
            }
        }
    });

    // 서비스 카테고리 분포 차트
    const serviceCategoryCtx = document.getElementById('serviceCategoryChart').getContext('2d');
    new Chart(serviceCategoryCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '서비스 수',
                data: [],
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '서비스 카테고리 분포'
            }
        }
    });

    // 결제 방법 분포 차트
    const paymentMethodCtx = document.getElementById('paymentMethodChart').getContext('2d');
    new Chart(paymentMethodCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '결제 방법 분포'
            }
        }
    });
}

// 통계 차트 업데이트
function updateStatisticsCharts(statistics) {
    // 사용자 역할 차트 업데이트
    const userRoleChart = Chart.getChart('userRoleChart');
    userRoleChart.data.labels = Object.keys(statistics.users.byRole);
    userRoleChart.data.datasets[0].data = Object.values(statistics.users.byRole);
    userRoleChart.update();

    // 서비스 카테고리 차트 업데이트
    const serviceCategoryChart = Chart.getChart('serviceCategoryChart');
    serviceCategoryChart.data.labels = Object.keys(statistics.services.byCategory);
    serviceCategoryChart.data.datasets[0].data = Object.values(statistics.services.byCategory);
    serviceCategoryChart.update();

    // 결제 방법 차트 업데이트
    const paymentMethodChart = Chart.getChart('paymentMethodChart');
    paymentMethodChart.data.labels = Object.keys(statistics.payments.byMethod);
    paymentMethodChart.data.datasets[0].data = Object.values(statistics.payments.byMethod);
    paymentMethodChart.update();
}

// 보고서 생성 설정
function setupReportGeneration() {
    document.getElementById('generateReport').addEventListener('click', generateReport);
}

// 보고서 생성
async function generateReport() {
    try {
        showLoading('보고서를 생성하는 중입니다...');
        
        const statistics = await fetchStatistics();
        const report = {
            timestamp: new Date(),
            statistics: statistics,
            summary: generateReportSummary(statistics)
        };
        
        // PDF 보고서 생성
        const pdfDoc = await generatePDFReport(report);
        
        // 보고서 저장
        await saveReport(pdfDoc);
        
        hideLoading();
        showSuccess('보고서가 성공적으로 생성되었습니다.');
    } catch (error) {
        hideLoading();
        console.error('보고서 생성 중 오류:', error);
        showError('보고서를 생성하는 중 오류가 발생했습니다.');
    }
}

// 보고서 요약 생성
function generateReportSummary(statistics) {
    return {
        users: `총 ${statistics.users.total}명의 사용자 중 ${statistics.users.active}명이 활성 상태입니다.`,
        services: `총 ${statistics.services.total}개의 서비스 중 ${statistics.services.active}개가 활성 상태입니다.`,
        payments: `최근 30일간 총 ${formatCurrency(statistics.payments.total)}의 결제가 발생했습니다.`,
        performance: `시스템 가동률은 ${statistics.performance.uptime.toFixed(2)}%이며, 평균 응답 시간은 ${statistics.performance.responseTime.toFixed(2)}ms입니다.`
    };
}

// PDF 보고서 생성
async function generatePDFReport(report) {
    // PDF 생성 로직 구현
    // 실제 구현에서는 PDF 라이브러리 사용
    return new Blob([JSON.stringify(report)], { type: 'application/pdf' });
}

// 보고서 저장
async function saveReport(pdfDoc) {
    const storageRef = firebase.storage().ref();
    const reportRef = storageRef.child(`reports/report_${Date.now()}.pdf`);
    await reportRef.put(pdfDoc);
}

// 통화 포맷팅
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

// 시스템 보안 초기화
function initializeSystemSecurity() {
    loadSecuritySettings();
    setupSecurityMonitoring();
    setupSecurityAlerts();
}

// 보안 설정 로드
async function loadSecuritySettings() {
    try {
        const settings = await fetchSecuritySettings();
        updateSecuritySettings(settings);
    } catch (error) {
        console.error('보안 설정 로드 중 오류:', error);
        showError('보안 설정을 불러오는 중 오류가 발생했습니다.');
    }
}

// 보안 설정 가져오기
async function fetchSecuritySettings() {
    const settings = {
        authentication: {
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true
            },
            sessionTimeout: 30, // 분
            maxLoginAttempts: 5,
            twoFactorAuth: true
        },
        firewall: {
            enabled: true,
            rules: [
                {
                    type: 'ip',
                    action: 'block',
                    value: '192.168.1.1'
                },
                {
                    type: 'country',
                    action: 'allow',
                    value: 'KR'
                }
            ]
        },
        encryption: {
            dataAtRest: true,
            dataInTransit: true,
            algorithm: 'AES-256'
        },
        monitoring: {
            enabled: true,
            alertThresholds: {
                failedLogins: 3,
                suspiciousActivity: 1,
                dataBreach: 1
            }
        }
    };

    return settings;
}

// 보안 설정 업데이트
function updateSecuritySettings(settings) {
    // 인증 설정
    document.getElementById('minPasswordLength').value = settings.authentication.passwordPolicy.minLength;
    document.getElementById('requireUppercase').checked = settings.authentication.passwordPolicy.requireUppercase;
    document.getElementById('requireLowercase').checked = settings.authentication.passwordPolicy.requireLowercase;
    document.getElementById('requireNumbers').checked = settings.authentication.passwordPolicy.requireNumbers;
    document.getElementById('requireSpecialChars').checked = settings.authentication.passwordPolicy.requireSpecialChars;
    document.getElementById('sessionTimeout').value = settings.authentication.sessionTimeout;
    document.getElementById('maxLoginAttempts').value = settings.authentication.maxLoginAttempts;
    document.getElementById('twoFactorAuth').checked = settings.authentication.twoFactorAuth;

    // 방화벽 설정
    document.getElementById('firewallEnabled').checked = settings.firewall.enabled;
    updateFirewallRules(settings.firewall.rules);

    // 암호화 설정
    document.getElementById('encryptDataAtRest').checked = settings.encryption.dataAtRest;
    document.getElementById('encryptDataInTransit').checked = settings.encryption.dataInTransit;
    document.getElementById('encryptionAlgorithm').value = settings.encryption.algorithm;

    // 모니터링 설정
    document.getElementById('securityMonitoring').checked = settings.monitoring.enabled;
    document.getElementById('failedLoginThreshold').value = settings.monitoring.alertThresholds.failedLogins;
    document.getElementById('suspiciousActivityThreshold').value = settings.monitoring.alertThresholds.suspiciousActivity;
    document.getElementById('dataBreachThreshold').value = settings.monitoring.alertThresholds.dataBreach;
}

// 방화벽 규칙 업데이트
function updateFirewallRules(rules) {
    const rulesList = document.getElementById('firewallRules');
    rulesList.innerHTML = '';

    rules.forEach(rule => {
        const ruleItem = createFirewallRuleItem(rule);
        rulesList.appendChild(ruleItem);
    });
}

// 방화벽 규칙 아이템 생성
function createFirewallRuleItem(rule) {
    const item = document.createElement('div');
    item.className = 'firewall-rule-item';
    item.innerHTML = `
        <div class="rule-type">${rule.type}</div>
        <div class="rule-action ${rule.action}">${rule.action}</div>
        <div class="rule-value">${rule.value}</div>
        <div class="rule-actions">
            <button class="edit-rule" data-id="${rule.id}">수정</button>
            <button class="delete-rule" data-id="${rule.id}">삭제</button>
        </div>
    `;

    return item;
}

// 보안 모니터링 설정
function setupSecurityMonitoring() {
    // 실시간 보안 이벤트 모니터링
    db.collection('security_events')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .onSnapshot(snapshot => {
            updateSecurityEvents(snapshot);
        });
}

// 보안 이벤트 업데이트
function updateSecurityEvents(snapshot) {
    const eventsList = document.getElementById('securityEvents');
    eventsList.innerHTML = '';

    snapshot.forEach(doc => {
        const event = doc.data();
        const eventItem = createSecurityEventItem(event);
        eventsList.appendChild(eventItem);
    });
}

// 보안 이벤트 아이템 생성
function createSecurityEventItem(event) {
    const item = document.createElement('div');
    item.className = `security-event-item ${event.severity}`;
    item.innerHTML = `
        <div class="event-timestamp">${formatDate(event.timestamp)}</div>
        <div class="event-type">${event.type}</div>
        <div class="event-details">${event.details}</div>
        <div class="event-ip">${event.ip}</div>
        <div class="event-user">${event.userId || '시스템'}</div>
    `;

    return item;
}

// 보안 알림 설정
function setupSecurityAlerts() {
    // 보안 알림 구독
    db.collection('security_alerts')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const alert = doc.data();
                showSecurityAlert(alert);
            });
        });
}

// 보안 알림 표시
function showSecurityAlert(alert) {
    const notification = document.createElement('div');
    notification.className = `security-alert ${alert.severity}`;
    notification.innerHTML = `
        <div class="alert-header">
            <h4>보안 알림</h4>
            <span class="alert-timestamp">${formatDate(alert.timestamp)}</span>
        </div>
        <div class="alert-content">
            <p>${alert.message}</p>
            <div class="alert-details">
                <div class="detail-item">
                    <span class="label">유형:</span>
                    <span class="value">${alert.type}</span>
                </div>
                <div class="detail-item">
                    <span class="label">위험도:</span>
                    <span class="value">${alert.severity}</span>
                </div>
            </div>
        </div>
        <div class="alert-actions">
            <button class="dismiss-alert">닫기</button>
            <button class="view-details">상세보기</button>
        </div>
    `;

    document.body.appendChild(notification);

    // 알림 닫기
    notification.querySelector('.dismiss-alert').addEventListener('click', () => {
        notification.remove();
    });

    // 상세보기
    notification.querySelector('.view-details').addEventListener('click', () => {
        showSecurityAlertDetails(alert);
    });
}

// 보안 알림 상세보기
function showSecurityAlertDetails(alert) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>보안 알림 상세 정보</h3>
            <div class="alert-details">
                <div class="detail-item">
                    <span class="label">시간:</span>
                    <span class="value">${formatDate(alert.timestamp)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">유형:</span>
                    <span class="value">${alert.type}</span>
                </div>
                <div class="detail-item">
                    <span class="label">위험도:</span>
                    <span class="value">${alert.severity}</span>
                </div>
                <div class="detail-item">
                    <span class="label">IP 주소:</span>
                    <span class="value">${alert.ip}</span>
                </div>
                <div class="detail-item">
                    <span class="label">사용자:</span>
                    <span class="value">${alert.userId || '시스템'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">상세 정보:</span>
                    <span class="value">${alert.details}</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="close-modal">닫기</button>
                <button class="take-action">조치하기</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 모달 닫기
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });

    // 조치하기
    modal.querySelector('.take-action').addEventListener('click', () => {
        handleSecurityAlert(alert);
        modal.remove();
    });
}

// 보안 알림 처리
function handleSecurityAlert(alert) {
    // 알림 유형에 따른 처리 로직
    switch (alert.type) {
        case 'failed_login':
            handleFailedLogin(alert);
            break;
        case 'suspicious_activity':
            handleSuspiciousActivity(alert);
            break;
        case 'data_breach':
            handleDataBreach(alert);
            break;
    }
}

// 시스템 통합 기능 초기화
function initializeSystemIntegration() {
    loadIntegrationStatus();
    setupIntegrationListeners();
    loadIntegrationLogs();
}

// 통합 상태 로드
async function loadIntegrationStatus() {
    try {
        const status = await fetchIntegrationStatus();
        updateIntegrationStatus(status);
    } catch (error) {
        console.error('통합 상태 로드 실패:', error);
        showError('통합 상태를 불러오는 중 오류가 발생했습니다.');
    }
}

// 통합 상태 조회
async function fetchIntegrationStatus() {
    const status = {
        'kakao-login': {
            active: true,
            lastChecked: new Date().toISOString()
        },
        'kakao-pay': {
            active: true,
            lastChecked: new Date().toISOString()
        },
        'credit-card': {
            active: true,
            lastChecked: new Date().toISOString()
        },
        'bank-transfer': {
            active: true,
            lastChecked: new Date().toISOString()
        },
        'location-search': {
            active: true,
            lastChecked: new Date().toISOString()
        },
        'route-guidance': {
            active: true,
            lastChecked: new Date().toISOString()
        }
    };
    return status;
}

// 통합 상태 업데이트
function updateIntegrationStatus(status) {
    const apiStatusList = document.querySelector('.api-status-list');
    apiStatusList.innerHTML = '';

    Object.entries(status).forEach(([service, data]) => {
        const statusItem = document.createElement('div');
        statusItem.className = 'api-status-item';
        statusItem.innerHTML = `
            <span class="api-name">${getServiceName(service)}</span>
            <span class="status-indicator ${data.active ? 'active' : 'error'}"></span>
            <span class="last-checked">마지막 확인: ${formatDate(data.lastChecked)}</span>
        `;
        apiStatusList.appendChild(statusItem);
    });
}

// 서비스 이름 가져오기
function getServiceName(service) {
    const names = {
        'kakao-login': '카카오 로그인',
        'kakao-pay': '카카오페이',
        'credit-card': '신용카드 결제',
        'bank-transfer': '계좌이체',
        'location-search': '위치 검색',
        'route-guidance': '경로 안내'
    };
    return names[service] || service;
}

// 통합 리스너 설정
function setupIntegrationListeners() {
    // 서비스 토글 리스너
    document.querySelectorAll('.service-integration-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const service = e.target.dataset.service;
            const active = e.target.checked;
            await toggleServiceIntegration(service, active);
        });
    });

    // 설정 버튼 리스너
    document.querySelectorAll('.configure-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const service = e.target.dataset.service;
            showServiceConfiguration(service);
        });
    });

    // API 상태 확인 버튼 리스너
    document.querySelector('.check-apis').addEventListener('click', async () => {
        await checkAllApis();
    });

    // 로그 필터 리스너
    document.getElementById('log-type').addEventListener('change', () => {
        loadIntegrationLogs();
    });
    document.getElementById('log-service').addEventListener('change', () => {
        loadIntegrationLogs();
    });
}

// 서비스 통합 토글
async function toggleServiceIntegration(service, active) {
    try {
        // TODO: 실제 API 호출로 대체
        console.log(`${service} 서비스 ${active ? '활성화' : '비활성화'}`);
        showSuccess(`${getServiceName(service)}가 ${active ? '활성화' : '비활성화'}되었습니다.`);
        await loadIntegrationStatus();
    } catch (error) {
        console.error('서비스 통합 토글 실패:', error);
        showError('서비스 상태를 변경하는 중 오류가 발생했습니다.');
    }
}

// 서비스 설정 표시
function showServiceConfiguration(service) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${getServiceName(service)} 설정</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="service-config-form">
                    ${getServiceConfigFields(service)}
                    <div class="form-actions">
                        <button type="submit" class="save-btn">저장</button>
                        <button type="button" class="cancel-btn">취소</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 모달 닫기 버튼 이벤트
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });

    // 취소 버튼 이벤트
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    // 폼 제출 이벤트
    modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const config = Object.fromEntries(formData.entries());
        
        try {
            await saveServiceConfig(service, config);
            showSuccess(`${getServiceName(service)} 설정이 저장되었습니다.`);
            modal.remove();
        } catch (error) {
            console.error('서비스 설정 저장 실패:', error);
            showError('서비스 설정을 저장하는 중 오류가 발생했습니다.');
        }
    });
}

// 서비스별 설정 필드 생성
function getServiceConfigFields(service) {
    const fields = {
        'kakao-login': `
            <div class="form-group">
                <label>REST API 키</label>
                <input type="text" name="restApiKey" required>
            </div>
            <div class="form-group">
                <label>JavaScript 키</label>
                <input type="text" name="javascriptKey" required>
            </div>
            <div class="form-group">
                <label>리다이렉트 URI</label>
                <input type="text" name="redirectUri" required>
            </div>
        `,
        'kakao-pay': `
            <div class="form-group">
                <label>CID</label>
                <input type="text" name="cid" required>
            </div>
            <div class="form-group">
                <label>가맹점 코드</label>
                <input type="text" name="partnerCode" required>
            </div>
            <div class="form-group">
                <label>시크릿 키</label>
                <input type="password" name="secretKey" required>
            </div>
        `,
        'credit-card': `
            <div class="form-group">
                <label>가맹점 ID</label>
                <input type="text" name="merchantId" required>
            </div>
            <div class="form-group">
                <label>API 키</label>
                <input type="text" name="apiKey" required>
            </div>
            <div class="form-group">
                <label>시크릿 키</label>
                <input type="password" name="secretKey" required>
            </div>
        `,
        'bank-transfer': `
            <div class="form-group">
                <label>은행 코드</label>
                <input type="text" name="bankCode" required>
            </div>
            <div class="form-group">
                <label>계좌 번호</label>
                <input type="text" name="accountNumber" required>
            </div>
            <div class="form-group">
                <label>예금주</label>
                <input type="text" name="accountHolder" required>
            </div>
        `,
        'location-search': `
            <div class="form-group">
                <label>API 키</label>
                <input type="text" name="apiKey" required>
            </div>
            <div class="form-group">
                <label>시크릿 키</label>
                <input type="password" name="secretKey" required>
            </div>
        `,
        'route-guidance': `
            <div class="form-group">
                <label>API 키</label>
                <input type="text" name="apiKey" required>
            </div>
            <div class="form-group">
                <label>시크릿 키</label>
                <input type="password" name="secretKey" required>
            </div>
        `
    };

    return fields[service] || '';
}

// 서비스 설정 저장
async function saveServiceConfig(service, config) {
    try {
        // TODO: 실제 API 호출로 대체
        console.log(`${service} 설정 저장:`, config);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    } catch (error) {
        console.error('서비스 설정 저장 실패:', error);
        throw error;
    }
}

// 모든 API 상태 확인
async function checkAllApis() {
    try {
        showLoading('API 상태를 확인하는 중...');
        await loadIntegrationStatus();
        showSuccess('API 상태 확인이 완료되었습니다.');
    } catch (error) {
        console.error('API 상태 확인 실패:', error);
        showError('API 상태를 확인하는 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 통합 로그 로드
async function loadIntegrationLogs() {
    try {
        const logType = document.getElementById('log-type').value;
        const logService = document.getElementById('log-service').value;
        const logs = await fetchIntegrationLogs(logType, logService);
        updateIntegrationLogs(logs);
    } catch (error) {
        console.error('통합 로그 로드 실패:', error);
        showError('통합 로그를 불러오는 중 오류가 발생했습니다.');
    }
}

// 통합 로그 조회
async function fetchIntegrationLogs(type = 'all', service = 'all') {
    // TODO: 실제 로그 조회 API 호출로 대체
    const logs = [
        {
            id: '1',
            timestamp: new Date().toISOString(),
            type: 'info',
            service: 'kakao',
            message: '카카오 API 연결 성공'
        },
        {
            id: '2',
            timestamp: new Date().toISOString(),
            type: 'error',
            service: 'payment',
            message: '결제 API 연결 실패'
        }
    ];

    return logs.filter(log => {
        if (type !== 'all' && log.type !== type) return false;
        if (service !== 'all' && log.service !== service) return false;
        return true;
    });
}

// 통합 로그 업데이트
function updateIntegrationLogs(logs) {
    const logList = document.querySelector('.integration-log-list');
    logList.innerHTML = '';

    logs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = `log-item ${log.type}`;
        logItem.innerHTML = `
            <div class="timestamp">${formatDate(log.timestamp)}</div>
            <div class="message">${log.message}</div>
        `;
        logList.appendChild(logItem);
    });
}