import { create } from 'zustand'
import { GAME, HAPTICS, type DangoColor, type Difficulty } from './config'
import { isCorrect, makeInitialTrayColors, makeOrder, pickRefillColor } from './rules'
import { vibrate } from './haptics'

export type Side = 'player' | 'cpu'
export type Phase = 'menu' | 'countdown' | 'playing' | 'result'

export interface StackBall {
  uid: number
  color: DangoColor
  /** 이 시각 이전엔 아직 날아오는 중 (보이지 않거나 떨어지는 중) */
  appearAt: number
  landAt: number
}

/** 완성(win) 또는 상대에게 뺏긴(lost) 꼬치 — 사라지는 연출용 */
export interface FinishedSkewer {
  uid: number
  kind: 'win' | 'lost'
  balls: StackBall[]
  doneAt: number
}

export interface SideState {
  stack: StackBall[]
  score: number
  stunUntil: number
  shakeAt: number
  finished: FinishedSkewer[]
}

export interface TrayBall {
  slot: number
  uid: number
  color: DangoColor
  flying: boolean
  /** 탭 시 눌림 스프링 트리거 */
  pokeAt: number
}

export interface ScreenPoint {
  x: number
  y: number
  r: number
}

export interface Flight {
  uid: number
  slot: number
  color: DangoColor
  kind: 'hit' | 'miss'
  from: ScreenPoint
  to: ScreenPoint
  start: number
  duration: number
}

interface GameState {
  phase: Phase
  difficulty: Difficulty
  countdownStart: number
  endsAt: number
  order: DangoColor[]
  /** 방금 따낸 주문서: 마지막 알이 꽂힐 때까지(lastCompletion.at) 화면엔 이걸 보여준다 */
  prevOrder: DangoColor[]
  orderUid: number
  orderReadyAt: number
  player: SideState
  cpu: SideState
  tray: TrayBall[]
  flights: Flight[]
  /** 마지막으로 주문서를 따낸 쪽. close = 진 쪽도 한 알만 남았던 아슬아슬한 승부 */
  lastCompletion: { side: Side; at: number; close: boolean } | null

  setDifficulty: (d: Difficulty) => void
  startGame: () => void
  goMenu: () => void
  /** 트레이 알 탭. from/target 은 앱 컨테이너 기준 px (r = 화면상 반지름) */
  tapTray: (slot: number, from: ScreenPoint, target: (index: number) => ScreenPoint) => void
  cpuPlace: (color: DangoColor) => void
  tick: () => void
}

let uidSeq = 1
const nextUid = () => uidSeq++
const now = () => performance.now()

const emptySide = (): SideState => ({ stack: [], score: 0, stunUntil: 0, shakeAt: -1e9, finished: [] })

const makeTray = (): TrayBall[] =>
  makeInitialTrayColors().map((color, slot) => ({ slot, uid: nextUid(), color, flying: false, pokeAt: 0 }))

export const canAct = (s: Pick<GameState, 'phase' | 'orderReadyAt'>, side: SideState, t = now()) =>
  s.phase === 'playing' && t >= side.stunUntil && t >= s.orderReadyAt

/**
 * 한쪽이 알 하나를 꽂으려 할 때의 공통 규칙.
 * 맞으면 쌓고, 주문서를 다 채우면 점수 +1 / 새 주문서 / 상대 진행은 리셋.
 * 틀리면 impactDelay 뒤부터 스턴.
 */
function place(
  s: GameState,
  side: Side,
  color: DangoColor,
  appearAt: number,
  landAt: number,
): { patch: Partial<GameState>; hit: boolean } {
  const me = s[side]
  if (!isCorrect(s.order, me.stack.length, color)) {
    return {
      hit: false,
      patch: { [side]: { ...me, stunUntil: landAt + GAME.stunMs, shakeAt: landAt } },
    }
  }

  const stack = [...me.stack, { uid: nextUid(), color, appearAt, landAt }]
  if (stack.length < s.order.length) {
    return { hit: true, patch: { [side]: { ...me, stack } } }
  }

  // 완성!
  const otherSide: Side = side === 'player' ? 'cpu' : 'player'
  const other = s[otherSide]
  const won: SideState = {
    ...me,
    stack: [],
    score: me.score + 1,
    finished: [...me.finished, { uid: nextUid(), kind: 'win', balls: stack, doneAt: landAt }],
  }
  const lost: SideState = other.stack.length
    ? // 진 쪽 꼬치는 이긴 쪽 마지막 알이 꽂히는 순간(landAt)에 사라지게 해서 화면상 순서를 판정과 맞춘다
      { ...other, stack: [], finished: [...other.finished, { uid: nextUid(), kind: 'lost', balls: other.stack, doneAt: landAt }] }
    : other
  return {
    hit: true,
    patch: {
      [side]: won,
      [otherSide]: lost,
      order: makeOrder(),
      prevOrder: s.order,
      orderUid: nextUid(),
      orderReadyAt: landAt + GAME.orderSwapDelayMs,
      lastCompletion: { side, at: landAt, close: other.stack.length >= s.order.length - 1 },
    },
  }
}

