// Firebase SDK 모듈 import
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBWADxFFsfyJGRqI09AJx1pDQhrWv_pQzo",
    authDomain: "onestop-88b05.firebaseapp.com",
    projectId: "onestop-88b05",
    storageBucket: "onestop-88b05.appspot.com",
    messagingSenderId: "189609926021",
    appId: "1:189609926021:web:19a330a166ff2ba58378ec",
    measurementId: "G-FKZLEVZ8M8"
};

// Firebase 초기화
let app;
let auth;
let db;
let storage;

try {
    // Firebase 앱 초기화
    app = initializeApp(firebaseConfig);
    console.log('Firebase 앱 초기화 성공');

    // Auth 초기화
    auth = getAuth(app);
    console.log('Firebase Auth 초기화 성공');

    // Firestore 초기화
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
    console.log('Firestore 초기화 성공');

    // Storage 초기화
    storage = getStorage(app);
    console.log('Storage 초기화 성공');

    // Firebase 초기화 완료 이벤트 발생
    window.firebaseInitialized = true;
    window.dispatchEvent(new Event('firebaseInitialized'));
    console.log('Firebase 초기화 완료 이벤트 발생');

} catch (error) {
    console.error('Firebase 초기화 실패:', error);
    throw error;
}

// 모듈 export
export { app, auth, db, storage };