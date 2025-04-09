import { auth } from './firebase-config.js';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithCustomToken
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-functions.js';

const db = getFirestore();

// Google 로그인 함수
export async function googleSignIn() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await saveUserData(result.user);
    window.location.href = '/index.html';
  } catch (error) {
    console.error('구글 로그인 오류:', error);
    alert('구글 로그인에 실패했습니다. 다시 시도해주세요.');
  }
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

// 네이버 로그인 함수
export async function naverSignIn() {
  try {
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('naverState', state);
    
    const clientId = 'YOUR_NAVER_CLIENT_ID';
    const redirectUri = 'https://onestopbeolcho.com/callback/naver.html';
    const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    
    window.location.href = naverLoginUrl;
  } catch (error) {
    console.error('네이버 로그인 오류:', error);
    alert('네이버 로그인에 실패했습니다. 다시 시도해주세요.');
  }
}

// 네이버 로그인 콜백 처리
export async function handleNaverCallback() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('naverState');

    // state 검증
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    // Firebase Functions 호출
    const getFirebaseTokenByNaverCode = httpsCallable(getFunctions(), 'getFirebaseTokenByNaverCode');
    const { data } = await getFirebaseTokenByNaverCode({ code });
    const { firebaseToken } = data;

    // Firebase 로그인
    await signInWithCustomToken(auth, firebaseToken);
    window.location.href = '/index.html';
  } catch (error) {
    console.error('네이버 로그인 콜백 오류:', error);
    alert('네이버 로그인에 실패했습니다: ' + error.message);
  }
}

// 카카오 로그인 함수
export async function kakaoSignIn() {
  try {
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('kakaoState', state);
    
    const clientId = 'YOUR_KAKAO_CLIENT_ID';
    const redirectUri = 'https://onestopbeolcho.com/callback/kakao.html';
    const kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    
    window.location.href = kakaoLoginUrl;
  } catch (error) {
    console.error('카카오 로그인 오류:', error);
    alert('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
  }
}

// 카카오 로그인 콜백 처리
export async function handleKakaoCallback() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('kakaoState');

    // state 검증
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    // Firebase Functions 호출 (ID 토큰 포함)
    const getFirebaseTokenByKakaoCode = httpsCallable(getFunctions(), 'getFirebaseTokenByKakaoCode');
    const { data } = await getFirebaseTokenByKakaoCode({ 
      code,
      includeIdToken: true // ID 토큰 포함 요청
    });
    const { firebaseToken, idToken } = data;

    // Firebase 로그인
    await signInWithCustomToken(auth, firebaseToken);
    
    // 사용자 정보 저장 (ID 토큰에서 정보 추출)
    if (idToken) {
      const userInfo = JSON.parse(atob(idToken.split('.')[1]));
      await saveUserData(auth.currentUser, 'kakao', {
        name: userInfo.nickname,
        email: userInfo.email,
        profileImage: userInfo.picture
      });
    }
    
    window.location.href = '/index.html';
  } catch (error) {
    console.error('카카오 로그인 콜백 오류:', error);
    alert('카카오 로그인에 실패했습니다: ' + error.message);
    window.location.href = '/login.html';
  }
}

// 사용자 정보 저장
async function saveUserData(user, provider, additionalData = {}) {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || additionalData.name,
      photoURL: user.photoURL || additionalData.profileImage,
      provider: provider,
      lastLoginAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      userRole: 'user',
      isAdmin: false,
      isWorker: false,
      ...additionalData
    }, { merge: true });
    console.log('사용자 정보 저장 성공');
  } catch (error) {
    console.error('사용자 정보 저장 오류:', error);
  }
}

// 네이버 로그인
// checkAuth 함수만 내보내기
export { checkAuth };