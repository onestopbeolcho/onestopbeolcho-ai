// /scripts/footer.js
import { firebaseConfig } from '/scripts/firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  let app, auth, db;
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase 초기화 실패:', error);
    loadFooter(null);
    return;
  }

  // 푸터 생성 함수
  function createFooter() {
    const footer = document.createElement('footer');
    footer.classList.add('footer', 'bg-white', 'py-2'); // rounded-top 제거
    footer.innerHTML = `
      <div class="container text-center">
        <p>전국 대표번호: <a href="tel:15551487">1555-1487</a></p>
        <p>상호: (주)메타아이엠 | 대표: 주명호 | 사업자등록번호: 812-87-03681</p>
        <p>통신판매업 신고 번호 제 2025-4450149-30-2-00021 호</p>
        <p>주소: 충청북도 진천군 덕산읍 예지1길 3-1 3층</p>
        <div id="footer-links" class="mt-2">
          © 2025 원스톱 벌초. All rights reserved. |
          <a href="/pricing.html" class="btn btn-outline-primary btn-sm rounded-pill mx-1">비용 안내</a> |
          <a href="/request.html" class="btn btn-outline-primary btn-sm rounded-pill mx-1">서비스 신청</a> |
          <a href="/worker-signup.html" class="btn btn-outline-primary btn-sm rounded-pill mx-1">작업자 회원가입</a>
        </div>
      </div>
    `;
    return footer;
  }

  // 푸터 링크 업데이트 함수
  function updateFooterLinks(user, userData) {
    const footerLinksContainer = document.getElementById('footer-links');
    if (!footerLinksContainer) return;
    footerLinksContainer.innerHTML = "© 2025 원스톱 벌초. All rights reserved. | ";

    const defaultLinks = [
      { href: "/pricing.html", text: "비용 안내" },
      { href: "/request.html", text: "서비스 신청" },
      { href: "/worker-signup.html", text: "작업자 회원가입" }
    ];
    defaultLinks.forEach(link => {
      const a = document.createElement('a');
      a.href = link.href;
      a.classList.add('btn', 'btn-outline-primary', 'btn-sm', 'rounded-pill', 'mx-1');
      a.textContent = link.text;
      footerLinksContainer.appendChild(a);
    });

    if (user) {
      if (userData.isAdmin) {
        const adminLink = document.createElement('a');
        adminLink.href = "/admin/admin.html";
        adminLink.classList.add('btn', 'btn-outline-primary', 'btn-sm', 'rounded-pill', 'mx-1');
        adminLink.textContent = "관리자 페이지";
        footerLinksContainer.appendChild(adminLink);
      }
      if (userData.isWorker) {
        const workerLink = document.createElement('a');
        workerLink.href = "/worker.html";
        workerLink.classList.add('btn', 'btn-outline-primary', 'btn-sm', 'rounded-pill', 'mx-1');
        workerLink.textContent = "작업자 페이지";
        footerLinksContainer.appendChild(workerLink);
      }
      const logoutButton = document.createElement('button');
      logoutButton.id = "logout-btn";
      logoutButton.classList.add('btn', 'btn-outline-primary', 'btn-sm', 'rounded-pill', 'mx-1');
      logoutButton.textContent = "로그아웃";
      logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
          window.location.href = '/login.html';
        }).catch((error) => {
          console.error('로그아웃 실패:', error);
        });
      });
      footerLinksContainer.appendChild(logoutButton);
    } else {
      const loginLink = document.createElement('a');
      loginLink.href = "/login.html";
      loginLink.classList.add('btn', 'btn-outline-primary', 'btn-sm', 'rounded-pill', 'mx-1');
      loginLink.textContent = "로그인";
      footerLinksContainer.appendChild(loginLink);
    }
  }

  // 푸터 로드 함수
  async function loadFooter(user = null) {
    const currentPath = window.location.pathname;
    const isAdminOrWorkerPage = currentPath.includes('admin.html') || currentPath.includes('worker.html');
    const footerContainer = document.getElementById('footer-container') || document.createElement('div');
    footerContainer.id = 'footer-container';
    footerContainer.innerHTML = '';
    footerContainer.classList.remove('bg-dark', 'text-white', 'py-4');
    footerContainer.classList.add('bg-white', 'py-2'); // .footer 클래스 제거, rounded-top 제거

    const newFooter = createFooter();
    footerContainer.appendChild(newFooter);

    if (isAdminOrWorkerPage) {
      console.log('footer.js: admin.html 또는 worker.html 페이지이므로 기본 푸터만 표시');
      return;
    }

    if (!user) {
      onAuthStateChanged(auth, async (user) => {
        let userData = {};
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userData = userSnap.data();
          }
        }
        updateFooterLinks(user, userData);
      });
    } else {
      let userData = {};
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userData = userSnap.data();
        }
      }
      updateFooterLinks(user, userData);
    }
  }

  loadFooter();
  console.log('footer.js: 실행 완료');
});