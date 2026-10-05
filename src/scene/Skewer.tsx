import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { GAME, LIGHTS, SIZES } from '../game/config'
import { useGame, type FinishedSkewer, type Side, type StackBall } from '../game/store'
import { appRect, registerSlotProjector } from '../game/screenRegistry'
import { Dango } from './Dango'
import { SoftLights } from './Lights'

export const slotY = (i: number) => SIZES.slotBaseY + i * SIZES.slotSpacing

const stickGeometry = new THREE.CylinderGeometry(SIZES.skewerRadius, SIZES.skewerRadius, SIZES.skewerLength, 12)
const tipGeometry = new THREE.ConeGeometry(SIZES.skewerRadius, 0.18, 12)
const stickMaterial = new THREE.MeshStandardMaterial({ color: SIZES.skewerColor, roughness: 0.75 })

export function Stick() {
  const half = SIZES.skewerLength / 2
  return (
    <group position={[0, half - 0.45, 0]}>
      <mesh geometry={stickGeometry} material={stickMaterial} />
      <mesh geometry={tipGeometry} material={stickMaterial} position={[0, half + 0.09, 0]} />
    </group>
  )
}

function Balls({ balls, dropHeight }: { balls: StackBall[]; dropHeight: number }) {
  return (
    <>
      {balls.map((b, i) => (
        <Dango
          key={b.uid}
          color={b.color}
          position={[0, slotY(i), 0]}
          appearAt={b.appearAt}
          landAt={b.landAt}
          dropHeight={dropHeight}
          seed={i}
        />
      ))}
    </>
  )
}

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)

/** 완성 꼬치는 통통 튀어 접시(오른쪽 아래)로 빠지고, 뺏긴 꼬치의 알은 쪼그라들며 사라짐 */
function Finished({ item, dropHeight }: { item: FinishedSkewer; dropHeight: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const dt = performance.now() - item.doneAt - 140
    if (dt <= 0) return
    const k = Math.min(1, dt / GAME.finishAnimMs)
    if (item.kind === 'win') {
      const e = easeInOut(k)
      g.position.set(e * 2.6, Math.sin(k * Math.PI) * 1.1 - e * 2.2, 0)
      g.rotation.z = -e * 1.3
      g.scale.setScalar(1 - e * 0.55)
    } else {
      const s = Math.max(0, 1 - dt / 320)
      g.scale.setScalar(s)
      g.position.y = -(1 - s) * 0.6
    }
  })
  return (
    <group ref={ref}>
      {item.kind === 'win' && <Stick />}
      <Balls balls={item.balls} dropHeight={dropHeight} />
    </group>
  )
}

/** 내 꼬치 n번째 칸이 화면 어디인지 FlightLayer 에 알려주기 위한 등록 */
function SlotProjector({ trackId }: { trackId: string }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const v = new THREE.Vector3()
    registerSlotProjector((index) => {
      const el = document.getElementById(trackId)
      const app = appRect()
      if (!el || !app) return { x: 0, y: 0, r: 20 }
      const rect = el.getBoundingClientRect()
      camera.updateMatrixWorld()
      const toPx = (p: THREE.Vector3) => ({
        x: rect.left - app.left + ((p.x + 1) / 2) * rect.width,
        y: rect.top - app.top + ((1 - p.y) / 2) * rect.height,
      })
      const c = toPx(v.set(0, slotY(index), 0).project(camera))
      const e = toPx(v.set(SIZES.dangoRadius, slotY(index), 0).project(camera))
      return { ...c, r: Math.abs(e.x - c.x) }
    })
    return () => registerSlotProjector(null)
  }, [camera, trackId])
  return null
}

export function SkewerScene({ side, trackId }: { side: Side; trackId: string }) {
  const stack = useGame((s) => s[side].stack)
  const finished = useGame((s) => s[side].finished)
  const shakeRef = useRef<THREE.Group>(null)
  const stickRef = useRef<THREE.Group>(null)
  const dropHeight = side === 'cpu' ? 1.8 : 0

  useFrame(() => {
    const t = performance.now()
    const st = useGame.getState()[side]

    // 틀린 알: 꼬치 흔들기
    if (shakeRef.current) {
      const dt = t - st.shakeAt
      shakeRef.current.rotation.z = dt >= 0 && dt < 450 ? Math.sin(dt * 0.05) * 0.2 * (1 - dt / 450) : 0
    }
    // 완성 꼬치가 빠지는 동안 빈 꼬치는 숨겼다가 뿅 등장
    if (stickRef.current) {
      const win = st.finished.find((f) => f.kind === 'win' && t < f.doneAt + GAME.finishAnimMs * 0.6)
      const target = win ? 0 : 1
      const s = stickRef.current.scale
      s.y += (target - s.y) * (target ? 0.18 : 1)
      stickRef.current.visible = s.y > 0.02
    }
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.2, 10.5]} fov={28} onUpdate={(c) => c.lookAt(0, 1.75, 0)} />
      <SoftLights dim={side === 'cpu' ? LIGHTS.cpuDim : 1} />
      {side === 'player' && <SlotProjector trackId={trackId} />}

      <group ref={shakeRef}>
        <group ref={stickRef}>
          <Stick />
        </group>
        <Balls balls={stack} dropHeight={dropHeight} />
      </group>
      {finished.map((f) => (
        <group key={f.uid}>
          <Finished item={f} dropHeight={dropHeight} />
        </group>
      ))}

      <ContactShadows position={[0, -0.56, 0]} opacity={0.35} scale={5} blur={2.4} far={4} resolution={256} color="#8a5a6a" />
    </>
  )
}
