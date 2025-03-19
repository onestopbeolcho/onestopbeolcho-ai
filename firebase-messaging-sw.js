importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWADxFFsfyJGRqI09AJx1pDQhrWv_pQzo",
  authDomain: "onestop-88b05.firebaseapp.com",
  projectId: "onestop-88b05",
  storageBucket: "onestop-88b05.firebasestorage.app",
  messagingSenderId: "189609926021",
  appId: "1:189609926021:web:19a330a166ff2ba58378ec",
  measurementId: "G-FKZLEVZ8M8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드 메시지 수신:', payload);
  const notificationTitle = payload.notification.title || '새 알림';
  const notificationOptions = {
    body: payload.notification.body || '알림 내용이 없습니다.',
    icon: '/assets/icons/icon-192x192.png',
    data: { click_action: '/mypage.html' } // 클릭 시 이동할 URL
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 시 동작 (선택 사항)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.click_action)
  );
});