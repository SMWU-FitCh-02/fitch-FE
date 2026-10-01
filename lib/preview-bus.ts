"use client"

// 일반 미리듣기(audio-preview.ts)와 키 조정 미리듣기(key-adjust-player.ts)가
// 동시에 소리 나지 않도록, 둘 중 하나가 재생을 시작할 때 서로를 멈춰주는
// 아주 작은 중개 모듈. 두 모듈이 서로를 직접 import하면 순환 참조가 생기기
// 때문에, 둘 다 이 모듈 하나만 바라보도록 함.

type StopFn = () => void

const stopHandlers: Record<string, StopFn> = {}

export function registerPreviewSource(key: string, stop: StopFn) {
    stopHandlers[key] = stop
}

export function stopOtherPreviews(exceptKey: string) {
    Object.entries(stopHandlers).forEach(([key, stop]) => {
        if (key !== exceptKey) stop()
    })
}