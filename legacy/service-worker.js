// 캐시 버전 설정
const CACHE_NAME = 'onestop-cache-v1';

// 캐싱할 리소스 목록
const urlsToCache = [
  '/',
  '/index.html',
  '/request.html',
  '/worker.html',
  '/mypage.html',
  '/login.html',
  '/signup.html',
  '/worker-signup.html',
  '/rerequest.html',
  '/styles/common.css',
  '/scripts/nav.js',
  '/scripts/footer.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// Install 이벤트: 캐시 생성 및 리소스 저장
self.addEventListener('install', event => {
  console.log('Service Worker: 설치 시작');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 캐시 열기 및 리소스 저장 시작:', urlsToCache);
        return Promise.all(
          urlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return cache.put(url, response);
              })
              .catch(error => {
                console.error(`Service Worker: ${url} 캐싱 실패:`, error);
                return Promise.resolve(); // 실패해도 계속 진행
              });
          })
        );
      })
      .then(() => {
        console.log('Service Worker: 모든 리소스 캐싱 완료');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: 캐싱 실패:', error);
      })
  );
});

// Fetch 이벤트: 네트워크 우선, 캐시 대체 전략
self.addEventListener('fetch', event => {
  // chrome-extension 스키마 제외
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            // 응답이 성공적이고, GET 요청이며, 같은 출처의 요청인 경우에만 캐시
            if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// Activate 이벤트: 이전 캐시 정리
self.addEventListener('activate', event => {
  console.log('Service Worker: 활성화 시작');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: 캐시 정리 완료');
      return self.clients.claim();
    })
  );
});