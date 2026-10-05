import { useState } from 'react'
import { useGame } from '../game/store'
import { hostRoom, joinRoom, leaveRoom, roomLink } from '../net/online'

/** 친구 대전 대기실: 방 링크 공유 → 연결 → (호스트) 시작 */
export function LobbyScreen() {
  const phase = useGame((s) => s.phase)
  const mode = useGame((s) => s.mode)
  const role = useGame((s) => s.role)
  const net = useGame((s) => s.net)
  const code = useGame((s) => s.roomCode)
  const notice = useGame((s) => s.netNotice)
  const startGame = useGame((s) => s.startGame)
  const [copied, setCopied] = useState(false)
  if (phase !== 'menu' || mode !== 'online') return null

  const link = roomLink(code)
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ title: '당고팡', text: '당고팡 한판 붙자!', url: link })
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 공유 창을 닫은 경우 등은 무시
    }
  }
  const retry = () => (role === 'host' ? hostRoom() : joinRoom(code))

  return (
    <div className="overlay panel-overlay">
      <div className="panel lobby">
        <h2 className="lobby-title">친구와 대전</h2>

        {net === 'failed' ? (
          <>
            <p className="net-notice">{notice}</p>
            <button className="big-btn" onClick={retry}>
              다시 시도
            </button>
          </>
        ) : net === 'connected' ? (
          <>
            <p className="sub">친구가 들어왔어요!</p>
            {role === 'host' ? (
              <button className="big-btn" onClick={startGame}>
                시작하기
              </button>
            ) : (
              <p className="sub">방장이 시작하길 기다리는 중…</p>
            )}
          </>
        ) : role === 'host' ? (
          <>
            <p className="sub">이 링크를 친구에게 보내세요</p>
            <div className="room-code">{code || '…'}</div>
            <button className="big-btn" onClick={share} disabled={!code}>
              {copied ? '복사했어요!' : '링크 보내기'}
            </button>
            <p className="sub small">친구를 기다리는 중…</p>
          </>
        ) : (
          <p className="sub">방 {code} 에 들어가는 중…</p>
        )}

        <button className="text-btn" onClick={leaveRoom}>
          나가기
        </button>
      </div>
    </div>
  )
}
