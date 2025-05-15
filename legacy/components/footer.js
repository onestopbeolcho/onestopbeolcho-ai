// 푸터 로드 함수
async function loadFooter() {
    try {
        const footerContainer = document.getElementById('footer-placeholder');
        if (!footerContainer) {
            console.warn('푸터 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // 푸터 HTML 로드
        const footerResponse = await fetch('components/footer.html');
        if (!footerResponse.ok) {
            throw new Error('푸터 HTML을 불러올 수 없습니다.');
        }
        const footerHtml = await footerResponse.text();
        footerContainer.innerHTML = footerHtml;

        // 푸터 스타일이 이미 로드되어 있는지 확인
        if (!document.querySelector('link[href="components/footer.css"]')) {
            const footerStyle = document.createElement('link');
            footerStyle.rel = 'stylesheet';
            footerStyle.href = 'components/footer.css';
            document.head.appendChild(footerStyle);
        }

        console.log('푸터 로드 완료');
    } catch (error) {
        console.error('푸터 로드 중 오류 발생:', error);
        // 오류 발생 시 기본 푸터 표시
        const footerContainer = document.getElementById('footer-placeholder');
        if (footerContainer) {
            footerContainer.innerHTML = `
                <div class="alert alert-warning">
                    푸터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
                </div>
            `;
        }
    }
}

// DOM이 로드되면 푸터 로드
document.addEventListener('DOMContentLoaded', loadFooter);

// 카테고리 토글 기능
document.addEventListener('DOMContentLoaded', function() {
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