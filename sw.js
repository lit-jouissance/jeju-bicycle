// 제주 자전거 도전 - 서비스 워커 (오프라인 캐시)
const CACHE = "jeju-bike-v5";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-180.png", "./icon-512-maskable.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // 페이지 이동: 온라인이면 네트워크, 끊기면 캐시된 index.html
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // 같은 출처: 캐시 우선 + 백그라운드 갱신
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
  } else {
    // 폰트·Firebase 등 외부: 네트워크 우선
    e.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});
