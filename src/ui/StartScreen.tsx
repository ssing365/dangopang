import { DIFFICULTY, type Difficulty } from '../game/config'
import { useGame } from '../game/store'
import { AssetImg } from './AssetImg'

export function StartScreen() {
  const phase = useGame((s) => s.phase)
  const difficulty = useGame((s) => s.difficulty)
  const setDifficulty = useGame((s) => s.setDifficulty)
  const startGame = useGame((s) => s.startGame)
  if (phase !== 'menu') return null

  return (
    <div className="overlay panel-overlay">
      <div className="panel">
        <AssetImg name="logo.png" className="logo" alt="당고팡" fallback={<h1 className="title">당고팡</h1>} />
        <p className="sub">주문서 순서대로 아래부터 쏙쏙!</p>
        <div className="diff-row">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button key={d} className={`chip ${d === difficulty ? 'on' : ''}`} onClick={() => setDifficulty(d)}>
              {DIFFICULTY[d].label}
            </button>
          ))}
        </div>
        <button className="big-btn" onClick={startGame}>
          시작하기
        </button>
      </div>
    </div>
  )
}
