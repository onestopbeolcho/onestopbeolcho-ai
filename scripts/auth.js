import { auth } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';


const provider = new GoogleAuthProvider();

// Google 로그인 함수
function googleSignIn() {
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      console.log('Google 로그인 성공:', user);
      window.location.href = '/index.html'; // 메인 페이지로 리다이렉션
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error('Google 로그인 오류:', errorCode, errorMessage);
      alert('Google 로그인 실패: ' + errorMessage);
    });
}

// 인증 상태 확인 함수
async function checkAuth(needLogin) {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("인증 상태 유지 설정 완료: browserLocalPersistence");
  } catch (error) {
    console.error("인증 상태 유지 설정 실패:", error);
  }
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user && needLogin) {
        console.log("사용자가 로그인하지 않은 상태, 리다이렉션 필요");
        window.location.href = 'index.html';
        resolve(null);
      } else if (user) {
        console.log("user is logged in, uid:", user.uid);
        resolve(user);
      } else {
        console.log("user is not logged in, but no need to redirect");
        resolve(null);
      }
    });
  });
}

// 두 함수 모두 내보내기
export { googleSignIn, checkAuth };