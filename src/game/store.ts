import { create } from 'zustand'
import { GAME, HAPTICS, NET, type DangoColor, type Difficulty } from './config'
import { isCorrect, makeInitialTrayColors, makeOrder, pickRefillColor } from './rules'
import { vibrate } from './haptics'
import type { NetMsg, NetRole } from '../net/protocol'

export type Side = 'player' | 'cpu'
export type Phase = 'menu' | 'countdown' | 'playing' | 'result'
/** cpu = CPU 대전, online = 친구 대전 (player = 나, cpu 쪽 = 친구) */
export type Mode = 'cpu' | 'online'
export type NetStatus = 'idle' | 'waiting' | 'connecting' | 'connected' | 'failed'

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
  mode: Mode
  /** 친구 대전에서 내 역할 (호스트 = 방을 만든 쪽, 주문서/완성 판정 담당) */
  role: NetRole | null
  net: NetStatus
  roomCode: string
  /** 메뉴/로비에 띄울 연결 안내 문구 */
  netNotice: string
  countdownStart: number
  endsAt: number
  order: DangoColor[]
  /** 방금 따낸 주문서: 마지막 알이 꽂힐 때까지(lastCompletion.at) 화면엔 이걸 보여준다 */
  prevOrder: DangoColor[]
  orderUid: number
  orderReadyAt: number
  /** 게스트: 마지막 알을 꽂았고 호스트의 완성 확정을 기다리는 중 */
  pendingComplete: boolean
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

  // 친구 대전: 상대 기기에서 온 메시지 반영
  remoteStart: (order: DangoColor[], orderUid: number) => void
  remotePlace: (color: DangoColor, orderUid: number) => void
  remoteComplete: (winner: NetRole, order: DangoColor[], orderUid: number) => void
  remoteEnd: (host: number, guest: number) => void
}

let uidSeq = 1
const nextUid = () => uidSeq++
const now = () => performance.now()

/** 친구 대전 메시지 송신 (store 가 네트워크 코드를 직접 import 하지 않도록 밖에서 주입) */
let outbox: ((msg: NetMsg) => void) | null = null
export const setOutbox = (fn: ((msg: NetMsg) => void) | null) => {
  outbox = fn
}
const send = (msg: NetMsg) => outbox?.(msg)

const emptySide = (): SideState => ({ stack: [], score: 0, stunUntil: 0, shakeAt: -1e9, finished: [] })

const makeTray = (): TrayBall[] =>
  makeInitialTrayColors().map((color, slot) => ({ slot, uid: nextUid(), color, flying: false, pokeAt: 0 }))

export const canAct = (s: Pick<GameState, 'phase' | 'orderReadyAt'>, side: SideState, t = now()) =>
  s.phase === 'playing' && t >= side.stunUntil && t >= s.orderReadyAt

/** 상대 칸 이름 */
export const opponentName = (mode: Mode) => (mode === 'online' ? '친구' : 'CPU')

const otherOf = (side: Side): Side => (side === 'player' ? 'cpu' : 'player')

/** 친구 대전에서 host/guest ↔ 이 기기의 player/cpu */
const sideOf = (s: Pick<GameState, 'role'>, who: NetRole): Side => (who === s.role ? 'player' : 'cpu')

/**
 * 주문서 완성 처리: 이긴 쪽 +1, 꼬치는 접시로, 진 쪽 진행은 리셋, 다음 주문서.
 * 진 쪽 꼬치는 이긴 쪽 마지막 알이 꽂히는 순간(at)에 사라지게 해서 화면상 순서를 판정과 맞춘다.
 */
function completion(
  s: GameState,
  side: Side,
  balls: StackBall[],
  at: number,
  nextOrder: DangoColor[],
  nextOrderUid: number,
): Partial<GameState> {
  const me = s[side]
  const otherSide = otherOf(side)
  const other = s[otherSide]
  const won: SideState = {
    ...me,
    stack: [],
    score: me.score + 1,
    finished: [...me.finished, { uid: nextUid(), kind: 'win', balls, doneAt: at }],
  }
  const lost: SideState = other.stack.length
    ? { ...other, stack: [], finished: [...other.finished, { uid: nextUid(), kind: 'lost', balls: other.stack, doneAt: at }] }
    : other
  return {
    [side]: won,
    [otherSide]: lost,
    order: nextOrder,
    prevOrder: s.order,
    orderUid: nextOrderUid,
    orderReadyAt: at + GAME.orderSwapDelayMs,
    lastCompletion: { side, at, close: other.stack.length >= s.order.length - 1 },
    pendingComplete: false,
  }
}

/**
 * 한쪽이 알 하나를 꽂으려 할 때의 공통 규칙.
 * 맞으면 쌓고, 주문서를 다 채우면 완성 처리. 틀리면 impactDelay 뒤부터 스턴.
 * canComplete = false 면 다 채워도 완성 처리하지 않고 쌓기만 한다 (친구 대전 게스트: 호스트 판정을 기다림).
 */
