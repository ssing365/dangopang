import { useEffect, useRef, type CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import { View } from '@react-three/drei'
import { LAYOUT } from './game/config'
import { startCpuBot } from './game/cpuBot'
import { useGame } from './game/store'
import { joinRoom, roomCodeFromUrl } from './net/online'
import { APP_ID } from './game/screenRegistry'
import { FrameClear } from './scene/FrameClear'
import { OrderBoardScene } from './scene/OrderBoard'
import { SkewerScene } from './scene/Skewer'
import { TrayScene } from './scene/Tray'
import { FlightLayer } from './scene/FlightLayer'
import { AssetImg } from './ui/AssetImg'
import { ColumnHead, ColumnResult, CompletionToast, Countdown, StunBadge, Timer } from './ui/HUD'
import { StartScreen } from './ui/StartScreen'
import { ResultScreen } from './ui/ResultScreen'
import { LobbyScreen } from './ui/LobbyScreen'
import { BgmToggle } from './ui/BgmToggle'

/** 모바일 브라우저 기본 제스처(확대/스크롤/길게누르기 메뉴) 막기 */
function useBlockBrowserGestures() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault()
    const opts = { passive: false } as const
    document.addEventListener('contextmenu', prevent)
    document.addEventListener('gesturestart', prevent, opts)
    document.addEventListener('dblclick', prevent, opts)
    document.addEventListener('touchmove', prevent, opts)
    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('gesturestart', prevent)
      document.removeEventListener('dblclick', prevent)
      document.removeEventListener('touchmove', prevent)
    }
  }, [])
}

export default function App() {
  const appRef = useRef<HTMLDivElement>(null!)
  useBlockBrowserGestures()

  // 친구가 보낸 방 링크(?room=CODE)로 들어오면 바로 접속
  useEffect(() => {
    const code = roomCodeFromUrl()
    if (code) joinRoom(code)
  }, [])

  useEffect(() => {
    const id = setInterval(() => useGame.getState().tick(), 50)
    const stopBot = startCpuBot()
    return () => {
      clearInterval(id)
      stopBot()
    }
  }, [])

  const vars = {
    '--max-w': `${LAYOUT.maxWidth}px`,
    '--top': LAYOUT.topPct,
    '--mid': LAYOUT.midPct,
    '--bottom': LAYOUT.bottomPct,
    '--my-flex': LAYOUT.myColumnFlex,
  } as CSSProperties

  return (
    <div id={APP_ID} ref={appRef} className="app" style={vars}>
      <div className="layout">
        <section className="top">
          <div className="order-card">
            <span className="tag">주문서</span>
            <View id="view-order" className="view" index={2}>
              <OrderBoardScene />
            </View>
          </div>
          <Timer />
        </section>

        <section className="mid">
          <div className="col cpu">
            <ColumnHead side="cpu" />
            <AssetImg name="plate.png" className="plate" fallback={<div className="plate plate-fallback" />} />
            <View id="view-cpu" className="view" index={3}>
              <SkewerScene side="cpu" trackId="view-cpu" />
            </View>
            <StunBadge side="cpu" />
            <ColumnResult side="cpu" />
          </div>
          <div className="col me">
            <ColumnHead side="player" />
            <AssetImg name="plate.png" className="plate" fallback={<div className="plate plate-fallback" />} />
            <View id="view-player" className="view" index={4}>
              <SkewerScene side="player" trackId="view-player" />
            </View>
            <StunBadge side="player" />
            <ColumnResult side="player" />
          </div>
          <CompletionToast />
        </section>

        <section className="bottom">
          <div className="tray-card">
            <View id="view-tray" className="view" index={5}>
              <TrayScene />
            </View>
          </div>
        </section>
      </div>

      {/* 트레이 → 꼬치 비행 알을 그리는 전체 오버레이 (입력은 통과) */}
      <View className="fx-view" index={10}>
        <FlightLayer />
      </View>

      <Canvas
        // 캔버스는 창 전체에 고정: drei View 의 화면 밖 판정이 창 좌표와 캔버스 크기를 비교하므로,
        // 앱이 가운데 정렬돼 왼쪽 여백이 생기면 오른쪽 View 들이 안 그려지는 문제를 피한다.
        style={{ position: 'fixed', inset: 0, zIndex: 1 }}
        eventSource={appRef}
        eventPrefix="client"
        dpr={[1, 2]}
        flat
        gl={{ antialias: true, alpha: true }}
      >
        <FrameClear />
        <View.Port />
      </Canvas>

      <Countdown />
      <StartScreen />
      <LobbyScreen />
      <ResultScreen />
      <BgmToggle />
    </div>
  )
}
