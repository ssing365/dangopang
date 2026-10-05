import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { useAfter } from '../ui/useAfter'
import { Dango } from './Dango'
import { SoftLights } from './Lights'
import { Stick, slotY } from './Skewer'

/** 다음에 꽂아야 할 알은 콩콩 뛰고, 이미 꽂은 알은 작아짐 */
function OrderBall({
  index,
  color,
  popDelay,
  done,
}: {
  index: number
  color: Parameters<typeof Dango>[0]['color']
  popDelay: number
  /** 이미 따낸 주문서를 보여주는 중이면 전부 꽂힌 상태로 */
  done: boolean
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const progress = done ? Infinity : useGame.getState().player.stack.length
    const t = performance.now() * 0.001
    const target = index < progress ? 0.7 : 1
    const s = g.scale.x + (target - g.scale.x) * 0.2
    g.scale.setScalar(s)
    g.position.x = index === progress ? Math.abs(Math.sin(t * 7)) * 0.12 : 0
  })
  return (
    <group ref={ref} position={[0, slotY(index), 0]}>
      <Dango color={color} popIn={!done} popDelay={popDelay} seed={index} />
    </group>
  )
}

export function OrderBoardScene() {
  const nextOrder = useGame((s) => s.order)
  const prevOrder = useGame((s) => s.prevOrder)
  const orderUid = useGame((s) => s.orderUid)
  const swapAt = useGame((s) => s.lastCompletion?.at)
  // 판정은 탭 순간이지만, 새 주문서는 마지막 알이 실제로 꽂힌 뒤에 등장
  const swapped = useAfter(swapAt)
  const order = swapped ? nextOrder : prevOrder
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.8, 10]} fov={25} onUpdate={(c) => c.lookAt(0, 1.75, 0)} />
      <SoftLights />
      <group key={swapped ? orderUid : `prev-${orderUid}`} rotation={[0, 0, -0.12]}>
        <Stick />
        {order.map((c, i) => (
          <OrderBall key={i} index={i} color={c} popDelay={swapped ? i * 70 : 0} done={!swapped} />
        ))}
      </group>
    </>
  )
}
