const cacheName = 'routine-v2';
const staticAssets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// ইনস্টল হওয়ার সময় ফাইলগুলো ক্যাশ করা
self.addEventListener('install', async e => {
  const cache = await caches.open(cacheName);
  await cache.addAll(staticAssets);
});

// অফলাইনে থাকার সময় ক্যাশ থেকে ফাইল দেখানো
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});
