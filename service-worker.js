// /onestopbeolcho/service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('bulcho-service-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js',
        '/components/nav.js', // nav.js 추가
        '/components/footer.js', // footer.js 추가
        '/styles/theme.css',
        '/styles/components.css',
        '/styles/footer.css'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase CDN 스크립트 및 외부 리소스는 캐싱하지 않고 네트워크에서 직접 가져옴
  if (url.origin === 'https://www.gstatic.com' || url.origin === 'https://cdnjs.cloudflare.com') {
    event.respondWith(fetch(event.request));
  } else {
    // 캐싱된 리소스 또는 네트워크에서 가져옴
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});