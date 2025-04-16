// 알림 전송
async function sendNotification(title, data) {
  try {
    const db = firebase.firestore();
    const messaging = firebase.messaging();

    // 알림 데이터 생성
    const notification = {
      title: title,
      body: getNotificationBody(data),
      data: data,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    // 알림 저장
    await db.collection('notifications').add(notification);

    // FCM 토큰으로 알림 전송
    if (data.customerId) {
      // 고객에게 알림
      const customerDoc = await db.collection('users').doc(data.customerId).get();
      if (customerDoc.exists && customerDoc.data().fcmToken) {
        await messaging.send({
          token: customerDoc.data().fcmToken,
          notification: {
            title: title,
            body: getNotificationBody(data)
          },
          data: data
        });
      }
    }

    // 작업자에게 알림 (지역 기반)
    if (data.address) {
      const workersSnapshot = await db.collection('users')
        .where('role', '==', 'worker')
        .where('workerInfo.status', '==', 'approved')
        .get();

      workersSnapshot.forEach(async (workerDoc) => {
        const worker = workerDoc.data();
        if (worker.fcmToken && isInWorkerArea(data.address, worker.workerInfo.assignedAreas)) {
          await messaging.send({
            token: worker.fcmToken,
            notification: {
              title: title,
              body: getNotificationBody(data)
            },
            data: data
          });
        }
      });
    }
  } catch (error) {
    console.error('알림 전송 오류:', error);
  }
}

// 알림 내용 생성
function getNotificationBody(data) {
  if (data.type === 'new_request') {
    return `새로운 ${data.serviceType} 요청이 접수되었습니다.`;
  } else if (data.type === 'worker_assigned') {
    return '작업자가 배정되었습니다.';
  } else if (data.type === 'status_changed') {
    return `작업 상태가 ${data.newStatus}로 변경되었습니다.`;
  }
  return '새로운 알림이 있습니다.';
}

// 알림 권한 요청
async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = firebase.messaging();
      const token = await messaging.getToken({
        vapidKey: 'YOUR_VAPID_KEY'
      });
      
      // FCM 토큰 저장
      const user = firebase.auth().currentUser;
      if (user) {
        await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .update({
            fcmToken: token
          });
      }
    }
  } catch (error) {
    console.error('알림 권한 요청 오류:', error);
  }
}

// 알림 수신 처리
function handleNotification(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/icons/icon-192x192.png',
    data: payload.data
  };

  if (Notification.permission === 'granted') {
    new Notification(notificationTitle, notificationOptions);
  }
}

// 페이지 로드 시 알림 권한 요청
document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
}); 