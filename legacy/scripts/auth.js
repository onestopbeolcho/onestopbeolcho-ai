import { auth, googleProvider } from './firebase-config.js';
import { browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-functions.js';
import { getAuth } from 'firebase/auth';
import Cookies from 'js-cookie';

const db = getFirestore();
const AUTH_COOKIE_NAME = 'onestop_auth';

// 인증 상태 지속성 설정
auth.setPersistence(browserLocalPersistence);

// Google 로그인 함수
export async function googleSignIn() {
  try {
    console.log('구글 로그인 시작');
    console.log('현재 도메인:', window.location.hostname);
    
    console.log('구글 로그인 팝업 표시');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('구글 로그인 성공:', result.user);
    
    // 사용자 정보 저장
    await saveUserData(result.user, 'google');
    
    // 현재 도메인에 따라 리디렉션 URL 설정
    const redirectUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8000/index.html'
      : 'https://onestopbeolcho.com/index.html';
    
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('구글 로그인 오류:', error);
    console.error('오류 코드:', error.code);
    console.error('오류 메시지:', error.message);
    alert('구글 로그인에 실패했습니다. 다시 시도해주세요.');
  }
}

// 로그인 상태 확인 함수
export const checkAuthState = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    // 쿠키에서 인증 상태 확인
    const authCookie = Cookies.get(AUTH_COOKIE_NAME);
    
    if (user && authCookie) {
      // Firebase 인증과 쿠키가 모두 유효한 경우
      return user;
    } else if (user && !authCookie) {
      // Firebase 인증은 유효하지만 쿠키가 없는 경우
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 }); // 7일간 유효
      return user;
    } else if (!user && authCookie) {
      // 쿠키는 있지만 Firebase 인증이 유효하지 않은 경우
      Cookies.remove(AUTH_COOKIE_NAME);
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('인증 상태 확인 중 오류 발생:', error);
    return null;
  }
};

// 페이지 로드 시 인증 상태 확인
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const user = await checkAuthState();
    if (!user && window.location.pathname !== '/login.html') {
      console.log('로그인 필요 - 로그인 페이지로 리디렉션');
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('인증 상태 확인 실패:', error);
    // 오류 발생 시에도 로그인 페이지로 리디렉션
    if (window.location.pathname !== '/login.html') {
      window.location.href = '/login.html';
    }
  }
});

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
// checkAuth 함수 정의
async function checkAuth() {
  try {
    const user = await checkAuthState();
    return user;
  } catch (error) {
    console.error('인증 확인 오류:', error);
    return null;
  }
}

// 필요한 함수들만 export
export {
  googleSignIn,
  checkAuthState,
  naverSignIn,
  handleNaverCallback,
  kakaoSignIn,
  handleKakaoCallback,
  checkAuth
};

// 용자 프로필 업데이트 함수
async function updateUserProfile(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // 프로필 이미지 업데이트
            const profileImage = document.getElementById('profileImage');
            if (userData.profileImage) {
                profileImage.src = userData.profileImage;
            } else {
                profileImage.src = '/images/default-profile.png';
            }
            
            // 사용자 이름 업데이트
            const userName = document.getElementById('userName');
            userName.textContent = userData.name || user.email.split('@')[0];
        }
    } catch (error) {
        console.error('프로필 업데이트 중 오류:', error);
    }
}

// 사용자 역할 확인 함수
async function checkUserRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data().role || 'user';
        }
        return 'user';
    } catch (error) {
        console.error('사용자 역할 확인 중 오류:', error);
        return 'user';
    }
}

// 인증 상태 변경 감지
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // 로그인 상태
        document.querySelectorAll('.auth-required').forEach(element => {
            element.style.display = 'block';
        });
        document.querySelectorAll('.auth-not-required').forEach(element => {
            element.style.display = 'none';
        });

        // 프로필 업데이트
        await updateUserProfile(user);

        // 사용자 역할 확인
        const userRole = await checkUserRole(user.uid);
        
        // 역할에 따른 메뉴 표시
        if (userRole === 'admin') {
            document.querySelectorAll('.admin-menu').forEach(element => {
                element.style.display = 'block';
            });
        } else if (userRole === 'worker') {
            document.querySelectorAll('.worker-menu').forEach(element => {
                element.style.display = 'block';
            });
        }
    } else {
        // 로그아웃 상태
        document.querySelectorAll('.auth-required').forEach(element => {
            element.style.display = 'none';
        });
        document.querySelectorAll('.auth-not-required').forEach(element => {
            element.style.display = 'block';
        });
        document.querySelectorAll('.admin-menu').forEach(element => {
            element.style.display = 'none';
        });
        document.querySelectorAll('.worker-menu').forEach(element => {
            element.style.display = 'none';
        });
    }
});

// 로그인 함수
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('로그인 오류:', error);
        throw error;
    }
}

// 로그아웃 함수
export const logout = async () => {
  try {
    const auth = getAuth();
    await signOut(auth);
    
    // 로그아웃 시 쿠키 삭제
    Cookies.remove(AUTH_COOKIE_NAME);
    
    console.log('로그아웃 성공');
  } catch (error) {
    console.error('로그아웃 실패:', error);
    throw error;
  }
};

// 로그인 버튼 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', googleSignIn);
    }
});

export const loginWithGoogle = async () => {
  try {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // 로그인 성공 시 쿠키 설정
    Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 });
    
    console.log('Google 로그인 성공:', result.user);
    return result.user;
  } catch (error) {
    console.error('Google 로그인 실패:', error);
    throw error;
  }
};