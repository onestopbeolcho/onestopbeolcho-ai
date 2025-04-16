import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBWADxFFsfyJGRqI09AJx1pDQhrWv_pQzo",
    authDomain: "onestop-88b05.firebaseapp.com",
    projectId: "onestop-88b05",
    storageBucket: "onestop-88b05.firebasestorage.app",
    messagingSenderId: "189609926021",
    appId: "1:189609926021:web:19a330a166ff2ba58378ec",
    measurementId: "G-FKZLEVZ8M8"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// 서비스 초기화
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// 서비스 내보내기
export { auth, db, storage, analytics }; 