/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest, onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');

admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// 상태 변경 이력 기록 함수
exports.recordStatusChange = onCall(async (request) => {
  const {serviceRequestId, previousStatus, newStatus, changedBy} = request.data;
  
  try {
    const db = admin.firestore();
    
    // 상태 변경 이력 기록
    await db.collection('statusHistory').add({
      serviceRequestId,
      previousStatus,
      newStatus,
      changedBy,
      changedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {success: true};
  } catch (error) {
    logger.error('상태 변경 이력 기록 실패:', error);
    throw new Error('상태 변경 이력 기록에 실패했습니다.');
  }
});

// 서비스 요청 상태 변경 시 이력 자동 기록
exports.onServiceRequestStatusChange = onCall(async (request) => {
  const {serviceRequestId, newStatus, changedBy} = request.data;
  
  try {
    const db = admin.firestore();
    const serviceRequestRef = db.collection('serviceRequests').doc(serviceRequestId);
    const serviceRequestDoc = await serviceRequestRef.get();
    
    if (!serviceRequestDoc.exists) {
      throw new Error('서비스 요청을 찾을 수 없습니다.');
    }
    
    const previousStatus = serviceRequestDoc.data().status;
    
    // 상태 변경 이력 기록
    await db.collection('statusHistory').add({
      serviceRequestId,
      previousStatus,
      newStatus,
      changedBy,
      changedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 서비스 요청 상태 업데이트
    await serviceRequestRef.update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {success: true};
  } catch (error) {
    logger.error('서비스 요청 상태 변경 실패:', error);
    throw new Error('서비스 요청 상태 변경에 실패했습니다.');
  }
});
