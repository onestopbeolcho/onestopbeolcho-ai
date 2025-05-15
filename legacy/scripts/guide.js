import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, getDocs, addDoc, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyB6QJ5QqQqQqQqQqQqQqQqQqQqQqQqQqQ",
    authDomain: "onestop-platform.firebaseapp.com",
    projectId: "onestop-platform",
    storageBucket: "onestop-platform.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM 요소
const guideContainer = document.getElementById('guide-container');
const commentForm = document.getElementById('comment-form');
const commentsContainer = document.getElementById('comments-container');

// 가이드 로드 함수
async function loadGuide(guideId) {
    try {
        // 가이드 문서 가져오기
        const guideDoc = await getDoc(doc(db, 'guides', guideId));
        if (!guideDoc.exists()) {
            throw new Error('가이드를 찾을 수 없습니다.');
        }

        const guide = guideDoc.data();
        
        // 조회수 증가
        await updateDoc(doc(db, 'guides', guideId), {
            views: increment(1)
        });

        // 가이드 내용 표시
        guideContainer.innerHTML = `
            <h1>${guide.title}</h1>
            <div class="guide-meta">
                <span>작성일: ${new Date(guide.createdAt.toDate()).toLocaleDateString()}</span>
                <span>조회수: ${guide.views}</span>
            </div>
            <div class="guide-content">
                ${guide.content}
            </div>
        `;

        // 댓글 로드
        await loadComments(guideId);
    } catch (error) {
        console.error('가이드 로드 중 오류:', error);
        guideContainer.innerHTML = '<p>가이드를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 댓글 로드 함수
async function loadComments(guideId) {
    try {
        const commentsQuery = query(
            collection(db, 'comments'),
            orderBy('createdAt', 'desc')
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        
        commentsContainer.innerHTML = '';
        commentsSnapshot.forEach(doc => {
            const comment = doc.data();
            if (comment.guideId === guideId) {
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';
                commentElement.innerHTML = `
                    <div class="comment-content">${comment.content}</div>
                    <div class="comment-meta">
                        <span>${comment.author}</span>
                        <span>${new Date(comment.createdAt.toDate()).toLocaleDateString()}</span>
                    </div>
                `;
                commentsContainer.appendChild(commentElement);
            }
        });
    } catch (error) {
        console.error('댓글 로드 중 오류:', error);
    }
}

// 댓글 작성 이벤트 리스너
if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = commentForm.querySelector('textarea').value;
        const guideId = commentForm.dataset.guideId;

        try {
            await addDoc(collection(db, 'comments'), {
                guideId,
                content,
                createdAt: new Date(),
                author: '익명' // 실제로는 로그인된 사용자 정보 사용
            });

            commentForm.reset();
            await loadComments(guideId);
        } catch (error) {
            console.error('댓글 작성 중 오류:', error);
        }
    });
}

// URL에서 가이드 ID 추출
const urlParams = new URLSearchParams(window.location.search);
const guideId = urlParams.get('id');

if (guideId) {
    loadGuide(guideId);
} 