export const useGame = create<GameState>((set, get) => ({
  phase: 'menu',
  difficulty: 'normal',
  countdownStart: 0,
  endsAt: 0,
  order: makeOrder(),
  prevOrder: [],
  orderUid: nextUid(),
  orderReadyAt: 0,
  player: emptySide(),
  cpu: emptySide(),
  tray: makeTray(),
  flights: [],
  lastCompletion: null,

  setDifficulty: (difficulty) => set({ difficulty }),

  startGame: () => {
    const t = now()
    set({
      phase: 'countdown',
      countdownStart: t,
      endsAt: t + (GAME.countdownSeconds + GAME.roundSeconds) * 1000,
      order: makeOrder(),
      orderUid: nextUid(),
      orderReadyAt: 0,
      player: emptySide(),
      cpu: emptySide(),
      tray: makeTray(),
      flights: [],
      lastCompletion: null,
    })
  },

  goMenu: () => set({ phase: 'menu', player: emptySide(), cpu: emptySide(), flights: [], lastCompletion: null }),

  tapTray: (slot, from, target) => {
    const s = get()
    const t = now()
    const ball = s.tray[slot]
    if (!ball || ball.flying || !canAct(s, s.player, t)) return

    const correct = isCorrect(s.order, s.player.stack.length, ball.color)
    const duration = correct ? GAME.flightHitMs : GAME.flightMissMs
    // 틀린 알은 날아가는 길의 절반 지점에서 꼬치에 부딪힘
    const landAt = correct ? t + duration : t + duration / 2
    const dest = target(s.player.stack.length)
    const { patch, hit } = place(s, 'player', ball.color, landAt, landAt)

    vibrate(hit ? HAPTICS.hit : HAPTICS.miss)

    set({
      ...patch,
      tray: s.tray.map((b) => (b.slot === slot ? { ...b, flying: true, pokeAt: t } : b)),
      flights: [
        ...s.flights,
        {
          uid: nextUid(),
          slot,
          color: ball.color,
          kind: hit ? 'hit' : 'miss',
          from,
          to: dest,
          start: t,
          duration,
        },
      ],
    })
  },

  cpuPlace: (color) => {
    const s = get()
    const t = now()
    if (!canAct(s, s.cpu, t)) return
    const { patch } = place(s, 'cpu', color, t, t + GAME.cpuDropMs)
    set(patch)
  },

  tick: () => {
    const s = get()
    const t = now()
    const patch: Partial<GameState> = {}

    if (s.phase === 'countdown' && t >= s.countdownStart + GAME.countdownSeconds * 1000) {
      patch.phase = 'playing'
    }
    if (s.phase === 'playing' && t >= s.endsAt) {
      patch.phase = 'result'
    }

    // 끝난 비행 처리: 맞은 알은 트레이 새로 채우기, 틀린 알은 제자리 복귀
    const done = s.flights.filter((f) => t >= f.start + f.duration)
    if (done.length) {
      let tray = s.tray
      for (const f of done) {
        tray = tray.map((b) => {
          if (b.slot !== f.slot) return b
          if (f.kind === 'miss') return { ...b, flying: false, pokeAt: t }
          const remaining = tray.filter((o) => o.slot !== f.slot).map((o) => o.color)
          return { slot: b.slot, uid: nextUid(), color: pickRefillColor(remaining), flying: false, pokeAt: 0 }
        })
      }
      patch.tray = tray
      patch.flights = s.flights.filter((f) => !done.includes(f))
    }

    // 연출이 끝난 완성 꼬치 정리
    for (const side of ['player', 'cpu'] as const) {
      const st = s[side]
      if (st.finished.some((f) => t > f.doneAt + GAME.finishAnimMs + 400)) {
        patch[side] = { ...st, finished: st.finished.filter((f) => t <= f.doneAt + GAME.finishAnimMs + 400) }
      }
    }

    if (Object.keys(patch).length) set(patch)
  },
}))
