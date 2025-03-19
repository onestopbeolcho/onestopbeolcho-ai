// 캐시 버전 설정
const CACHE_NAME = 'onestop-beolcho-v3'; // 버전 업데이트

// 캐싱할 리소스 목록
const urlsToCache = [
  '/',
  '/index.html',
  '/request.html',
  '/worker.html',
  '/mypage.html',
  '/admin/admin.html',
  '/login.html',
  '/signup.html',
  '/worker-signup.html',
  '/styles/theme.css',
  '/styles/footer.css',
  '/scripts/nav.js', // 경로 수정
  '/scripts/footer.js', // 경로 수정
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// Install 이벤트: 캐시 생성 및 리소스 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: 캐시 열기 및 리소스 저장 시작:', urlsToCache);
      return cache.addAll(urlsToCache)
        .then(() => {
          console.log('Service Worker: 모든 리소스 캐싱 완료');
          return self.skipWaiting(); // 새 Service Worker 즉시 활성화
        })
        .catch((error) => console.error('Service Worker: 캐싱 실패:', error));
    })
  );
});

// Fetch 이벤트: 네트워크 우선, 캐시 대체 전략
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  const requestMethod = event.request.method;

  // chrome-extension 스킴 및 POST 메서드 제외
  if (requestUrl.startsWith('chrome-extension:') || requestMethod !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 외부 도메인 요청은 서비스 워커가 처리하지 않음
  if (!requestUrl.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 네트워크 응답이 성공한 경우 캐시 업데이트
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: 캐시 업데이트:', requestUrl);
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 제공
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Service Worker: 캐시에서 제공:', requestUrl);
            return cachedResponse;
          }
          console.error('Service Worker: 네트워크 및 캐시 모두 실패:', requestUrl);
          return caches.match('/index.html'); // 오프라인 기본 페이지
        });
      })
  );
});

// Activate 이벤트: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: 이전 캐시 삭제:', cache);
            return caches.delete(cache);
          }
        })
      ).then(() => {
        console.log('Service Worker: 캐시 정리 완료');
        return self.clients.claim(); // 클라이언트 제어
      });
    })
  );
});