// /components/footer.js
document.addEventListener('DOMContentLoaded', () => {
  const footerContainer = document.getElementById('footer-container');
  if (footerContainer) {
    footerContainer.innerHTML = `
      <footer>
        <p>© 2025 벌초 서비스 플랫폼. All rights reserved.</p>
        <p>문의: <a href="tel:010-1234-5678">010-1234-5678</a> | 이메일: <a href="mailto:support@onestopbeolcho.com">support@onestopbeolcho.com</a></p>
      </footer>
    `;
  }
});