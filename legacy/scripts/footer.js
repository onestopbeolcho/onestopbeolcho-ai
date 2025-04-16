// /scripts/footer.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const footerContainer = document.getElementById('app-footer');
  if (!footerContainer) {
    console.error('app-footer 요소를 찾을 수 없습니다.');
    return;
  }

  const db = getFirestore();

  // footer.html 로드
  fetch('/components/footer.html')
    .then(response => response.text())
    .then(html => {
      footerContainer.innerHTML = html;
      setupEventListeners();
      checkAuthState();
    })
    .catch(error => console.error('푸터 로드 오류:', error));

  function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          window.location.href = '/';
        } catch (error) {
          console.error('로그아웃 실패:', error);
        }
      });
    }
  }

  function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
      const loginButton = document.getElementById('loginButton');
      const logoutButton = document.getElementById('logoutButton');
      
      if (user) {
        // 로그인 상태
        if (loginButton) loginButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
      } else {
        // 로그아웃 상태
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
      }
    });
  }
});

export function loadFooter() {
  fetch('/components/footer.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('footer-container').innerHTML = html;
    })
    .catch(error => console.error('푸터 로드 오류:', error));
}