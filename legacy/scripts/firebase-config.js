// Firebase SDK import
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { 
  getAuth, 
  browserLocalPersistence,
  GoogleAuthProvider,
  setPersistence
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

// Firebase 설정
export const firebaseConfig = {
  apiKey: "AIzaSyBWADxFFsfyJGRqI09AJx1pDQhrWv_pQzo",
  authDomain: "onestop-88b05.firebaseapp.com",
  projectId: "onestop-88b05",
  storageBucket: "onestop-88b05.firebasestorage.app",
  messagingSenderId: "189609926021",
  appId: "1:189609926021:web:19a330a166ff2ba58378ec",
  measurementId: "G-FKZLEVZ8M8"
};

// Firebase 앱 초기화
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// 인증 상태 지속성 설정
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('인증 상태 지속성 설정 완료');
  })
  .catch((error) => {
    console.error('인증 상태 지속성 설정 오류:', error);
  });

// 구글 로그인 제공자 설정
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, db, storage, googleProvider };