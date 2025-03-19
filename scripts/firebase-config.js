import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Firebase Authentication 초기화 및 서비스 참조 가져오기
const auth = getAuth(app);

// Cloud Firestore 초기화 및 서비스 참조 가져오기
const db = getFirestore(app);

// 내보내기 (firebaseConfig 추가)
export { app, auth, db, firebaseConfig };