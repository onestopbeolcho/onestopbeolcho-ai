// Firebase 초기화 대기
waitForFirebase().then(() => {
    console.log('Firebase 초기화 완료');
    initializeSignup();
}).catch(error => {
    console.error('Firebase 초기화 실패:', error);
    alert('서비스 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
});

// 회원가입 초기화
function initializeSignup() {
    // DOM 요소
    const termsAgree = document.getElementById('termsAgree');
    const nextToSignup = document.getElementById('nextToSignup');
    const termsSection = document.getElementById('terms-section');
    const signupFormSection = document.getElementById('signup-form-section');
    const signupForm = document.getElementById('signupForm');

    if (!termsAgree || !nextToSignup || !termsSection || !signupFormSection || !signupForm) {
        console.error('필요한 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    console.log('이용약관 체크박스:', termsAgree);
    console.log('다음 버튼:', nextToSignup);
    console.log('이용약관 섹션:', termsSection);
    console.log('회원가입 폼 섹션:', signupFormSection);

    // 이용약관 체크박스 이벤트
    termsAgree.addEventListener('change', function() {
        nextToSignup.disabled = !this.checked;
    });

    // 다음 버튼 클릭 이벤트
    nextToSignup.addEventListener('click', function() {
        termsSection.style.display = 'none';
        signupFormSection.style.display = 'block';
    });

    // 회원가입 폼 제출 이벤트
    signupForm.addEventListener('submit', handleSignup);

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const profileImageInput = document.getElementById('profileImage');
    const submitButton = document.getElementById('submitButton');
    const loadingSpinner = document.getElementById('loadingSpinner');

    if (!emailInput || !passwordInput || !confirmPasswordInput || 
        !nameInput || !phoneInput || !profileImageInput || !submitButton || !loadingSpinner) {
        console.error('필요한 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    // Google 로그인 버튼
    const googleButton = document.getElementById('googleSignup');
    if (googleButton) {
        googleButton.addEventListener('click', handleGoogleSignup);
    }

    // 비밀번호 확인
    confirmPasswordInput.addEventListener('input', () => {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('비밀번호가 일치하지 않습니다.');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });
}

// 회원가입 처리
async function handleSignup(event) {
    event.preventDefault();
    
    const form = event.target;
    if (!form.checkValidity()) {
        event.stopPropagation();
        form.classList.add('was-validated');
        return;
    }

    const email = form.email.value;
    const password = form.password.value;
    const name = form.name.value;
    const phone = form.phone.value;
    const currentTime = new Date();

    // 로딩 스피너와 버튼 상태 관리
    const submitButton = document.getElementById('submitButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    try {
        // 로딩 상태로 변경
        submitButton.disabled = true;
        loadingSpinner.classList.remove('d-none');

        console.log('회원가입 시작:', { email, name, phone });

        // 이메일/비밀번호로 회원가입
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('Firebase Auth 사용자 생성 완료:', user.uid);

        // 사용자 프로필 업데이트
        await user.updateProfile({
            displayName: name
        });
        console.log('사용자 프로필 업데이트 완료');

        // Firestore에 사용자 정보 저장
        const userData = {
            displayName: name,
            email: email,
            phone: phone,
            createdAt: currentTime,
            lastLoginAt: currentTime,
            updatedAt: currentTime,
            role: 'user',
            status: 'active',
            isAdmin: false,
            isWorker: false,
            photoURL: '',
            isadmin: false
        };

        console.log('Firestore에 저장할 데이터:', userData);
        
        await firestore.collection('users').doc(user.uid).set(userData);
        console.log('Firestore 사용자 정보 저장 완료');

        // 성공 메시지 표시
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success mt-3';
        successMessage.textContent = '회원가입이 완료되었습니다. 잠시 후 마이페이지로 이동합니다.';
        form.parentNode.insertBefore(successMessage, form.nextSibling);

        // 2초 후 마이페이지로 이동
        setTimeout(() => {
            window.location.href = 'mypage.html';
        }, 2000);
    } catch (error) {
        console.error('회원가입 중 오류 발생:', error);
        
        // 오류 메시지 표시
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger mt-3';
        errorMessage.textContent = getErrorMessage(error.code);
        form.parentNode.insertBefore(errorMessage, form.nextSibling);
    } finally {
        // 로딩 상태 해제
        submitButton.disabled = false;
        loadingSpinner.classList.add('d-none');
    }
}

// Google 로그인 처리
async function handleGoogleSignup() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        // Firestore에 사용자 정보 저장
        await firestore.collection('users').doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: new Date(),
            role: 'user'
        }, { merge: true });

        // 성공 메시지 표시
        showSuccess('Google 계정으로 가입이 완료되었습니다. 메인 페이지로 이동합니다.');
        
        // 메인 페이지로 이동
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        console.error('Google 로그인 중 오류 발생:', error);
        showError(getErrorMessage(error.code));
    }
}

// 에러 메시지 표시
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.signup-container').insertBefore(alertDiv, document.querySelector('form'));
}

// 성공 메시지 표시
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.signup-container').insertBefore(alertDiv, document.querySelector('form'));
}

// Firebase 에러 코드에 따른 메시지 반환
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return '이미 사용 중인 이메일 주소입니다.';
        case 'auth/invalid-email':
            return '유효하지 않은 이메일 주소입니다.';
        case 'auth/operation-not-allowed':
            return '이메일/비밀번호 로그인이 비활성화되어 있습니다.';
        case 'auth/weak-password':
            return '비밀번호가 너무 약합니다.';
        case 'auth/popup-closed-by-user':
            return '로그인 창이 닫혔습니다. 다시 시도해주세요.';
        case 'auth/cancelled-popup-request':
            return '로그인 요청이 취소되었습니다.';
        case 'auth/popup-blocked':
            return '팝업이 차단되었습니다. 팝업 차단을 해제해주세요.';
        default:
            return '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
    }
} 