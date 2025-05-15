import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { app, auth, db, storage } from './firebase-config.js';

// 전역 변수
let lastVisible = null;
const pageSize = 6;
const CONTENT_UPDATE_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 1주일
const NAVER_CLIENT_ID = 'JUNodHGrKAGUsM18wdVY';
const NAVER_CLIENT_SECRET = '66Qkfr_5OZ';

// 마지막 업데이트 시간을 저장할 변수
let lastUpdateTime = null;

// 주간 자동 글 생성 설정
const WEEKLY_UPDATE_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 1주일
let lastWeeklyUpdate = null;

// DOM 요소
const newsContainer = document.getElementById('newsContainer');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadMoreButton = document.getElementById('loadMore');
const filterButtons = document.querySelectorAll('[data-filter]');

// 제미나이 API 설정
const GEMINI_API_KEY = 'AIzaSyBBHv-isFTKlAr0XMkuNp-Lzd2an-QDb_0';

// Google GenAI SDK 초기화
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 테스트용 프롬프트
const testPrompt = `
서울 강남구의 벌초 서비스에 대한 뉴스 기사를 작성해주세요.
다음 형식으로 작성해주세요:
1. 제목 (첫 줄)
2. 본문 (2줄 이상)
`;

// API 테스트 함수
async function testGeminiAPI() {
    try {
        console.log('제미나이 API 테스트 시작...');
        
        // 모델 가져오기
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        // 프롬프트로 콘텐츠 생성
        const result = await model.generateContent(testPrompt);
        const response = await result.response;
        
        console.log('생성된 콘텐츠:', response.text());
        return response.text();
    } catch (error) {
        console.error('API 테스트 중 오류:', error);
        return null;
    }
}

// 페이지 로드 시 테스트 실행
document.addEventListener('DOMContentLoaded', async () => {
    console.log('페이지 로드됨, API 테스트 시작...');
    await testGeminiAPI();
});

