import { useState, type CSSProperties } from 'react'
import { isBgmMuted, setBgmMuted } from '../game/sound'
import volumeUrl from '../assets/icons/volume.svg'
import volumeMuteUrl from '../assets/icons/volume-xmark.svg'

/** 우측 상단 BGM 켜기/끄기 버튼 (시작·결과 화면 위에서도 누를 수 있게 오버레이보다 위) */
export function BgmToggle() {
  const [muted, setMuted] = useState(isBgmMuted)
  const toggle = () => {
    setBgmMuted(!muted)
    setMuted(!muted)
  }
  const mask = `url("${muted ? volumeMuteUrl : volumeUrl}")`
  const icon: CSSProperties = { WebkitMaskImage: mask, maskImage: mask }
  return (
    <button
      type="button"
      className={`bgm-toggle ${muted ? 'muted' : ''}`}
      onClick={toggle}
      aria-label={muted ? '배경음악 켜기' : '배경음악 끄기'}
      aria-pressed={!muted}
    >
      <span className="bgm-icon" style={icon} />
    </button>
  )
}
