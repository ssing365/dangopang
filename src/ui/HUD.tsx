import { GAME } from '../game/config'
import { opponentName, useGame, type Side } from '../game/store'
import { AssetImg } from './AssetImg'
import { useNow } from './useNow'
import { useAfter } from './useAfter'

export function Timer() {
  const phase = useGame((s) => s.phase)
  const endsAt = useGame((s) => s.endsAt)
  const now = useNow(phase === 'playing')
  const left =
    phase === 'playing' ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : phase === 'result' ? 0 : GAME.roundSeconds
  return (
    <div className={`timer ${left <= 10 && phase === 'playing' ? 'hurry' : ''}`}>
      <AssetImg name="icon_timer.png" className="icon" fallback={<span className="icon-fallback timer-dot" />} />
      <span>{left}</span>
    </div>
  )
}

/** 꼬치 칸 맨 위 이름표: 누구 칸인지 + 점수 */
export function ColumnHead({ side }: { side: Side }) {
  const rawScore = useGame((s) => s[side].score)
  const last = useGame((s) => s.lastCompletion)
  // 점수는 마지막 알이 꽂히는 순간에 올라가 보이게
  const landed = useAfter(last?.side === side ? last.at : undefined)
  const score = landed ? rawScore : rawScore - 1
  const opponent = opponentName(useGame((s) => s.mode))
  const name = side === 'cpu' ? opponent : '나'
  return (
    <div className={`col-head ${side}`}>
      <AssetImg
        name={side === 'cpu' ? 'cpu_avatar.png' : 'icon_star.png'}
        className="col-head-avatar"
        alt={name}
        fallback={null}
      />
      <span className="col-head-name">{name}</span>
      <span key={score} className="col-head-score">
        {score}
      </span>
    </div>
  )
}

/** 스턴 중 "어질어질" 배지 */
export function StunBadge({ side }: { side: Side }) {
  const stunUntil = useGame((s) => s[side].stunUntil)
  const now = useNow(stunUntil > performance.now())
  if (now >= stunUntil) return null
  return <div className="stun">어질어질~</div>
}

const RESULT_SHOW_MS = 1100

/** 주문서를 누가 먼저 따냈는지: 이긴 쪽 마지막 알이 꽂히는 순간부터 잠깐 표시 */
function useRecentCompletion() {
  const last = useGame((s) => s.lastCompletion)
  const now = useNow(!!last && performance.now() < last.at + RESULT_SHOW_MS)
  if (!last || now < last.at || now > last.at + RESULT_SHOW_MS) return null
  return last
}

export function CompletionToast() {
  const last = useRecentCompletion()
  const name = opponentName(useGame((s) => s.mode))
  if (!last) return null
  const mine = last.side === 'player'
  const text = mine
    ? last.close
      ? '간발의 차로 내가 먼저!'
      : '내가 먼저 완성!'
    : last.close
      ? `간발의 차로 ${name}이 먼저…`
      : `${name}이 먼저 완성…`
  return (
    <div key={last.at} className={`toast ${last.side}`}>
      {text}
    </div>
  )
}

/** 각 꼬치 칸 위의 승패 배지 + 이긴 칸 반짝임 */
export function ColumnResult({ side }: { side: Side }) {
  const last = useRecentCompletion()
  if (!last) return null
  const won = last.side === side
  // 진 쪽 배지는 한 알 차이로 아깝게 놓쳤을 때만
  if (!won && !last.close) return null
  return (
    <>
      {won && <div key={`glow-${last.at}`} className="col-glow" />}
      <div key={last.at} className={`col-badge ${won ? 'won' : 'lost'}`}>
        {won ? '+1' : '아깝다!'}
      </div>
    </>
  )
}

export function Countdown() {
  const phase = useGame((s) => s.phase)
  const start = useGame((s) => s.countdownStart)
  const now = useNow(phase === 'countdown' || phase === 'playing')
  const elapsed = (now - start) / 1000
  const n = GAME.countdownSeconds - Math.floor(elapsed)
  if (phase === 'countdown' && n > 0) {
    return (
      <div className="overlay countdown">
        <span key={n} className="count-num">
          {n}
        </span>
      </div>
    )
  }
  if (phase === 'playing' && elapsed < GAME.countdownSeconds + 0.7) {
    return (
      <div className="overlay countdown passthrough">
        <span className="count-num go">시작!</span>
      </div>
    )
  }
  return null
}
