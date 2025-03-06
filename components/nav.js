// /components/nav.js
function updateNav(isLoggedIn, userRole) {
  console.log('updateNav 호출:', { isLoggedIn, userRole });

  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) {
    console.error('nav-container가 존재하지 않습니다. DOM 로드 확인 필요.');
    return;
  }

  const navMenu = navContainer.querySelector('.nav-menu');
  const authLinkUpper = document.querySelector('#auth-link-upper'); // 상단 네비게이션에서 가져옴
  const profileTab = navMenu.querySelector('#profile-tab');
  const workerLink = document.querySelector('#worker-link');
  const adminLink = document.querySelector('#admin-link');

  if (!navMenu || !authLinkUpper || !profileTab) {
    console.error('nav.js: 필수 요소가 누락되었습니다.', { navMenu, authLinkUpper, profileTab });
    return;
  }

  if (workerLink) {
    workerLink.parentElement.style.display = (!isLoggedIn || (userRole !== 'worker' && userRole !== 'admin')) ? 'none' : 'inline-block';
  }

  if (adminLink) {
    adminLink.parentElement.style.display = (!isLoggedIn || userRole !== 'admin') ? 'none' : 'inline-block';
  }

  if (profileTab) {
    profileTab.parentElement.style.display = 'inline-block';
    if (!isLoggedIn) {
      profileTab.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/login.html';
      });
    }
  }

  if (isLoggedIn) {
    authLinkUpper.textContent = '로그아웃';
    authLinkUpper.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (firebase?.auth) {
          await firebase.auth().signOut();
          window.location.replace('/login.html');
        } else {
          throw new Error('Firebase Auth가 로드되지 않음');
        }
      } catch (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃 실패: ' + error.message);
      }
    });
  } else {
    authLinkUpper.textContent = '회원가입';
    authLinkUpper.href = '/signup.html';
  }
}

function initializeNavWhenFirebaseReady(attempt = 0, maxAttempts = 100) {
  // DOM이 로드되었는지 먼저 확인
  if (document.readyState === 'loading') {
    console.log('DOM 로드 대기 중...');
    document.addEventListener('DOMContentLoaded', () => initializeNavWhenFirebaseReady(attempt, maxAttempts));
    return;
  }

  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) {
    console.error('nav-container 요소를 찾을 수 없습니다. HTML 확인 필요.');
    return;
  }

  const loadingDiv = navContainer.querySelector('.nav-loading');
  if (loadingDiv) loadingDiv.style.display = 'block';

  if (attempt >= maxAttempts) {
    console.error('Firebase SDK 로드 실패: 최대 재시도 횟수 초과.');
    updateNav(false, null);
    if (loadingDiv) loadingDiv.style.display = 'none';
    return;
  }

  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
    console.log(`Firebase SDK 로드 대기 중... (시도 ${attempt + 1}/${maxAttempts})`);
    setTimeout(() => initializeNavWhenFirebaseReady(attempt + 1, maxAttempts), 100);
    return;
  }

  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      console.log('세션 지속성 설정 완료: LOCAL');
      firebase.auth().onAuthStateChanged(async user => {
        let isLoggedIn, userRole;
        if (user) {
          console.log('사용자 로그인 상태 감지:', user.uid, user.email);
          isLoggedIn = true;
          try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            userRole = userDoc.exists ? userDoc.data().role || null : null;
          } catch (error) {
            console.error('사용자 역할 로드 오류:', error);
            userRole = null;
          }
        } else {
          console.log('사용자 비로그인 상태 감지');
          isLoggedIn = false;
          userRole = null;
        }
        updateNav(isLoggedIn, userRole);
        if (loadingDiv) loadingDiv.style.display = 'none';
      }, error => {
        console.error('onAuthStateChanged 오류:', error);
        updateNav(false, null);
        if (loadingDiv) loadingDiv.style.display = 'none';
      });
    })
    .catch(error => {
      console.error('세션 지속성 설정 오류:', error);
      updateNav(false, null);
      if (loadingDiv) loadingDiv.style.display = 'none';
    });
}

// DOM 로드 후 초기화 시작
if (document.readyState !== 'loading') {
  console.log('nav.js 로드 완료, 즉시 초기화 시작');
  initializeNavWhenFirebaseReady();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('nav.js 로드 완료, DOM 로드 후 초기화');
    initializeNavWhenFirebaseReady();
  });
}