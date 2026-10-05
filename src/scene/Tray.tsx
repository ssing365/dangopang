import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { SIZES } from '../game/config'
import { TRAY_SLOTS } from '../game/rules'
import { useGame, type TrayBall } from '../game/store'
import { appRect, projectMySlot } from '../game/screenRegistry'
import { Dango } from './Dango'
import { SoftLights } from './Lights'

function TrayDango({ ball }: { ball: TrayBall }) {
  const tapTray = useGame((s) => s.tapTray)

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const app = appRect()
    const view = document.getElementById('view-tray')?.getBoundingClientRect()
    if (!app || !view) return
    // 탭한 알의 화면상 중심/반지름 → 비행 시작점
    const toPx = (p: THREE.Vector3) => ({
      x: view.left - app.left + ((p.x + 1) / 2) * view.width,
      y: view.top - app.top + ((1 - p.y) / 2) * view.height,
    })
    const center = new THREE.Vector3()
    e.eventObject.getWorldPosition(center)
    const c = toPx(center.clone().project(e.camera))
    const edge = toPx(center.add(new THREE.Vector3(SIZES.dangoRadius * SIZES.trayBallScale, 0, 0)).project(e.camera))
    tapTray(ball.slot, { ...c, r: Math.abs(edge.x - c.x) }, projectMySlot)
  }

  return (
    <Dango
      color={ball.color}
      position={TRAY_SLOTS[ball.slot]}
      scale={SIZES.trayBallScale}
      hidden={ball.flying}
      pokeAt={ball.pokeAt}
      popIn
      popDelay={60}
      seed={ball.slot}
    >
      {/* 손가락용으로 조금 넉넉한 투명 히트 영역 */}
      <mesh onPointerDown={onPointerDown}>
        <sphereGeometry args={[0.66, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </Dango>
  )
}

export function TrayScene() {
  const tray = useGame((s) => s.tray)
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 6.2, 5.2]} fov={36} onUpdate={(c) => c.lookAt(0, 0, 0.15)} />
      <SoftLights />
      {tray.map((b) => (
        <TrayDango key={b.uid} ball={b} />
      ))}
      <ContactShadows position={[0, -0.44, 0]} opacity={0.4} scale={9} blur={2} far={2} resolution={256} color="#8a5a6a" />
    </>
  )
}
