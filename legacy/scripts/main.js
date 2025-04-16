// 관리자 메뉴 표시 함수
function checkAdminAccess() {
    const user = firebase.auth().currentUser;
    if (user) {
        // Firestore에서 사용자 역할 확인
        firebase.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    const isAdmin = userData.role === 'admin' || 
                                  (Array.isArray(userData.roles) && userData.roles.includes('admin'));
                    
                    const adminMenu = document.getElementById('adminMenu');
                    if (adminMenu) {
                        adminMenu.style.display = isAdmin ? 'block' : 'none';
                    }
                }
            })
            .catch(error => {
                console.error('관리자 권한 확인 중 오류:', error);
            });
    }
}

// 인증 상태 변경 시 관리자 메뉴 확인
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        checkAdminAccess();
    } else {
        const adminMenu = document.getElementById('adminMenu');
        if (adminMenu) {
            adminMenu.style.display = 'none';
        }
    }
}); 