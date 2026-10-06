// 서버(Spring)가 'Z'나 '+09:00' 같은 시간대 표시 없이 UTC 시각을 내려주는 경우가 있어서,
// 그대로 new Date()에 넣으면 한국 시간으로 오해해 9시간 일찍 표시된다.
// 시간대 표시가 없는 문자열은 UTC로 보고 읽도록 보정한다. (이미 Z/+09:00이 있으면 그대로 사용)
const HAS_TZ = /(Z|[+-]\d{2}:?\d{2})$/i

export function parseServerDate(value: string | number | Date): Date {
    if (value instanceof Date || typeof value === "number") return new Date(value)
    let s = String(value).trim().replace(" ", "T")
    s = s.replace(/(\.\d{3})\d+/, "$1") // 소수점 6자리(마이크로초)는 일부 브라우저가 못 읽어서 3자리로 자름
    if (!HAS_TZ.test(s)) s += "Z"
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? new Date(String(value)) : d
}

// 서버가 준 시각을 항상 'Z'가 붙은 ISO 문자열로 바꿔서 저장할 때 쓴다
export function toIsoFromServer(value?: string | null): string | undefined {
    if (!value) return undefined
    const d = parseServerDate(value)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}