function place(
  s: GameState,
  side: Side,
  color: DangoColor,
  appearAt: number,
  landAt: number,
  canComplete = true,
): { patch: Partial<GameState>; hit: boolean; completed: boolean } {
  const me = s[side]
  if (!isCorrect(s.order, me.stack.length, color)) {
    return {
      hit: false,
      completed: false,
      patch: { [side]: { ...me, stunUntil: landAt + GAME.stunMs, shakeAt: landAt } },
    }
  }

  const stack = [...me.stack, { uid: nextUid(), color, appearAt, landAt }]
  if (stack.length < s.order.length || !canComplete) {
    return { hit: true, completed: false, patch: { [side]: { ...me, stack } } }
  }
  return { hit: true, completed: true, patch: completion(s, side, stack, landAt, makeOrder(), nextUid()) }
}

/** 새 라운드 상태 */
const freshRound = (t: number, order: DangoColor[], orderUid: number): Partial<GameState> => ({
  phase: 'countdown',
  countdownStart: t,
  endsAt: t + (GAME.countdownSeconds + GAME.roundSeconds) * 1000,
  order,
  prevOrder: [],
  orderUid,
  orderReadyAt: 0,
  pendingComplete: false,
  player: emptySide(),
  cpu: emptySide(),
  tray: makeTray(),
  flights: [],
  lastCompletion: null,
  netNotice: '',
})

export const useGame = create<GameState>((set, get) => ({
  phase: 'menu',
  difficulty: 'normal',
  mode: 'cpu',
  role: null,
  net: 'idle',
  roomCode: '',
  netNotice: '',
  countdownStart: 0,
  endsAt: 0,
  order: makeOrder(),
  prevOrder: [],
  orderUid: nextUid(),
  orderReadyAt: 0,
  pendingComplete: false,
  player: emptySide(),
  cpu: emptySide(),
  tray: makeTray(),
  flights: [],
  lastCompletion: null,

  setDifficulty: (difficulty) => set({ difficulty }),

  startGame: () => {
    const s = get()
    // 친구 대전에선 호스트만 시작할 수 있다
    if (s.mode === 'online' && (s.role !== 'host' || s.net !== 'connected')) return
    const order = makeOrder()
    const orderUid = nextUid()
    set(freshRound(now(), order, orderUid))
    if (s.mode === 'online') send({ t: 'start', order, orderUid })
  },

  goMenu: () => set({ phase: 'menu', player: emptySide(), cpu: emptySide(), flights: [], lastCompletion: null }),

  tapTray: (slot, from, target) => {
    const s = get()
    const t = now()
    const ball = s.tray[slot]
    if (!ball || ball.flying || s.pendingComplete || !canAct(s, s.player, t)) return

    const correct = isCorrect(s.order, s.player.stack.length, ball.color)
    const duration = correct ? GAME.flightHitMs : GAME.flightMissMs
    // 틀린 알은 날아가는 길의 절반 지점에서 꼬치에 부딪힘
    const landAt = correct ? t + duration : t + duration / 2
    const dest = target(s.player.stack.length)
    const guest = s.mode === 'online' && s.role === 'guest'
    const { patch, hit, completed } = place(s, 'player', ball.color, landAt, landAt, !guest)

    vibrate(hit ? HAPTICS.hit : HAPTICS.miss)

    set({
      ...patch,
      // 게스트가 마지막 알을 꽂으면 호스트 확정이 올 때까지 입력을 막는다
      ...(guest && hit && s.player.stack.length + 1 === s.order.length ? { pendingComplete: true } : {}),
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

    if (s.mode === 'online') {
      send({ t: 'place', color: ball.color, orderUid: s.orderUid })
      if (completed) send({ t: 'complete', winner: 'host', order: patch.order!, orderUid: patch.orderUid! })
    }
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
      if (s.mode === 'cpu') {
        patch.phase = 'result'
      } else if (s.role === 'host') {
        patch.phase = 'result'
        send({ t: 'end', host: s.player.score, guest: s.cpu.score })
      } else if (t >= s.endsAt + NET.endWaitMs) {
        // 게스트: 호스트의 최종 점수가 안 오면 내 점수로 끝낸다
        patch.phase = 'result'
      }
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

  remoteStart: (order, orderUid) => set(freshRound(now(), order, orderUid)),

  remotePlace: (color, orderUid) => {
    const s = get()
    // 이미 지난 주문서에 꽂은 알은 무시 (상대가 아직 완성 소식을 못 받은 상태)
    if (orderUid !== s.orderUid || (s.phase !== 'countdown' && s.phase !== 'playing')) return
    const t = now()
    // 완성 판정은 호스트만: 게스트 화면에선 호스트 알로 다 채워도 complete 메시지를 기다린다
    const { patch, completed } = place(s, 'cpu', color, t, t + GAME.cpuDropMs, s.role === 'host')
    set(patch)
    if (completed) send({ t: 'complete', winner: 'guest', order: patch.order!, orderUid: patch.orderUid! })
  },

  remoteComplete: (winner, order, orderUid) => {
    const s = get()
    const side = sideOf(s, winner)
    const balls = s[side].stack
    // 마지막 알이 아직 날아가는 중이면 착지 순간에 맞춘다
    const at = Math.max(now(), balls.at(-1)?.landAt ?? 0)
    set(completion(s, side, balls, at, order, orderUid))
  },

  remoteEnd: (host, guest) => {
    const s = get()
    set({
      phase: 'result',
      player: { ...s.player, score: s.role === 'host' ? host : guest },
      cpu: { ...s.cpu, score: s.role === 'host' ? guest : host },
    })
  },
}))
