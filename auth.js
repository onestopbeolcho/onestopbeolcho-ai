import { auth } from '/scripts/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

async function checkAuth(needLogin) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user && needLogin) {
        window.location.href = 'index.html';
        resolve(null); // 로그인 필요 시 리디렉션 후 null 반환
      } else if (user) {
        console.log("user is logged in, uid:", user.uid);
        resolve(user); // 로그인 시 사용자 정보 반환
      } else {
        console.log("user is not logged in, but no need to redirect");
        resolve(null); // 로그인 불필요 시 null 반환
      }
    });
  });
}
export { checkAuth };