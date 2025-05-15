// Firebase 모듈 import
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { app } from './firebase-config.js';

// 네비게이션 바 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeNavbar();
});

function initializeNavbar() {
    const auth = getAuth(app);

    // 네비게이션 바 HTML
    const navbar = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top">
        <div class="container">
            <a class="navbar-brand" href="index.html" title="원스톱 벌초 홈페이지">
                <img src="images/mainlogo.webp" alt="원스톱 벌초 로고" height="40">
                <span class="site-name">원스톱 벌초</span>
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <div class="mobile-profile-section d-lg-none mb-3">
                    <div id="mobileProfileSection"></div>
                </div>
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="index.html">홈</a></li>
                    <li class="nav-item"><a class="nav-link" href="service_info.html">서비스 안내</a></li>
                    <li class="nav-item"><a class="nav-link" href="request.html">서비스 신청</a></li>
                    <li class="nav-item"><a class="nav-link" href="news.html">뉴스</a></li>
                    <li class="nav-item"><a class="nav-link" href="contact.html">문의하기</a></li>
                    <li class="nav-item" id="mypageNavItem" style="display: none;"><a class="nav-link" href="mypage.html">마이페이지</a></li>
                    <li class="nav-item dropdown" id="profileDropdown" style="display: none;">
                        <a class="nav-link dropdown-toggle" href="#" id="profileDropdownLink" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <img id="profileImg" src="images/default-profile.png" alt="프로필" class="rounded-circle profile-img" width="30" height="30">
                            <span class="profile-name" id="profileName">사용자</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="profileDropdownLink">
                            <li><a class="dropdown-item" href="mypage.html">마이페이지</a></li>
                            <li><a class="dropdown-item" href="mypage.html#profile">프로필 설정</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" id="logoutButton">로그아웃</a></li>
                        </ul>
                    </li>
                    <li class="nav-item" id="loginNavItem"><a class="nav-link" href="login.html">로그인</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <style>
        .profile-img {
            margin-right: 5px;
            object-fit: cover;
            border: 2px solid #fff;
            box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
        }
        .profile-name {
            font-weight: 500;
            display: inline-block;
            max-width: 100px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            vertical-align: middle;
        }
        @media (max-width: 768px) {
            .profile-name {
                max-width: 80px;
            }
        }
        .navbar {
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 10px 0;
            z-index: 1000;
        }
        .navbar-brand img {
            height: 40px;
        }
        .nav-link {
            color: #000 !important;
            font-weight: 500;
            padding: 0.5rem 1rem;
        }
        .nav-link:hover {
            color: #1E88E5 !important;
        }
        .dropdown-menu {
            border: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dropdown-item {
            padding: 0.5rem 1.5rem;
        }
        .dropdown-item:hover {
            background-color: #E3F2FD;
            color: #1E88E5;
        }

        @media (max-width: 991.98px) {
            body {
                padding-top: 56px;
            }
            .navbar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
            }
            .navbar-collapse {
                background: white;
                padding: 1rem;
                position: fixed;
                top: 56px;
                left: 0;
                bottom: 0;
                width: 280px;
                transform: translateX(-100%);
                transition: transform 0.3s ease-in-out;
                box-shadow: 2px 0 5px rgba(0,0,0,0.1);
                overflow-y: auto;
                z-index: 1000;
            }
            .navbar-collapse.show {
                transform: translateX(0);
            }
            .mobile-profile-section {
                border-bottom: 1px solid #eee;
                margin: -1rem -1rem 1rem -1rem;
            }
            .mobile-profile-section img {
                object-fit: cover;
                border: 2px solid #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .navbar-nav {
                padding: 0.5rem 0;
                width: 100%;
            }
            .nav-item {
                margin: 0.5rem 0;
                width: 100%;
            }
            .nav-link {
                padding: 0.75rem 1rem;
                display: block;
                width: 100%;
                text-align: left;
            }
            .dropdown-menu {
                position: static !important;
                float: none;
                width: 100%;
                margin-top: 0;
                background-color: #f8f9fa;
                border: none;
                border-radius: 0;
                box-shadow: none;
            }
            .dropdown-item {
                padding: 0.75rem 1rem;
            }
            .profile-name {
                max-width: 80px;
            }
            main {
                margin-top: 0;
                padding-top: 0;
            }
            .container {
                position: relative;
                z-index: 1;
            }
            .hero-section {
                margin-top: 0;
                padding-top: 20px;
            }
        }
    </style>
    `;

    // 네비게이션 바 삽입
    const navbarContainer = document.getElementById('navbar-placeholder');
    if (navbarContainer) {
        navbarContainer.innerHTML = navbar;
    }

    // 모바일 프로필 섹션 HTML 생성
    function createMobileProfileSection(user) {
        if (user) {
            return `
                <div class="d-flex align-items-center p-3 bg-light rounded">
                    <div>
                        <h6 class="mb-1">${user.displayName || '사용자'}</h6>
                        <a href="mypage.html" class="btn btn-sm btn-outline-primary">마이페이지</a>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="text-center p-3 bg-light rounded">
                    <p class="mb-2">로그인하고 더 많은 기능을 이용하세요</p>
                    <a href="login.html" class="btn btn-primary">로그인하기</a>
                </div>
            `;
        }
    }

    // 인증 상태 변경 감지
    onAuthStateChanged(auth, (user) => {
        const mypageNavItem = document.getElementById('mypageNavItem');
        const profileDropdown = document.getElementById('profileDropdown');
        const loginNavItem = document.getElementById('loginNavItem');
        const profileImg = document.getElementById('profileImg');
        const profileName = document.getElementById('profileName');
        const mobileProfileSection = document.getElementById('mobileProfileSection');
        
        if (user) {
            // 로그인 상태
            if (mypageNavItem) mypageNavItem.style.display = 'block';
            if (profileDropdown) profileDropdown.style.display = 'block';
            if (loginNavItem) loginNavItem.style.display = 'none';
            
            // 프로필 정보 업데이트
            if (profileImg) {
                profileImg.src = user.photoURL || 'images/default-profile.png';
            }
            if (profileName) {
                profileName.textContent = user.displayName || user.email.split('@')[0];
            }
            
            // 모바일 프로필 섹션 업데이트
            if (mobileProfileSection) {
                mobileProfileSection.innerHTML = createMobileProfileSection(user);
            }
            
            // 로그아웃 버튼 이벤트 리스너
            const logoutButton = document.getElementById('logoutButton');
            if (logoutButton) {
                logoutButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await signOut(auth);
                        window.location.href = 'index.html';
                    } catch (error) {
                        console.error('로그아웃 실패:', error);
                    }
                });
            }
        } else {
            // 비로그인 상태
            if (mypageNavItem) mypageNavItem.style.display = 'none';
            if (profileDropdown) profileDropdown.style.display = 'none';
            if (loginNavItem) loginNavItem.style.display = 'block';
            
            // 모바일 프로필 섹션 업데이트
            if (mobileProfileSection) {
                mobileProfileSection.innerHTML = createMobileProfileSection(null);
            }
        }
    });

    // 스크롤 이벤트 리스너 추가 (데스크톱용)
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar && window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else if (navbar) {
            navbar.classList.remove('scrolled');
        }
    });
}