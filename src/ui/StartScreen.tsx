import { DIFFICULTY, type Difficulty } from '../game/config'
import { useGame } from '../game/store'
import { hostRoom } from '../net/online'
import { AssetImg } from './AssetImg'

export function StartScreen() {
  const phase = useGame((s) => s.phase)
  const mode = useGame((s) => s.mode)
  const notice = useGame((s) => s.netNotice)
  const difficulty = useGame((s) => s.difficulty)
  const setDifficulty = useGame((s) => s.setDifficulty)
  const startGame = useGame((s) => s.startGame)
  if (phase !== 'menu' || mode !== 'cpu') return null

  return (
    <div className="overlay panel-overlay">
      <div className="panel">
        <AssetImg name="logo.png" className="logo" alt="당고팡" fallback={<h1 className="title">당고팡</h1>} />
        <p className="sub">주문서 순서대로 아래부터 쏙쏙!</p>
        {notice && <p className="net-notice">{notice}</p>}
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
        <button className="sub-btn" onClick={hostRoom}>
          친구와 대전
        </button>
      </div>
    </div>
  )
}
