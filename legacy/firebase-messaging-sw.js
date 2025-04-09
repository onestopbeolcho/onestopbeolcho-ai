importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-messaging.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZQqXQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ",
  authDomain: "onestop-88b05.firebaseapp.com",
  projectId: "onestop-88b05",
  storageBucket: "onestop-88b05.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqrstuv"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드 메시지 수신:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/icons/icon-192x192.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 시 동작 (선택 사항)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.click_action)
  );
});