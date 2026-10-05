import { ACTIVE_COLORS, GAME, type DangoColor } from './config'

export const randRange = (min: number, max: number) => min + Math.random() * (max - min)
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** 새 주문서: 3~4알, 같은 색이 3연속은 안 나오게 */
export function makeOrder(): DangoColor[] {
  const len = Math.floor(randRange(GAME.orderLengthMin, GAME.orderLengthMax + 1))
  const order: DangoColor[] = []
  while (order.length < len) {
    const c = pick(ACTIVE_COLORS)
    const n = order.length
    if (n >= 2 && order[n - 1] === c && order[n - 2] === c) continue
    order.push(c)
  }
  return order
}

/** 지금 꽂으려는 알이 주문서 순서(아래→위)에 맞는지 */
export function isCorrect(order: DangoColor[], stackLength: number, color: DangoColor) {
  return order[stackLength] === color
}

/** 처음 트레이: 모든 색이 고르게 섞여 있게 */
export function makeInitialTrayColors(): DangoColor[] {
  const colors: DangoColor[] = []
  for (let i = 0; i < GAME.traySize; i++) colors.push(ACTIVE_COLORS[i % ACTIVE_COLORS.length])
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[colors[i], colors[j]] = [colors[j], colors[i]]
  }
  return colors
}

/** 빈 칸을 채울 색: 트레이에 없는 색이 있으면 그 색을 우선 → 항상 모든 색이 존재 */
export function pickRefillColor(remaining: DangoColor[]): DangoColor {
  const missing = ACTIVE_COLORS.filter((c) => !remaining.includes(c))
  return missing.length ? pick(missing) : pick(ACTIVE_COLORS)
}

/** CPU가 실수할 때 고를 틀린 색 */
export function pickWrongColor(correct: DangoColor): DangoColor {
  return pick(ACTIVE_COLORS.filter((c) => c !== correct))
}

/** 트레이 슬롯 배치 (5x2, 살짝 흩어짐) — 한 번만 계산해서 고정 */
export const TRAY_SLOTS: [number, number, number][] = Array.from({ length: GAME.traySize }, (_, i) => {
  const cols = Math.ceil(GAME.traySize / 2)
  const row = Math.floor(i / cols)
  const col = i % cols
  const jx = Math.sin(i * 12.9898) * 0.18
  const jz = Math.cos(i * 78.233) * 0.16
  const x = (col - (cols - 1) / 2) * 1.32 + (row ? 0.33 : -0.2) + jx
  const z = (row - 0.5) * 1.45 + jz
  return [x, 0, z]
})
