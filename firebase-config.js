// Firebase 보안 규칙 설정
firebase.firestore().settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// 서비스 신청 컬렉션에 대한 보안 규칙 설정
const db = firebase.firestore();
db.collection('serviceRequests').doc('rules').set({
  rules: {
    serviceRequests: {
      '.read': true,
      '.write': true
    }
  }
}).catch(error => {
  console.error('보안 규칙 설정 오류:', error);
}); 