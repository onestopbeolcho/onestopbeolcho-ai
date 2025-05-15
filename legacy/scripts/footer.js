// 푸터 컴포넌트 로드
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('components/footer.html');
        const footerHtml = await response.text();
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            footerPlaceholder.innerHTML = footerHtml;
        }
    } catch (error) {
        console.error('푸터 로드 실패:', error);
    }
}); 