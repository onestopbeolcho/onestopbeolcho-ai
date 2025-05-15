// Firebase 모듈 import
import { loginUser, loginWithGoogle } from './auth.js';

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const googleLoginButton = document.getElementById('google-login-button');
    const errorMessage = document.getElementById('error-message');

    if (!loginForm || !emailInput || !passwordInput || !loginButton || !googleLoginButton || !errorMessage) {
        console.error('필요한 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    // 로그인 폼 제출 처리
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            loginButton.disabled = true;
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
            
            await loginUser(email, password);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('로그인 실패:', error);
            errorMessage.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
            errorMessage.style.display = 'block';
        } finally {
            loginButton.disabled = false;
        }
    });

    // Google 로그인 처리
    googleLoginButton.addEventListener('click', async () => {
        try {
            googleLoginButton.disabled = true;
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
            
            await loginWithGoogle();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Google 로그인 실패:', error);
            let errorMessageText = 'Google 로그인에 실패했습니다.';
            
            // 구체적인 에러 메시지 처리
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessageText = '로그인 창이 닫혔습니다. 다시 시도해주세요.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessageText = '팝업이 차단되었습니다. 팝업 차단을 해제해주세요.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessageText = '로그인이 취소되었습니다.';
            }
            
            errorMessage.textContent = errorMessageText;
            errorMessage.style.display = 'block';
        } finally {
            googleLoginButton.disabled = false;
        }
    });
}); 