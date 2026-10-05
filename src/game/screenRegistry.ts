// 서로 다른 View(트레이 → 내 꼬치) 사이를 날아가는 알을 위해,
// "내 꼬치의 n번째 칸이 화면(앱 컨테이너 기준 px)에서 어디인지" 알려주는 함수를 등록해둔다.

export type SlotProjector = (index: number) => { x: number; y: number; r: number }

let projector: SlotProjector | null = null

export const registerSlotProjector = (fn: SlotProjector | null) => {
  projector = fn
}

export const APP_ID = 'dango-app'

export const appRect = () => document.getElementById(APP_ID)?.getBoundingClientRect()

export function projectMySlot(index: number) {
  if (projector) return projector(index)
  // 아직 등록 전이면 대략 오른쪽 가운데
  const r = appRect()
  return { x: (r?.width ?? 400) * 0.72, y: (r?.height ?? 800) * 0.5, r: 24 }
}