// 지역 목록 (시/군/구 단위)
const REGIONS = {
    '서울': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '부산': ['강서구', '금정구', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구', '기장군'],
    '인천': ['계양구', '남구', '남동구', '동구', '부평구', '서구', '연수구', '중구', '강화군', '옹진군'],
    '대구': ['남구', '달서구', '동구', '북구', '서구', '수성구', '중구', '달성군'],
    '대전': ['대덕구', '동구', '서구', '유성구', '중구'],
    '광주': ['광산구', '남구', '동구', '북구', '서구'],
    '울산': ['남구', '동구', '북구', '중구', '울주군'],
    '세종': ['세종시'],
    '경기': ['고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '여주시', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시', '가평군', '양평군', '연천군'],
    '강원': ['강릉시', '동해시', '삼척시', '속초시', '원주시', '춘천시', '태백시', '고성군', '양구군', '양양군', '영월군', '인제군', '정선군', '철원군', '평창군', '홍천군', '화천군', '횡성군'],
    '충북': ['제천시', '청주시', '충주시', '괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '증평군'],
    '충남': ['계룡시', '공주시', '논산시', '당진시', '보령시', '서산시', '아산시', '천안시', '금산군', '부여군', '서천군', '예산군', '청양군', '태안군', '홍성군'],
    '전북': ['군산시', '김제시', '남원시', '익산시', '전주시', '정읍시', '고창군', '무주군', '부안군', '순창군', '완주군', '임실군', '장수군', '진안군'],
    '전남': ['광양시', '나주시', '목포시', '순천시', '여수시', '강진군', '고흥군', '곡성군', '구례군', '담양군', '무안군', '보성군', '신안군', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
    '경북': ['경산시', '경주시', '구미시', '김천시', '문경시', '상주시', '안동시', '영주시', '영천시', '포항시', '고령군', '군위군', '봉화군', '성주군', '영덕군', '영양군', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군'],
    '경남': ['거제시', '김해시', '밀양시', '사천시', '양산시', '진주시', '창원시', '통영시', '거창군', '고성군', '남해군', '산청군', '의령군', '창녕군', '하동군', '함안군', '함양군', '합천군'],
    '제주': ['제주시', '서귀포시']
};

// 뉴스 카테고리 정의
const NEWS_CATEGORIES = [
    {
        id: 'trend',
        name: '트렌드',
        prompt: (region, subRegion) => `다음 주제에 대해 300자 내외의 뉴스 기사를 작성해주세요. 
            주제: ${region} ${subRegion}의 최신 벌초/예초 트렌드와 시장 동향
            키워드: ${region} ${subRegion} 벌초, ${region} ${subRegion} 예초, ${region} ${subRegion} 벌초대행, 최신 트렌드, 시장 동향
            형식: 제목, 본문, 결론
            톤앤매너: 전문적이고 신뢰감 있는 뉴스 기사 스타일`
    },
    {
        id: 'tip',
        name: '전문가 팁',
        prompt: (region, subRegion) => `다음 주제에 대해 300자 내외의 전문가 팁을 작성해주세요.
            주제: ${region} ${subRegion} 특성에 맞는 효율적인 벌초/예초 방법
            키워드: ${region} ${subRegion} 벌초 방법, ${region} ${subRegion} 예초 팁, 전문가 조언, 효율적인 관리
            형식: 제목, 본문, 결론
            톤앤매너: 친절하고 실용적인 전문가 조언 스타일`
    },
    {
        id: 'news',
        name: '지역 뉴스',
        prompt: (region, subRegion) => `다음 주제에 대해 300자 내외의 뉴스 기사를 작성해주세요.
            주제: ${region} ${subRegion}의 벌초/예초 관련 최신 소식
            키워드: ${region} ${subRegion} 벌초 소식, ${region} ${subRegion} 예초 뉴스, 지역 현황, 최신 동향
            형식: 제목, 본문, 결론
            톤앤매너: 객관적이고 정보성 있는 뉴스 스타일`
    }
];

// 제미나이 API 호출 함수
async function callGeminiAPI(prompt) {
    try {
        // 모델 가져오기
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // 프롬프트로 콘텐츠 생성
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return response.text();
    } catch (error) {
        console.error('제미나이 API 호출 중 오류:', error);
        return null;
    }
}

// 뉴스 생성 함수
async function generateNews(category, region, subRegion) {
    try {
        const prompt = category.prompt(region, subRegion);
        const content = await callGeminiAPI(prompt);
        
        if (!content) {
            throw new Error('콘텐츠 생성 실패');
        }

        // 제목 추출 (첫 줄)
        const title = content.split('\n')[0].replace(/^[#\s]+/, '');
        
        // 본문 추출 (나머지 줄)
        const body = content.split('\n').slice(1).join('\n').trim();

        return {
            title,
            content: body,
            category: category.id,
            region,
            subRegion,
            createdAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('뉴스 생성 중 오류:', error);
        return null;
    }
}

// 뉴스 데이터 로드
async function loadNews(loadMore = false) {
    try {
        // 로컬 스토리지에서 마지막 업데이트 시간 확인
        const storedLastUpdate = localStorage.getItem('lastNewsUpdate');
        const now = new Date();
        
        // 하루가 지났는지 확인 (24시간 = 86400000 밀리초)
        if (storedLastUpdate && (now - new Date(storedLastUpdate)) < 86400000) {
            console.log('하루가 지나지 않았으므로 업데이트를 건너뜁니다.');
            return;
        }

        // Firestore에서 뉴스 데이터 가져오기
        const newsSnapshot = await getDocs(collection(db, 'news'));
        const news = [];
        
        newsSnapshot.forEach(doc => {
            const data = doc.data();
            news.push({
                id: doc.id,
                ...data,
                date: data.date.toDate()
            });
        });
        
        // 날짜순 정렬
        news.sort((a, b) => b.date - a.date);
        
        // UI 업데이트
        updateNewsUI(news);
        
        // 마지막 업데이트 시간 저장
        localStorage.setItem('lastNewsUpdate', now.toISOString());
        console.log('뉴스 업데이트 완료:', now.toISOString());
    } catch (error) {
        console.error('뉴스 로드 중 오류:', error);
    }
}

// 뉴스 카드 생성
function createNewsCard(article) {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';
    card.innerHTML = `
        <div class="card h-100 news-card">
            <div class="card-body">
                <span class="badge bg-primary mb-2">${determineKeyword(article.title, article.description)}</span>
                <h5 class="card-title">${article.title}</h5>
                <p class="card-text">${article.description}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${new Date(article.pubDate).toLocaleDateString()}</small>
                    <a href="${article.link}" target="_blank" class="btn btn-sm btn-outline-primary">자세히 보기</a>
                </div>
            </div>
        </div>
    `;
    return card;
}

// 이벤트 리스너
searchButton.addEventListener('click', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const cards = newsContainer.querySelectorAll('.card');
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const description = card.querySelector('.card-text').textContent.toLowerCase();
        const isVisible = title.includes(searchTerm) || description.includes(searchTerm);
        card.parentElement.style.display = isVisible ? 'block' : 'none';
    });
});

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const filter = button.dataset.filter;
        const cards = newsContainer.querySelectorAll('.card');
        
        cards.forEach(card => {
            const badge = card.querySelector('.badge').textContent;
            const isVisible = filter === 'all' || badge === filter;
            card.parentElement.style.display = isVisible ? 'block' : 'none';
        });
    });
});

