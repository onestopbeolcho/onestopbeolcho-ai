// ES 모듈 import 제거
// import { db } from './firebase-config.js';
// import { collection, query, orderBy, limit, onSnapshot, getDocs, where, Timestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';

// Firebase 모듈 import
import { app, auth, db } from './firebase-config.js';
import { onAuthStateChange } from './auth.js';

// 최근 요청 불러오기
function loadRecentRequests() {
    const requestList = document.getElementById('request-list');
    if (!requestList) {
        console.error('요청 리스트 요소를 찾을 수 없습니다.');
        return;
    }

    requestList.innerHTML = ''; // 기존 요청 초기화

    // 더미 요청 데이터
    const dummyRequests = [
        {
            serviceType: "벌초",
            address: "서울특별시 강남구",
            status: "완료",
            createdAt: "2024-03-15"
        },
        {
            serviceType: "예초",
            address: "경기도 성남시",
            status: "진행중",
            createdAt: "2024-03-10"
        },
        {
            serviceType: "태양광 예초",
            address: "경기도 하남시",
            status: "완료",
            createdAt: "2024-03-05"
        }
    ];

    // 더미 요청 데이터를 사용하여 요청 카드 생성
    dummyRequests.forEach(request => {
        const requestCard = createRequestCard(request);
        requestList.appendChild(requestCard);
    });
}

