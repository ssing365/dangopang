import { DIFFICULTY } from '../game/config'
import { opponentName, useGame } from '../game/store'
import { leaveRoom } from '../net/online'

export function ResultScreen() {
  const phase = useGame((s) => s.phase)
  const mode = useGame((s) => s.mode)
  const role = useGame((s) => s.role)
  const me = useGame((s) => s.player.score)
  const cpu = useGame((s) => s.cpu.score)
  const difficulty = useGame((s) => s.difficulty)
  const startGame = useGame((s) => s.startGame)
  const goMenu = useGame((s) => s.goMenu)
  if (phase !== 'result') return null

  const outcome = me > cpu ? 'win' : me < cpu ? 'lose' : 'draw'
  const title = { win: '승리!', lose: '패배…', draw: '무승부' }[outcome]
  const online = mode === 'online'

  return (
    <div className="overlay panel-overlay">
      <div className={`panel result ${outcome}`}>
        <h2 className="result-title">{title}</h2>
        <div className="result-scores">
          <div>
            <small>나</small>
            <b>{me}</b>
          </div>
          <span className="vs">:</span>
          <div>
            <small>{opponentName(mode)}</small>
            <b>{cpu}</b>
          </div>
        </div>
        {online ? (
          <>
            {role === 'host' ? (
              <button className="big-btn" onClick={startGame}>
                다시하기
              </button>
            ) : (
              <p className="sub">방장이 다시 시작하길 기다리는 중…</p>
            )}
            <button className="text-btn" onClick={leaveRoom}>
              나가기
            </button>
          </>
        ) : (
          <>
            <p className="sub">난이도 · {DIFFICULTY[difficulty].label}</p>
            <button className="big-btn" onClick={startGame}>
              다시하기
            </button>
            <button className="text-btn" onClick={goMenu}>
              난이도 바꾸기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
