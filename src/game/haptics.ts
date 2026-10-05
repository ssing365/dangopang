export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // 지원하지 않는 환경은 조용히 무시
  }
}
