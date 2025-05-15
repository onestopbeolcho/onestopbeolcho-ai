/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const axios = require('axios');

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

// 뉴스 기사 수집 및 관리 함수
async function collectNews() {
    try {
        const db = admin.firestore();
        const keywords = ['벌초', '예초', '예초기', '태양광 예초', '묘지 관리', '산소 관리'];
        const newsCollection = [];
        
        // 1. 오래된 뉴스 삭제 (30일 이상된 뉴스)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const oldNewsQuery = db.collection('news')
            .where('pubDate', '<', thirtyDaysAgo);
            
        const oldNewsSnapshot = await oldNewsQuery.get();
        const batch = db.batch();
        
        oldNewsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // 2. 새로운 뉴스 수집
        for (const keyword of keywords) {
            const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
                params: {
                    query: keyword,
                    sort: 'date',
                    display: 5
                },
                headers: {
                    'X-Naver-Client-Id': functions.config().naver.client_id,
                    'X-Naver-Client-Secret': functions.config().naver.client_secret
                }
            });

            const newsItems = response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                description: item.description.substring(0, 200),
                pubDate: new Date(item.pubDate),
                keyword: keyword,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }));

            newsCollection.push(...newsItems);
        }

        // 3. 중복 제거 및 정렬
        const uniqueNews = newsCollection.filter((item, index, self) =>
            index === self.findIndex(t => t.link === item.link)
        ).sort((a, b) => b.pubDate - a.pubDate);

        // 4. 최신 뉴스만 저장 (각 키워드당 최대 3개)
        const keywordCounts = {};
        const newsToSave = uniqueNews.filter(news => {
            if (!keywordCounts[news.keyword]) {
                keywordCounts[news.keyword] = 0;
            }
            if (keywordCounts[news.keyword] < 3) {
                keywordCounts[news.keyword]++;
                return true;
            }
            return false;
        });

        // 5. Firestore에 저장
        const saveBatch = db.batch();
        const newsRef = db.collection('news');

        for (const news of newsToSave) {
            const docRef = newsRef.doc();
            saveBatch.set(docRef, news);
        }

        await saveBatch.commit();
        console.log(`Successfully saved ${newsToSave.length} news articles`);
        return true;
    } catch (error) {
        console.error('Error collecting news:', error);
        throw error;
    }
}

// 매일 자정에 뉴스 수집
exports.scheduledNewsCollection = functions.scheduler.onSchedule('0 0 * * *', async (context) => {
  await collectNews();
});

// 수동으로 뉴스 수집을 실행할 수 있는 HTTP 함수
exports.manualNewsCollection = functions.https.onRequest(async (req, res) => {
  try {
    await collectNews();
    res.status(200).send('뉴스 수집이 완료되었습니다.');
  } catch (error) {
    console.error('뉴스 수집 중 오류 발생:', error);
    res.status(500).send('뉴스 수집 중 오류가 발생했습니다.');
  }
});
