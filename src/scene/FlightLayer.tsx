import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { GAME } from '../game/config'
import { useGame, type Flight } from '../game/store'
import { dangoGeometry, getDangoMaterial } from './Dango'
import { SoftLights } from './Lights'

/**
 * 앱 전체를 덮는 오버레이 View 에서, 트레이 → 내 꼬치로 포물선 비행.
 * 정사영 카메라라 1 world unit = 1 CSS px (원점은 View 중앙).
 */
function FlyingDango({ flight }: { flight: Flight }) {
  const ref = useRef<THREE.Mesh>(null)
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera

  useFrame(() => {
    const m = ref.current
    if (!m) return
    const k = Math.min(1, (performance.now() - flight.start) / flight.duration)
    const { from, to } = flight

    let x: number, y: number, u: number
    if (flight.kind === 'hit') {
      u = k
      x = from.x + (to.x - from.x) * u
      y = from.y + (to.y - from.y) * u - GAME.flightArcPx * 4 * u * (1 - u)
    } else {
      // 꼬치 근처까지 갔다가 퉁 튕겨서 제자리로
      const out = k < 0.5
      u = out ? k * 2 : 2 - k * 2
      const reach = 0.85
      x = from.x + (to.x - from.x) * u * reach + (out ? 0 : Math.sin(u * Math.PI) * 30)
      y = from.y + (to.y - from.y) * u * reach - GAME.flightArcPx * 4 * u * (1 - u) * (out ? 1 : 0.6)
    }

    const r = (from.r + (to.r - from.r) * u) * (1 + Math.sin(u * Math.PI) * 0.2)
    // prepareSkissor 가 매 프레임 left/top 을 View 크기의 절반으로 맞춰준다
    m.position.set(x + camera.left, camera.top - y, 0)
    m.scale.set(r * 2, r * 2 * 0.86, r * 2)
    m.rotation.z = k * Math.PI * (flight.kind === 'hit' ? 1.5 : -2)
    m.visible = k < 1
  })

  return (
    <mesh ref={ref} geometry={dangoGeometry} material={getDangoMaterial(flight.color, true)} renderOrder={10} scale={0} />
  )
}

export function FlightLayer() {
  const flights = useGame((s) => s.flights)
  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 500]} near={1} far={2000} />
      <SoftLights />
      {flights.map((f) => (
        <FlyingDango key={f.uid} flight={f} />
      ))}
    </>
  )
}
