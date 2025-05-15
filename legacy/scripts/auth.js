// Firebase 모듈 import
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    browserLocalPersistence,
    setPersistence
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { app } from './firebase-config.js';

// Firebase 인증 초기화
const auth = getAuth(app);

// 로그인 함수
export async function loginUser(email, password) {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('로그인 실패:', error);
        throw error;
    }
}

// 회원가입 함수
export async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('회원가입 실패:', error);
        throw error;
    }
}

// 로그아웃 함수
export async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('로그아웃 실패:', error);
        throw error;
    }
}

// Google 로그인 함수
export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error('Google 로그인 실패:', error);
        throw error;
    }
}

// 인증 상태 변경 감지
export function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
}