// 더미 리뷰 데이터
const dummyReviews = [
  {
    title: "벌초 서비스 정말 좋았어요",
    content: "할아버지 묘소 벌초를 부탁했는데, 정말 깔끔하게 잘 해주셨어요. 잡초도 다 뽑아주시고, 주변도 깔끔하게 정리해주셔서 마음이 편안해졌어요.",
    authorName: "김철수",
    rating: 5,
    createdAt: "2025-04-25"
  },
  {
    title: "예초 작업 만족합니다",
    content: "정원이 너무 무성해서 걱정했는데, 예초 작업이 생각보다 빨리 끝났어요. 작업자분들도 친절하게 설명해주시고, 결과물도 만족스러워요.",
    authorName: "이영희",
    rating: 4,
    createdAt: "2025-04-22"
  },
  {
    title: "태양광 패널 관리 잘 해주셨어요",
    content: "태양광 패널 주변 예초가 걱정됐는데, 안전하게 잘 해주셨어요. 패널에 흠집도 없고, 주변도 깔끔하게 정리해주셔서 좋았어요.",
    authorName: "박지성",
    rating: 5,
    createdAt: "2025-04-20"
  },
  {
    title: "가격이 합리적이에요",
    content: "다른 업체들도 알아봤는데, 여기가 제일 가격이 합리적이었어요. 서비스 품질도 좋고, 작업자분들도 친절하셔서 다음에도 이용할 거예요.",
    authorName: "최민수",
    rating: 4,
    createdAt: "2025-04-18"
  },
  {
    title: "벌초 서비스 추천합니다",
    content: "할머니 묘소 벌초를 부탁했는데, 정말 깔끔하게 잘 해주셨어요. 잡초도 다 뽑아주시고, 주변도 깔끔하게 정리해주셔서 마음이 편안해졌어요.",
    authorName: "정수진",
    rating: 5,
    createdAt: "2025-04-15"
  },
  {
    title: "예초 작업 만족스러워요",
    content: "정원이 너무 무성해서 걱정했는데, 예초 작업이 생각보다 빨리 끝났어요. 작업자분들도 친절하게 설명해주시고, 결과물도 만족스러워요.",
    authorName: "한지민",
    rating: 4,
    createdAt: "2025-04-12"
  },
  {
    title: "태양광 패널 관리 잘 해주셨어요",
    content: "태양광 패널 주변 예초가 걱정됐는데, 안전하게 잘 해주셨어요. 패널에 흠집도 없고, 주변도 깔끔하게 정리해주셔서 좋았어요.",
    authorName: "강동원",
    rating: 5,
    createdAt: "2025-04-10"
  },
  {
    title: "가격이 합리적이에요",
    content: "다른 업체들도 알아봤는데, 여기가 제일 가격이 합리적이었어요. 서비스 품질도 좋고, 작업자분들도 친절하셔서 다음에도 이용할 거예요.",
    authorName: "송혜교",
    rating: 4,
    createdAt: "2025-04-08"
  },
  {
    title: "벌초 서비스 추천합니다",
    content: "할아버지 묘소 벌초를 부탁했는데, 정말 깔끔하게 잘 해주셨어요. 잡초도 다 뽑아주시고, 주변도 깔끔하게 정리해주셔서 마음이 편안해졌어요.",
    authorName: "이병헌",
    rating: 5,
    createdAt: "2025-04-05"
  },
  {
    title: "예초 작업 만족스러워요",
    content: "정원이 너무 무성해서 걱정했는데, 예초 작업이 생각보다 빨리 끝났어요. 작업자분들도 친절하게 설명해주시고, 결과물도 만족스러워요.",
    authorName: "전지현",
    rating: 4,
    createdAt: "2025-04-03"
  },
  {
    title: "태양광 패널 관리 잘 해주셨어요",
    content: "태양광 패널 주변 예초가 걱정됐는데, 안전하게 잘 해주셨어요. 패널에 흠집도 없고, 주변도 깔끔하게 정리해주셔서 좋았어요.",
    authorName: "현빈",
    rating: 5,
    createdAt: "2025-04-01"
  },
  {
    title: "가격이 합리적이에요",
    content: "다른 업체들도 알아봤는데, 여기가 제일 가격이 합리적이었어요. 서비스 품질도 좋고, 작업자분들도 친절하셔서 다음에도 이용할 거예요.",
    authorName: "김태희",
    rating: 4,
    createdAt: "2025-03-30"
  },
  {
    title: "벌초 서비스 추천합니다",
    content: "할머니 묘소 벌초를 부탁했는데, 정말 깔끔하게 잘 해주셨어요. 잡초도 다 뽑아주시고, 주변도 깔끔하게 정리해주셔서 마음이 편안해졌어요.",
    authorName: "원빈",
    rating: 5,
    createdAt: "2025-03-28"
  },
  {
    title: "예초 작업 만족스러워요",
    content: "정원이 너무 무성해서 걱정했는데, 예초 작업이 생각보다 빨리 끝났어요. 작업자분들도 친절하게 설명해주시고, 결과물도 만족스러워요.",
    authorName: "김하늘",
    rating: 4,
    createdAt: "2025-03-25"
  },
  {
    title: "태양광 패널 관리 잘 해주셨어요",
    content: "태양광 패널 주변 예초가 걱정됐는데, 안전하게 잘 해주셨어요. 패널에 흠집도 없고, 주변도 깔끔하게 정리해주셔서 좋았어요.",
    authorName: "장동건",
    rating: 5,
    createdAt: "2025-03-22"
  },
  {
    title: "가격이 합리적이에요",
    content: "다른 업체들도 알아봤는데, 여기가 제일 가격이 합리적이었어요. 서비스 품질도 좋고, 작업자분들도 친절하셔서 다음에도 이용할 거예요.",
    authorName: "고소영",
    rating: 4,
    createdAt: "2025-03-20"
  },
  {
    title: "벌초 서비스 추천합니다",
    content: "할아버지 묘소 벌초를 부탁했는데, 정말 깔끔하게 잘 해주셨어요. 잡초도 다 뽑아주시고, 주변도 깔끔하게 정리해주셔서 마음이 편안해졌어요.",
    authorName: "이정재",
    rating: 5,
    createdAt: "2025-03-18"
  },
  {
    title: "예초 작업 만족스러워요",
    content: "정원이 너무 무성해서 걱정했는데, 예초 작업이 생각보다 빨리 끝났어요. 작업자분들도 친절하게 설명해주시고, 결과물도 만족스러워요.",
    authorName: "전도연",
    rating: 4,
    createdAt: "2025-03-15"
  },
  {
    title: "태양광 패널 관리 잘 해주셨어요",
    content: "태양광 패널 주변 예초가 걱정됐는데, 안전하게 잘 해주셨어요. 패널에 흠집도 없고, 주변도 깔끔하게 정리해주셔서 좋았어요.",
    authorName: "송강호",
    rating: 5,
    createdAt: "2025-03-12"
  },
  {
    title: "가격이 합리적이에요",
    content: "다른 업체들도 알아봤는데, 여기가 제일 가격이 합리적이었어요. 서비스 품질도 좋고, 작업자분들도 친절하셔서 다음에도 이용할 거예요.",
    authorName: "김윤석",
    rating: 4,
    createdAt: "2025-03-10"
  }
];

