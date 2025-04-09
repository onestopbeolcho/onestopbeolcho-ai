// /scripts/nav.js
import { auth } from '/scripts/firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('nav-container');
  if (!navContainer) {
    console.error('nav-container 요소를 찾을 수 없습니다.');
    return;
  }

  const db = getFirestore();

  const isMobile = window.innerWidth <= 768;
  const isLoggedIn = auth.currentUser;
  
  async function initializeNav() {
    let userRole = null;
    if (isLoggedIn) {
      try {
        userRole = await getUserRole(auth.currentUser.uid);
      } catch (error) {
        console.error('사용자 역할을 가져오는데 실패했습니다:', error);
      }
    }

    let navContent = `
      <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container">
          <a class="navbar-brand" href="index.html">
            원스톱 벌초
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
            <ul class="navbar-nav">
              <li class="nav-item">
                <a class="nav-link" href="pricing.html">비용안내</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="request.html">서비스 신청</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="portfolio.html">포트폴리오</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="news.html">뉴스</a>
              </li>
              ${userRole === 'admin' ? `
                <li class="nav-item">
                  <a class="nav-link" href="admin.html">관리자</a>
                </li>
              ` : userRole === 'worker' ? `
                <li class="nav-item">
                  <a class="nav-link" href="worker.html">작업자</a>
                </li>
              ` : ''}
              ${isLoggedIn ? `
                <li class="nav-item">
                  <a class="nav-link" href="mypage.html">마이페이지</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="#" id="logout-link">로그아웃</a>
                </li>
              ` : `
                <li class="nav-item">
                  <a class="nav-link" href="login.html">로그인</a>
                </li>
              `}
            </ul>
          </div>
        </div>
      </nav>
    `;

    navContainer.innerHTML = navContent;

    // 모바일 메뉴 버튼 클릭 시 스크롤 방지
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
      navbarToggler.addEventListener('click', function() {
        if (document.body.style.overflow === 'hidden') {
          document.body.style.overflow = 'auto';
        } else {
          document.body.style.overflow = 'hidden';
        }
      });
    }

    // 모바일 메뉴 아이템 클릭 시 메뉴 닫기
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse.classList.contains('show')) {
          navbarCollapse.classList.remove('show');
          document.body.style.overflow = 'auto';
        }
      });
    });

    // 로그아웃 버튼 이벤트 리스너
    const logoutBtn = document.getElementById('logout-link');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await auth.signOut();
          window.location.href = '/';
        } catch (error) {
          console.error('로그아웃 실패:', error);
          alert('로그아웃에 실패했습니다.');
        }
      });
    }

    // 메뉴 열림/닫힘 시 padding-top 동적 조정
    const collapse = document.querySelector('#navbarNav');
    if (collapse) {
      collapse.addEventListener('show.bs.collapse', () => {
        const navbar = document.querySelector('.navbar');
        const navbarHeight = navbar ? navbar.offsetHeight : 56; // 기본값 56px
        // collapseHeight 계산 개선
        collapse.style.display = 'block'; // 일시적으로 표시하여 높이 계산
        const collapseHeight = collapse.scrollHeight || 0; // scrollHeight로 정확한 높이 계산
        collapse.style.display = ''; // 원래 상태로 복원
        // 본문 밀어내기 위해 body의 padding-top만 조정
        document.body.style.paddingTop = `${navbarHeight + collapseHeight}px`;
      });

      collapse.addEventListener('hide.bs.collapse', () => {
        const navbar = document.querySelector('.navbar');
        const navbarHeight = navbar ? navbar.offsetHeight : 56; // 기본값 56px
        document.body.style.paddingTop = `${navbarHeight}px`;
      });

      // 초기 상태에서도 padding-top 설정
      const navbar = document.querySelector('.navbar');
      const navbarHeight = navbar ? navbar.offsetHeight : 56;
      document.body.style.paddingTop = `${navbarHeight}px`;
    }
  }

  initializeNav();

  // 사용자 인증 상태 감지 및 네비게이션 렌더링
  onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged 호출 - 사용자 UID:', user ? user.uid : '없음');
    let userData = {};
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userData = userSnap.data();
        console.log('사용자 데이터 로드 성공:', userData);
      } else {
        console.warn('사용자 데이터가 Firestore에 존재하지 않음:', user.uid);
      }
    } else {
      console.log('사용자가 로그인하지 않은 상태');
    }
    renderNav(user, userData);
  });
});

async function renderNav(user, userRole) {
  const nav = document.getElementById('nav-container');
  if (!nav) return;

  nav.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container">
        <a class="navbar-brand" href="index.html">
          원스톱 벌초
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <a class="nav-link" href="pricing.html">비용안내</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="request.html">서비스 신청</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="portfolio.html">포트폴리오</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="news.html">뉴스</a>
            </li>
            ${user ? `
              ${userRole === 'admin' ? `
                <li class="nav-item">
                  <a class="nav-link" href="admin.html">관리자</a>
                </li>
              ` : ''}
              ${userRole === 'worker' || userRole === 'admin' ? `
                <li class="nav-item">
                  <a class="nav-link" href="worker.html">작업자</a>
                </li>
              ` : ''}
              <li class="nav-item">
                <a class="nav-link" href="mypage.html">마이페이지</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#" id="logout-link">로그아웃</a>
              </li>
            ` : `
              <li class="nav-item">
                <a class="nav-link" href="login.html">로그인</a>
              </li>
            `}
          </ul>
        </div>
      </div>
    </nav>
  `;

  // 로그아웃 버튼 이벤트 리스너
  const logoutBtn = document.getElementById('logout-link');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await auth.signOut();
        window.location.href = 'index.html';
      } catch (error) {
        console.error('로그아웃 오류:', error);
      }
    });
  }
}