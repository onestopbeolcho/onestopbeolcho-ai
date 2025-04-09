// /scripts/nav.js
import { auth } from '/scripts/firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('nav-container');
  if (!navContainer) {
    console.warn('nav-container 요소를 찾을 수 없습니다.');
    alert('내비게이션 바를 로드할 수 없습니다. 페이지를 새로고침해 주세요.');
    return;
  }

  const db = getFirestore();

  // 네비게이션 렌더링 함수
  function renderNav(user, userData) {
    console.log('renderNav 호출 - 사용자:', user ? user.uid : '없음', 'userData:', userData);
    const isAdmin = userData?.isAdmin || false;
    const isWorker = (userData?.isWorker && userData?.workerApproved) || isAdmin;
    console.log('isAdmin:', isAdmin, 'isWorker:', isWorker);

    navContainer.innerHTML = `
      <nav class="navbar navbar-expand-lg shadow-sm">
        <div class="container">
          <a class="navbar-brand" href="index.html">원스톱 벌초</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
              <li class="nav-item"><a class="nav-link" href="index.html">홈</a></li>
              <li class="nav-item"><a class="nav-link" href="pricing.html">비용 안내</a></li>
              <li class="nav-item"><a class="nav-link" href="request.html">서비스 신청</a></li>
              <li class="nav-item"><a class="nav-link" href="rerequest.html">비회원 재신청/조회</a></li>
              <li class="nav-item"><a class="nav-link" href="mypage.html">마이페이지</a></li>
              ${isAdmin ? '<li class="nav-item"><a class="nav-link" href="admin/admin.html">관리자</a></li>' : ''}
              ${isWorker ? '<li class="nav-item"><a class="nav-link" href="worker.html">작업자</a></li>' : ''}
              ${user
                ? '<li class="nav-item"><a class="nav-link" href="#" id="logout-btn">로그아웃</a></li>'
                : '<li class="nav-item"><a class="nav-link" href="login.html">로그인</a></li>' +
                  '<li class="nav-item"><a class="nav-link" href="signup.html">회원가입</a></li>'}
            </ul>
          </div>
        </div>
      </nav>
    `;

    // 로그아웃 버튼 이벤트 추가
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          console.log('로그아웃 성공');
          window.location.href = '/login.html';
        } catch (error) {
          console.error('로그아웃 실패:', error);
        }
      });
    }

    // Bootstrap Collapse 컴포넌트 초기화
    const toggler = document.querySelector('.navbar-toggler');
    const collapse = document.querySelector('#navbarNav');
    if (!toggler || !collapse) {
      console.warn('navbar-toggler 또는 navbar-collapse 요소를 찾을 수 없습니다.');
      alert('내비게이션 바를 로드할 수 없습니다. 페이지를 새로고침해 주세요.');
      return;
    }

    const bsCollapse = new bootstrap.Collapse(collapse, {
      toggle: false
    });

    // 메뉴 열림/닫힘 시 padding-top 동적 조정
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