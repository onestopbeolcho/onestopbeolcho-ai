// 공통 컴포넌트 로드 함수
async function loadComponents() {
    try {
        // 네비게이션 로드
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            const navResponse = await fetch('components/nav.html');
            const navHtml = await navResponse.text();
            navbarPlaceholder.innerHTML = navHtml;
        }

        // 푸터 로드
        const footerPlaceholders = document.querySelectorAll('#footer-placeholder');
        if (footerPlaceholders.length > 0) {
            const footerResponse = await fetch('components/footer.html');
            const footerHtml = await footerResponse.text();
            footerPlaceholders.forEach(placeholder => {
                placeholder.innerHTML = footerHtml;
            });
        }

        // 푸터 스타일 로드
        const footerStyle = document.createElement('link');
        footerStyle.rel = 'stylesheet';
        footerStyle.href = 'components/footer.css';
        document.head.appendChild(footerStyle);

        // 푸터 스크립트 로드
        const footerScript = document.createElement('script');
        footerScript.src = 'components/footer.js';
        document.body.appendChild(footerScript);
    } catch (error) {
        console.error('컴포넌트 로드 중 오류 발생:', error);
    }
}

// DOM이 로드되면 컴포넌트 로드
document.addEventListener('DOMContentLoaded', loadComponents); 