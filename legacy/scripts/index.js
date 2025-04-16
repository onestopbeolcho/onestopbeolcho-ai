import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, Timestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';

// 최근 요청 불러오기
function loadRecentRequests() {
    const requestsContainer = document.getElementById('recentRequests');
    if (!requestsContainer) return;

    const requestQuery = query(collection(db, 'serviceRequests'), orderBy('createdAt', 'desc'), limit(6));
    onSnapshot(requestQuery, (snapshot) => {
        console.log('최신 신청내역 조회 결과:', snapshot.size);
        requestsContainer.innerHTML = '';
        if (snapshot.empty) {
            requestsContainer.innerHTML = '<div class="col-12 text-center">아직 신청된 서비스가 없습니다.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const request = doc.data();
            console.log('신청내역 데이터:', request);
            request.id = doc.id;
            const card = createRequestCard(request);
            requestsContainer.appendChild(card);
        });
    });
}

// 리뷰 불러오기
function loadReviews() {
    const reviewsContainer = document.getElementById('reviews');
    if (!reviewsContainer) return;

    const reviewQuery = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(6));
    onSnapshot(reviewQuery, (snapshot) => {
        console.log('최신 후기 조회 결과:', snapshot.size);
        reviewsContainer.innerHTML = '';
        if (snapshot.empty) {
            reviewsContainer.innerHTML = '<div class="col-12 text-center">아직 작성된 후기가 없습니다.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const review = doc.data();
            console.log('후기 데이터:', review);
            review.id = doc.id;
            const card = createReviewCard(review);
            reviewsContainer.appendChild(card);
        });
    });
}

// 통계 업데이트
async function updateStats() {
    try {
        // 서비스 요청 수 가져오기
        const requestsSnapshot = await getDocs(collection(db, 'serviceRequests'));
        const requestCount = requestsSnapshot.size;

        // 사용자 수 가져오기
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userCount = usersSnapshot.size;

        // 통계 업데이트
        document.getElementById('requestCount').textContent = requestCount;
        document.getElementById('userCount').textContent = userCount;
    } catch (error) {
        console.error('통계 업데이트 오류:', error);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadRecentRequests();
    loadReviews();
    updateStats();

    const reviewList = document.getElementById('review-list');
    const requestList = document.getElementById('request-list');
    const moreReviewsButton = document.getElementById('more-reviews-button');
    const moreRequestsButton = document.getElementById('more-requests-button');

    // 더보기 버튼 이벤트 리스너
    if (moreRequestsButton) {
        moreRequestsButton.addEventListener('click', () => {
            window.location.href = '/requests.html';
        });
    }

    if (moreReviewsButton) {
        moreReviewsButton.addEventListener('click', () => {
            window.location.href = '/reviews.html';
        });
    }
});

function extractRegion(address) {
    if (!address) return "";
    const parts = address.split(" ");
    if (parts[0] === "세종특별자치시") {
        return parts[0];
    }
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
}

function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'col-md-4';
    card.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">${request.serviceType}</h5>
                <p class="card-text">
                    <small class="text-muted">${formatDate(request.createdAt)}</small><br>
                    <strong>지역:</strong> ${extractRegion(request.address)}<br>
                    <strong>상태:</strong> ${request.status}
                </p>
            </div>
        </div>
    `;
    return card;
}

function createReviewCard(review) {
    const card = document.createElement('div');
    card.className = 'col-md-4';
    card.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">${review.title}</h5>
                <p class="card-text">
                    <small class="text-muted">${formatDate(review.createdAt)}</small><br>
                    <strong>작성자:</strong> ${review.authorName}<br>
                    <strong>평점:</strong> ${'⭐'.repeat(review.rating)}
                </p>
            </div>
        </div>
    `;
    return card;
} 