let currentReviewPage = 1;
const REVIEWS_PER_PAGE = 6;

// 리뷰 불러오기
function loadReviews() {
    const reviewList = document.getElementById('review-list');
    if (!reviewList) {
        console.error('리뷰 리스트 요소를 찾을 수 없습니다.');
        return;
    }

    reviewList.innerHTML = ''; // 기존 리뷰 초기화

    // 현재 페이지에 해당하는 리뷰만 표시
    const startIndex = (currentReviewPage - 1) * REVIEWS_PER_PAGE;
    const endIndex = startIndex + REVIEWS_PER_PAGE;
    const currentReviews = dummyReviews.slice(startIndex, endIndex);

    // 리뷰 카드 생성
    currentReviews.forEach(review => {
        const reviewCard = createReviewCard(review);
        reviewList.appendChild(reviewCard);
    });

    // 더보기 버튼 상태 업데이트
    const moreReviewsButton = document.getElementById('more-reviews-button');
    if (moreReviewsButton) {
        if (endIndex >= dummyReviews.length) {
            moreReviewsButton.style.display = 'none';
        } else {
            moreReviewsButton.style.display = 'block';
        }
    }
}

// 더보기 버튼 클릭 이벤트
function handleMoreReviewsClick() {
    currentReviewPage++;
    loadReviews();
}

// 통계 업데이트 함수
async function updateStats() {
    try {
        const statsRef = db.collection('stats').doc('current');
        const statsDoc = await statsRef.get();
        
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            document.getElementById('total-requests').textContent = stats.totalRequests || 0;
            document.getElementById('completed-requests').textContent = stats.completedRequests || 0;
            document.getElementById('active-workers').textContent = stats.activeWorkers || 0;
        }
    } catch (error) {
        console.error('통계 업데이트 실패:', error);
    }
}

// 페이지 초기화
function initializePage() {
    // 통계 업데이트
    updateStats();
    setInterval(updateStats, 60000); // 1분마다 업데이트

    // 인증 상태 변경 감지
    onAuthStateChange((user) => {
        if (user) {
            console.log('사용자 로그인됨:', user.email);
        } else {
            console.log('사용자 로그아웃됨');
        }
    });
}

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseInitialized) {
        initializePage();
    } else {
        window.addEventListener('firebaseInitialized', () => {
            console.log('Firebase 초기화 완료');
            initializePage();
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

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
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

// 작성자 이름 가리기 함수
function maskName(name) {
    if (!name || name.length < 2) return name;
    return name.charAt(0) + 'O' + name.slice(2);
}

// 별점 생성 함수
function generateStars(rating) {
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < rating) {
      stars += '<i class="fas fa-star text-warning"></i>';
    } else {
      stars += '<i class="far fa-star text-warning"></i>';
    }
  }
  return stars;
}

function createReviewCard(review) {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';
    card.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="rating">
                        ${generateStars(review.rating)}
                    </div>
                    <small class="text-muted">${formatDate(review.createdAt)}</small>
                </div>
                <h5 class="card-title">${review.title}</h5>
                <p class="card-text">${review.content}</p>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <small class="text-muted">작성자: ${maskName(review.authorName)}</small>
                </div>
            </div>
        </div>
    `;
    return card;
} 