const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function syncExistingUsers() {
  try {
    // 모든 사용자 가져오기
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;
    
    console.log(`총 ${users.length}명의 사용자를 동기화합니다.`);
    
    // 각 사용자에 대해 Firestore에 문서 생성
    for (const user of users) {
      try {
        const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          await admin.firestore().collection('users').doc(user.uid).set({
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            role: 'user'
          });
          console.log(`사용자 ${user.uid} (${user.email})가 Firestore에 동기화되었습니다.`);
        } else {
          console.log(`사용자 ${user.uid} (${user.email})는 이미 Firestore에 존재합니다.`);
        }
      } catch (error) {
        console.error(`사용자 ${user.uid} 동기화 중 오류 발생:`, error);
      }
    }
    
    console.log('모든 사용자 동기화 완료');
  } catch (error) {
    console.error('사용자 목록 가져오기 중 오류 발생:', error);
  }
}

// 스크립트 실행
syncExistingUsers(); 