loadMoreButton.addEventListener('click', () => {
    loadNews(true);
});

// 초기 로드
loadNews();

// SEO 컨텐츠 생성
async function generateSEOContent() {
    const contentTypes = [
        {
            type: 'guide',
            title: '벌초/예초 서비스 가이드',
            keywords: ['벌초 서비스', '예초 서비스', '태양광 관리'],
            template: generateGuideTemplate
        },
        {
            type: 'tips',
            title: '전문가의 벌초/예초 팁',
            keywords: ['벌초 팁', '예초 팁', '관리 방법'],
            template: generateTipsTemplate
        },
        {
            type: 'trend',
            title: '벌초/예초 산업 동향',
            keywords: ['산업 동향', '시장 분석', '기술 발전'],
            template: generateTrendTemplate
        }
    ];

    for (const contentType of contentTypes) {
        const content = await contentType.template(contentType);
        await saveContentToFirebase(content);
    }
}

// 가이드 템플릿 생성
function generateGuideTemplate(type) {
    return `
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title">${type === 'grave-cleaning' ? '벌초 서비스' : '예초 서비스'} 가이드</h5>
                <p class="card-text">${type === 'grave-cleaning' ? '묘지 관리에 대한 상세한 가이드를 확인하세요.' : '예초 작업에 대한 상세한 가이드를 확인하세요.'}</p>
                <a href="${type === 'grave-cleaning' ? 'grave-cleaning.html' : 'grass-cutting.html'}" class="btn btn-primary mt-3">상세 가이드 보기</a>
            </div>
        </div>
    `;
}

// 팁 템플릿 생성
function generateTipsTemplate(type) {
    return {
        title: type.title,
        metaDescription: `${type.title} - 원스톱 벌초의 전문가가 알려주는 관리 팁`,
        content: `
            <article class="seo-content">
                <h1>${type.title}</h1>
                <section class="maintenance-tips">
                    <h2>관리 팁</h2>
                    <div class="tip-card">
                        <h3>정기 관리의 중요성</h3>
                        <p>정기적인 관리가 필요한 이유와 방법</p>
                        <ul>
                            <li>월 1회 이상 관리 권장</li>
                            <li>계절별 관리 포인트</li>
                            <li>비용 절감을 위한 팁</li>
                        </ul>
                    </div>
                    <div class="tip-card">
                        <h3>자연 친화적 관리</h3>
                        <p>환경을 고려한 관리 방법</p>
                        <ul>
                            <li>친환경 제품 사용</li>
                            <li>물 절약 방법</li>
                            <li>생태계 보호 포인트</li>
                        </ul>
                    </div>
                </section>
            </article>
        `,
        keywords: type.keywords,
        createdAt: serverTimestamp(),
        type: type.type
    };
}

// 트렌드 템플릿 생성
function generateTrendTemplate(type) {
    return {
        title: type.title,
        metaDescription: `${type.title} - 벌초/예초 산업의 최신 동향과 전망`,
        content: `
            <article class="seo-content">
                <h1>${type.title}</h1>
                <section class="market-trends">
                    <h2>시장 동향</h2>
                    <div class="trend-card">
                        <h3>산업 성장률</h3>
                        <p>최근 5년간 연평균 성장률 분석</p>
                        <div class="trend-chart">
                            <!-- 차트 데이터 -->
                        </div>
                    </div>
                    <div class="trend-card">
                        <h3>기술 발전</h3>
                        <p>최신 관리 기술과 장비</p>
                        <ul>
                            <li>스마트 관리 시스템</li>
                            <li>친환경 장비</li>
                            <li>자동화 솔루션</li>
                        </ul>
                    </div>
                </section>
            </article>
        `,
        keywords: type.keywords,
        createdAt: serverTimestamp(),
        type: type.type
    };
}

