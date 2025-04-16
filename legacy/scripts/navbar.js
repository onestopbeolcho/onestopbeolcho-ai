document.addEventListener('DOMContentLoaded', () => {
    const navbarHtml = `
        <nav class="navbar navbar-expand-lg navbar-light bg-light fixed-top">
            <div class="container">
                <a class="navbar-brand" href="index.html" title="원스톱 벌초 홈페이지">
                    <img src="images/mainlogo.webp" alt="원스톱 벌초 로고" height="40">
                    <span class="site-name">원스톱 벌초</span>
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-label="내비게이션 토글">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item"><a class="nav-link active" aria-current="page" href="index.html">홈</a></li>
                        <li class="nav-item"><a class="nav-link" href="service_info.html">서비스 안내</a></li>
                        <li class="nav-item"><a class="nav-link" href="request.html">서비스 신청</a></li>
                        <li class="nav-item"><a class="nav-link" href="pricing.html">요금 안내</a></li>
                        <li class="nav-item"><a class="nav-link" href="news.html">뉴스</a></li>
                        <li class="nav-item"><a class="nav-link" href="contact.html">문의하기</a></li>
                        <li class="nav-item"><a class="nav-link" href="mypage.html">마이페이지</a></li>
                        <li class="nav-item"><a class="nav-link" href="login.html">로그인</a></li>
                        <li class="nav-item d-lg-none"><a class="nav-link" href="index.html"><i class="fas fa-home"></i>홈</a></li>
                        <li class="nav-item d-lg-none"><a class="nav-link" href="search.html"><i class="fas fa-search"></i>검색</a></li>
                        <li class="nav-item d-lg-none"><a class="nav-link" href="messages.html"><i class="fas fa-envelope"></i>메시지</a></li>
                        <li class="nav-item d-lg-none"><a class="nav-link" href="account.html"><i class="fas fa-user"></i>계정</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    `;
    document.getElementById('navbar-placeholder').innerHTML = navbarHtml;
}); 