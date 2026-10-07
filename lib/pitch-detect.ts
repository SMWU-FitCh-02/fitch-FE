// 마이크 소리에서 지금 부르는 음높이(Hz)를 실시간으로 알아내는 간단한 YIN 알고리즘.
// 서버로 보내지 않고 기기 안에서 바로 계산한다 (가이드 음 자동 측정용).

export type PitchResult = {
    freq: number // Hz
    clarity: number // 0~1, 높을수록 음이 또렷함
    rms: number // 이 구간의 음량
}

const MIN_FREQ = 50 // 이보다 낮은 음은 찾지 않음 (C2 ≈ 65Hz 까지 커버)
const MAX_FREQ = 1200 // 이보다 높은 음은 찾지 않음 (B5 ≈ 988Hz 까지 커버)
const YIN_THRESHOLD = 0.15

/**
 * buf: 마이크의 time-domain 샘플 (AnalyserNode.getFloatTimeDomainData, 길이 4096 권장)
 * 소리가 너무 작거나 음이 또렷하지 않으면 null.
 */
export function detectPitch(
    buf: Float32Array,
    sampleRate: number,
    minRms = 0.01
): PitchResult | null {
    const n = buf.length
    let sumSq = 0
    for (let i = 0; i < n; i++) sumSq += buf[i] * buf[i]
    const rms = Math.sqrt(sumSq / n)
    if (rms < minRms) return null

    const tauMin = Math.max(2, Math.floor(sampleRate / MAX_FREQ))
    const tauMax = Math.min(Math.floor(n / 2) - 1, Math.floor(sampleRate / MIN_FREQ))
    if (tauMax <= tauMin + 2) return null
    const W = Math.floor(n / 2)

    // 1) 차이 함수
    const d = new Float32Array(tauMax + 1)
    for (let tau = 1; tau <= tauMax; tau++) {
        let sum = 0
        for (let j = 0; j < W; j++) {
            const diff = buf[j] - buf[j + tau]
            sum += diff * diff
        }
        d[tau] = sum
    }

    // 2) 누적 평균 정규화 차이 함수
    const cmnd = new Float32Array(tauMax + 1)
    cmnd[0] = 1
    let running = 0
    for (let tau = 1; tau <= tauMax; tau++) {
        running += d[tau]
        cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1
    }

    // 3) 임계값 아래로 처음 내려가는 지점 → 그 골짜기의 바닥
    let tauEst = -1
    for (let tau = tauMin; tau <= tauMax; tau++) {
        if (cmnd[tau] < YIN_THRESHOLD) {
            while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++
            tauEst = tau
            break
        }
    }
    if (tauEst === -1) return null // 또렷한 음이 없음 (말소리, 잡음 등)

    // 4) 포물선 보간으로 정밀도 올리기
    let better = tauEst
    if (tauEst > 1 && tauEst < tauMax) {
        const s0 = cmnd[tauEst - 1]
        const s1 = cmnd[tauEst]
        const s2 = cmnd[tauEst + 1]
        const denom = 2 * (2 * s1 - s2 - s0)
        if (denom !== 0) better = tauEst + (s2 - s0) / denom
    }

    const freq = sampleRate / better
    if (freq < MIN_FREQ || freq > MAX_FREQ) return null
    return { freq, clarity: 1 - cmnd[tauEst], rms }
}

/** Hz → MIDI 번호(소수). A4 = 440Hz = 69 */
export function freqToMidi(freq: number): number {
    return 69 + 12 * Math.log2(freq / 440)
}

/**
 * 부른 음이 목표 음에 맞는지: 목표 ±toleranceSemitones 이내면 성공.
 * (기본 ±1반음 = 약 ±100센트. 노래 중 살짝 흔들리는 걸 감안한 여유)
 */
export function isNearTarget(freq: number, targetMidi: number, toleranceSemitones = 1): boolean {
    return Math.abs(freqToMidi(freq) - targetMidi) <= toleranceSemitones
}