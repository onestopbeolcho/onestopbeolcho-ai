const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 환경 변수에서 관리자 UID 가져오기
const managerUid = functions.config().manager.uid;

exports.convertRegions = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();

  // 주소에서 지역을 추출하는 함수 (더 robust한 로직)
  const extractRegion = (address) => {
    if (!address) return '미설정';
    const parts = address.split(' ');
    const province = parts[0].replace(/광역시$|특별자치도$/, '');
    const city = parts[1] ? parts[1].replace(/시$|군$/, '') : '';
    return parts.length >= 2 ? `${province} ${city}` : '미설정';
  };

  const collections = ['serviceRequests', 'users'];
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();

    if (collectionName === 'serviceRequests') {
      // 필드 초기화가 필요한 경우에만 수행 (필요 여부 확인 후 제거 가능)
      for (const doc of snapshot.docs) {
        await doc.ref.update({
          beforePhotos: [],
          afterPhotos: [],
          additionalRequests: [],
        });
      }
    }

    if (collectionName === 'users') {
      const managerDoc = await db.collection('users').doc(managerUid).get();
      if (managerDoc.exists) {
        await managerDoc.ref.update({isManager: true});
      } else {
        await db
          .collection('users')
          .doc(managerUid)
          .set({isManager: true, uid: managerUid});
      }

      for (const doc of snapshot.docs) {
        if (doc.id !== managerUid) {
          await doc.ref.update({isManager: false});
        }
      }
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.regions) {
        const newRegions = data.regions.map((r) => extractRegion(r));
        await doc.ref.update({regions: newRegions});
      } else if (data.region) {
        const newRegion = extractRegion(data.region);
        await doc.ref.update({region: newRegion});
      }
    }
  }
  res.send('Region conversion completed');
});

exports.assignWorker = functions.https.onCall(async (data, context) => {
  const region = data.region;
  const db = admin.firestore();
  const userId = context.auth.uid;
  console.log('assignWorker 함수 시작. 요청 지역:', region, '요청자 ID:', userId);

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    console.log('요청자 정보:', userData);

    let workersSnapshot;
    let workerId = null;
    if (userData.isManager) {
      console.log('직영팀(관리자) 검색 시작');
      workersSnapshot = await db
        .collection('users')
        .where('isWorker', '==', true)
        .where('workerApproved', '==', true)
        .get();
      console.log('직영팀 검색 결과: ' + workersSnapshot.docs.length + '명의 작업자 발견');

      if (!workersSnapshot.empty) {
        // 작업량이 적은 작업자 선택
        let minWorkload = Infinity;
        workersSnapshot.forEach((doc) => {
          const worker = doc.data();
          const workload = worker.currentWorkload || 0; // 작업량 추적 필요
          if (workload < minWorkload) {
            minWorkload = workload;
            workerId = worker.uid;
          }
        });
      }
    } else {
      console.log('일반 작업자 지역 매칭 검색 시작. 요청 지역: ' + region);
      workersSnapshot = await db.collection('users')
        .where('isWorker', '==', true)
        .where('workerApproved', '==', true)
        .where('regions', 'array-contains', region)
        .get();
      console.log('지역 매칭 검색 결과: ' + workersSnapshot.docs.length + '명의 작업자 발견');

      if (!workersSnapshot.empty) {
        let minWorkload = Infinity;
        workersSnapshot.forEach((doc) => {
          const worker = doc.data();
          const workload = worker.currentWorkload || 0;
          if (workload < minWorkload) {
            minWorkload = workload;
            workerId = worker.uid;
          }
        });
      }
    }

    if (workerId) {
      console.log('작업자 배정 성공. 배정된 작업자 ID: ' + workerId);
      return {workerId};
    } else {
      console.log('작업자 배정 실패. 적합한 작업자 없음');
      return {workerId: null};
    }
  } catch (error) {
    console.error('작업자 배정 실패: ' + error);
    throw new functions.https.HttpsError(
      'internal',
      `작업자 배정 실패: ${error.message}`
    );
  }
});

exports.sendNotification = functions.https.onCall(async (data) => {
  const {customerId, message, type} = data;
  const db = admin.firestore();
  console.log('sendNotification 함수 시작. customerId: ' + customerId + ', message: ' + message + ', type: ' + type);

  try {
    const customerDoc = await db.collection('users').doc(customerId).get();
    if (!customerDoc.exists) {
      console.log('존재하지 않는 유저입니다. customerId: ' + customerId);
      return {success: false};
    }

    // 알림 메시지 동적 생성
    const notificationMessages = {
      additionalCost: '추가 견적 요청이 도착했습니다.',
      default: message,
    };
    const notificationMessage = notificationMessages[type] || notificationMessages.default;

    // FCM 푸시 알림 전송
    const customerData = customerDoc.data();
    if (customerData.fcmToken) {
      const payload = {
        notification: {
          title: '알림',
          body: notificationMessage,
        },
      };
      await admin.messaging()
        .sendToDevice(customerData.fcmToken, payload);
      console.log('알림 전송 성공: ' + customerId);
    } else {
      console.log('FCM 토큰이 없습니다. customerId: ' + customerId);
    }

    return {success: true};
  } catch (error) {
    console.error('알림 전송 실패: ' + error);
    throw new functions.https.HttpsError('internal', '알림 전송 실패: ' + error.message);
  }
});