// Firebase에 컨텐츠 저장
async function saveContentToFirebase(content) {
    try {
        const contentRef = collection(db, 'seoContent');
        await addDoc(contentRef, content);
        console.log('SEO 컨텐츠 저장 완료:', content.title);
    } catch (error) {
        console.error('SEO 컨텐츠 저장 중 오류:', error);
    }
}

// 컨텐츠 로드 및 표시
async function loadSEOContent() {
    try {
        const contentRef = collection(db, 'seoContent');
        const q = query(contentRef, orderBy('createdAt', 'desc'), limit(3));
        const snapshot = await getDocs(q);
        
        const contentContainer = document.getElementById('seoContentContainer');
        if (!contentContainer) return;
        
        contentContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const content = doc.data();
            const contentElement = document.createElement('div');
            contentElement.className = 'seo-content-item';
            contentElement.innerHTML = content.content;
            contentContainer.appendChild(contentElement);
        });
    } catch (error) {
        console.error('SEO 컨텐츠 로드 중 오류:', error);
    }
}

// 주기적 컨텐츠 업데이트
function scheduleContentUpdates() {
    setInterval(async () => {
        await generateSEOContent();
        await loadSEOContent();
    }, CONTENT_UPDATE_INTERVAL);
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await generateSEOContent();
    await loadSEOContent();
    scheduleContentUpdates();
});

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    // 초기 뉴스 로드
    loadNews();
    
    // 매일 자정에 업데이트 체크
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            loadNews();
        }
    }, 60000); // 1분마다 체크
});

// Firebase 초기화
const db = firebase.firestore();
const newsCollection = db.collection('news');

// 페이지당 표시할 뉴스 수
const NEWS_PER_PAGE = 10;

// 현재 페이지와 카테고리 상태
let currentPage = 1;
let currentCategory = 'all';

// 뉴스 데이터 로드
async function loadNews(category = 'all', page = 1) {
    try {
        let query = newsCollection.orderBy('createdAt', 'desc');
        
        if (category !== 'all') {
            query = query.where('category', '==', category);
        }
        
        const snapshot = await query.get();
        const news = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayNews(news, category);
        updatePagination(news.length, page);
    } catch (error) {
        console.error('뉴스 로드 오류:', error);
    }
}

