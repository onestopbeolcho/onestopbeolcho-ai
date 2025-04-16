// 푸터 로드 함수
async function loadFooter() {
    try {
        // 푸터 HTML 로드
        const footerResponse = await fetch('/components/footer.html');
        const footerHtml = await footerResponse.text();
        document.getElementById('footer-container').innerHTML = footerHtml;

        // 푸터 스타일 로드
        const footerStyle = document.createElement('link');
        footerStyle.rel = 'stylesheet';
        footerStyle.href = '/components/footer.css';
        document.head.appendChild(footerStyle);
    } catch (error) {
        console.error('푸터 로드 중 오류 발생:', error);
    }
}

// DOM이 로드되면 푸터 로드
document.addEventListener('DOMContentLoaded', loadFooter);

document.addEventListener('DOMContentLoaded', function() {
    // 카테고리 토글 기능
    const categoryTitles = document.querySelectorAll('.title.category');
    
    categoryTitles.forEach(title => {
        title.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const arrow = this.querySelector('.arrow-down-icon');
            
            // 현재 클릭된 카테고리만 토글
            if (content.style.display === 'none' || !content.style.display) {
                content.style.display = 'block';
                this.classList.add('open');
            } else {
                content.style.display = 'none';
                this.classList.remove('open');
            }
        });
    });

    // 모바일에서 초기 상태 설정
    if (window.innerWidth <= 768) {
        const categoryContents = document.querySelectorAll('.title.category + .content-list');
        categoryContents.forEach(content => {
            content.style.display = 'none';
        });
    }
}); 