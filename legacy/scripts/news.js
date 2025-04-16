import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { app, auth, db, storage } from './firebase-config.js';

// 전역 변수
let lastVisible = null;
const pageSize = 6;
const CONTENT_UPDATE_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 1주일
const NAVER_CLIENT_ID = 'JUNodHGrKAGUsM18wdVY';
const NAVER_CLIENT_SECRET = '66Qkfr_5OZ';

// 마지막 업데이트 시간을 저장할 변수
let lastUpdateTime = null;

// DOM 요소
const newsContainer = document.getElementById('newsContainer');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadMoreButton = document.getElementById('loadMore');
const filterButtons = document.querySelectorAll('[data-filter]');

// 네이버 뉴스 API에서 데이터 가져오기
async function fetchNewsFromAPI(page = 1) {
    try {
        const query = encodeURIComponent('벌초 OR 예초 OR 태양광');
        const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${query}&display=${pageSize}&start=${(page-1)*pageSize+1}&sort=date`, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
            }
        });
        const data = await response.json();
        
        if (data.items) {
            // Firebase에 뉴스 데이터 저장
            const db = getFirestore();
            const newsCollection = collection(db, 'news');
            
            for (const item of data.items) {
                await addDoc(newsCollection, {
                    title: item.title.replace(/<[^>]*>/g, ''),
                    description: item.description.replace(/<[^>]*>/g, ''),
                    link: item.link,
                    pubDate: item.pubDate,
                    source: item.source,
                    keyword: determineKeyword(item.title, item.description),
                    createdAt: serverTimestamp()
                });
            }
            
            return data.items;
        }
        return [];
    } catch (error) {
        console.error('뉴스 API 호출 중 오류:', error);
        return [];
    }
}

// 키워드 결정 함수
function determineKeyword(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    if (text.includes('벌초') || text.includes('묘지')) return '벌초';
    if (text.includes('예초') || text.includes('잔디')) return '예초';
    if (text.includes('태양광') || text.includes('태양열')) return '태양광';
    return '기타';
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