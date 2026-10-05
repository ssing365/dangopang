import type { DangoColor } from '../game/config'

export type NetRole = 'host' | 'guest'

/**
 * 두 기기 사이 메시지. 기기마다 performance.now() 기준이 달라서 절대 시각은 보내지 않는다.
 * 주문서 생성과 "누가 먼저 완성했나" 판정은 호스트만 한다.
 */
export type NetMsg =
  | { t: 'ping' }
  | { t: 'bye' }
  /** 내 알 하나를 꽂음 (틀린 알 포함). orderUid 는 보낸 쪽이 보고 있던 주문서 */
  | { t: 'place'; color: DangoColor; orderUid: number }
  /** 호스트 → 게스트: 라운드 시작 */
  | { t: 'start'; order: DangoColor[]; orderUid: number }
  /** 호스트 → 게스트: 주문서 완성 확정 + 다음 주문서 */
  | { t: 'complete'; winner: NetRole; order: DangoColor[]; orderUid: number }
  /** 호스트 → 게스트: 라운드 종료 + 최종 점수 */
  | { t: 'end'; host: number; guest: number }
