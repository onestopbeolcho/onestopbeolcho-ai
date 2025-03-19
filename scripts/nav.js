document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('nav-container');
  if (!navContainer) {
    console.warn('nav-container 요소를 찾을 수 없습니다.');
    alert('내비게이션 바를 로드할 수 없습니다. 페이지를 새로고침해 주세요.');
    return;
  }

  // 내비게이션 바 HTML 삽입
  navContainer.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div class="container">
        <a class="navbar-brand" href="index.html">원스톱 벌초</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item"><a class="nav-link" href="index.html">홈</a></li>
            <li class="nav-item"><a class="nav-link" href="request.html">서비스 신청</a></li>
            <li class="nav-item"><a class="nav-link" href="login.html">로그인</a></li>
            <li class="nav-item"><a class="nav-link" href="signup.html">회원가입</a></li>
            <li class="nav-item"><a class="nav-link" href="pricing.html">비용 안내</a></li>
            <li class="nav-item"><a class="nav-link" href="mypage.html">마이페이지</a></li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  // Bootstrap 로드 확인
  if (typeof bootstrap === 'undefined') {
    console.error('Bootstrap이 로드되지 않았습니다.');
    alert('내비게이션 바를 로드할 수 없습니다. 페이지를 새로고침해 주세요.');
    return;
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
    toggle: false // 초기 상태에서 열리지 않도록 설정
  });

  // 메뉴 열림/닫힘 시 padding-top 동적 조정
  collapse.addEventListener('show.bs.collapse', () => {
    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const collapseHeight = collapse.offsetHeight;
    document.body.style.paddingTop = `${navbarHeight + collapseHeight}px`;
  });

  collapse.addEventListener('hide.bs.collapse', () => {
    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    document.body.style.paddingTop = `${navbarHeight}px`;
  });
});