// 뉴스 표시
function displayNews(news, category) {
    const containerId = category === 'all' ? 'all-news-list' : `${category}-list`;
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    news.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            ${category === 'all' ? `<td>${item.category}</td>` : ''}
            <td>
                <a href="#" class="text-decoration-none" data-bs-toggle="modal" data-bs-target="#newsModal" 
                   onclick="showNewsDetail('${item.id}')">
                    ${item.title}
                </a>
            </td>
            <td>${formatDate(item.createdAt)}</td>
            <td>${item.viewCount || 0}</td>
        `;
        container.appendChild(row);
    });
}

// 페이지네이션 업데이트
function updatePagination(totalNews, currentPage) {
    const totalPages = Math.ceil(totalNews / NEWS_PER_PAGE);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // 이전 페이지 버튼
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    pagination.appendChild(prevLi);
    
    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
        pagination.appendChild(li);
    }
    
    // 다음 페이지 버튼
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    pagination.appendChild(nextLi);
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    loadNews(currentCategory, page);
}

// 카테고리 변경
function changeCategory(category) {
    currentCategory = category;
    currentPage = 1;
    loadNews(category, 1);
}

// 뉴스 상세보기
async function showNewsDetail(newsId) {
    try {
        const doc = await newsCollection.doc(newsId).get();
        if (!doc.exists) return;
        
        const news = doc.data();
        
        // 조회수 증가
        await newsCollection.doc(newsId).update({
            viewCount: (news.viewCount || 0) + 1
        });
        
        // 모달에 데이터 표시
        document.getElementById('newsModalTitle').textContent = news.title;
        document.getElementById('newsModalCategory').textContent = news.category;
        document.getElementById('newsModalDate').textContent = formatDate(news.createdAt);
        document.getElementById('newsModalViews').textContent = (news.viewCount || 0) + 1;
        document.getElementById('newsModalContent').innerHTML = news.content;
        
    } catch (error) {
        console.error('뉴스 상세보기 오류:', error);
    }
}

// 날짜 포맷팅
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 초기 로드
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    
    // 카테고리 탭 이벤트 리스너
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const category = e.target.getAttribute('data-bs-target').replace('#', '');
            changeCategory(category);
        });
    });
});

// 뉴스 생성 함수
async function generateNews(category, region, subRegion) {
    try {
        const prompt = category.prompt(region, subRegion);
        const content = await callGeminiAPI(prompt);
        
        if (!content) {
            throw new Error('콘텐츠 생성 실패');
        }

        // 제목 추출 (첫 줄)
        const title = content.split('\n')[0].replace(/^[#\s]+/, '');
        
        // 본문 추출 (나머지 줄)
        const body = content.split('\n').slice(1).join('\n').trim();

        return {
            title,
            content: body,
            category: category.id,
            region,
            subRegion,
            createdAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('뉴스 생성 중 오류:', error);
        return null;
    }
}

// 뉴스 로드 함수
async function loadNews() {
    const newsList = document.getElementById('news-list');
    if (!newsList) return;

    newsList.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

    try {
        const newsItems = [];
        for (const [region, subRegions] of Object.entries(REGIONS)) {
            for (const subRegion of subRegions) {
                for (const category of NEWS_CATEGORIES) {
                    const news = await generateNews(category, region, subRegion);
                    if (news) {
                        newsItems.push(news);
                    }
                }
            }
        }

        // 날짜순으로 정렬
        newsItems.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 뉴스 카드 생성
        newsList.innerHTML = newsItems.map(news => createNewsCard(news)).join('');
    } catch (error) {
        console.error('뉴스 로드 중 오류:', error);
        newsList.innerHTML = '<div class="alert alert-danger">뉴스를 불러오는 중 오류가 발생했습니다.</div>';
    }
}

// 뉴스 카드 생성 함수
function createNewsCard(news) {
    const categoryClass = `category-${news.category}`;
    const categoryName = NEWS_CATEGORIES.find(c => c.id === news.category)?.name || '';
    const date = new Date(news.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <article class="news-card">
            <span class="news-category ${categoryClass}">${categoryName}</span>
            <h2 class="news-title">${news.title}</h2>
            <div class="news-date">${date} | ${news.region} ${news.subRegion}</div>
            <div class="news-content">${news.content}</div>
            <meta name="keywords" content="${news.region} ${news.subRegion} 벌초, ${news.region} ${news.subRegion} 예초, ${news.region} ${news.subRegion} 벌초대행, ${categoryName}">
        </article>
    `;
}

// 페이지 로드 시 뉴스 로드
document.addEventListener('DOMContentLoaded', loadNews);

// 주간 자동 글 생성 함수
async function generateWeeklyContent() {
    try {
        const now = new Date();
        const storedLastUpdate = localStorage.getItem('lastWeeklyUpdate');
        
        // 마지막 업데이트가 1주일이 지났는지 확인
        if (storedLastUpdate && (now - new Date(storedLastUpdate)) < WEEKLY_UPDATE_INTERVAL) {
            console.log('1주일이 지나지 않았으므로 업데이트를 건너뜁니다.');
            return;
        }

        const newsItems = [];
        for (const [region, subRegions] of Object.entries(REGIONS)) {
            for (const subRegion of subRegions) {
                for (const category of NEWS_CATEGORIES) {
                    const news = await generateNews(category, region, subRegion);
                    if (news) {
                        newsItems.push(news);
                    }
                }
            }
        }

        // Firestore에 저장
        const db = getFirestore();
        const newsCollection = collection(db, 'news');
        
        for (const news of newsItems) {
            await addDoc(newsCollection, {
                ...news,
                createdAt: serverTimestamp()
            });
        }

        // 마지막 업데이트 시간 저장
        localStorage.setItem('lastWeeklyUpdate', now.toISOString());
        console.log('주간 콘텐츠 업데이트 완료:', now.toISOString());
    } catch (error) {
        console.error('주간 콘텐츠 생성 중 오류:', error);
    }
}

// 주기적 업데이트 설정
function scheduleWeeklyUpdates() {
    setInterval(generateWeeklyContent, WEEKLY_UPDATE_INTERVAL);
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await generateWeeklyContent();
    scheduleWeeklyUpdates();
}); 