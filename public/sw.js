self.addEventListener("install", (e) => {
    self.skipWaiting()
})

self.addEventListener("activate", (e) => {
    self.clients.claim()
})

self.addEventListener("fetch", (e) => {
    // 지금은 캐싱 없이 그냥 네트워크로 패스스루
    // (나중에 오프라인 지원 필요하면 여기에 캐시 전략 추가)
})