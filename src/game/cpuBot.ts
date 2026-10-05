import { DIFFICULTY } from './config'
import { pickWrongColor, randRange } from './rules'
import { useGame } from './store'

/**
 * CPU 봇: 반응 시간마다 알을 하나씩 꽂는다.
 * 실수 확률만큼 틀린 색을 꽂아 플레이어와 똑같이 스턴을 먹는다.
 * 반환값은 정지 함수.
 */
export function startCpuBot() {
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false

  const schedule = (delay: number) => {
    if (stopped) return
    timer = setTimeout(step, delay)
  }

  const reaction = () => {
    const [min, max] = DIFFICULTY[useGame.getState().difficulty].reactionMs
    return randRange(min, max)
  }

  const step = () => {
    const s = useGame.getState()
    const t = performance.now()
    if (s.phase !== 'playing' || s.mode !== 'cpu') return schedule(100)

    // 스턴 중이거나 새 주문서를 읽는 중이면, 풀린 뒤 다시 반응 시간만큼 기다림
    const blockedUntil = Math.max(s.cpu.stunUntil, s.orderReadyAt)
    if (t < blockedUntil) return schedule(blockedUntil - t + reaction())

    const needed = s.order[s.cpu.stack.length]
    const mistake = Math.random() < DIFFICULTY[s.difficulty].mistakeRate
    s.cpuPlace(mistake ? pickWrongColor(needed) : needed)
    schedule(reaction())
  }

  schedule(reaction())
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
