import { DIFFICULTY } from '../game/config'
import { useGame } from '../game/store'

export function ResultScreen() {
  const phase = useGame((s) => s.phase)
  const me = useGame((s) => s.player.score)
  const cpu = useGame((s) => s.cpu.score)
  const difficulty = useGame((s) => s.difficulty)
  const startGame = useGame((s) => s.startGame)
  const goMenu = useGame((s) => s.goMenu)
  if (phase !== 'result') return null

  const outcome = me > cpu ? 'win' : me < cpu ? 'lose' : 'draw'
  const title = { win: '승리!', lose: '패배…', draw: '무승부' }[outcome]

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
            <small>CPU</small>
            <b>{cpu}</b>
          </div>
        </div>
        <p className="sub">난이도 · {DIFFICULTY[difficulty].label}</p>
        <button className="big-btn" onClick={startGame}>
          다시하기
        </button>
        <button className="text-btn" onClick={goMenu}>
          난이도 바꾸기
        </button>
      </div>
    </div>
  )
}
