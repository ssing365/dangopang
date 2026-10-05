import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { animated, useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { DANGO_COLORS, MATERIAL, SIZES, SPRING, type DangoColor } from '../game/config'

// 모든 당고가 같은 지오메트리/색별 머티리얼을 공유
export const dangoGeometry = new THREE.SphereGeometry(SIZES.dangoRadius, 48, 32)

const materialCache = new Map<string, THREE.MeshPhysicalMaterial>()

/** 찹쌀떡 질감: 거친 표면 + sheen 으로 보송하게 */
export function getDangoMaterial(color: DangoColor, overlay = false) {
  const key = `${color}:${overlay}`
  let m = materialCache.get(key)
  if (!m) {
    const c = DANGO_COLORS[color]
    m = new THREE.MeshPhysicalMaterial({
      color: c.hex,
      roughness: MATERIAL.roughness,
      sheen: MATERIAL.sheen,
      sheenRoughness: MATERIAL.sheenRoughness,
      sheenColor: new THREE.Color(c.sheen),
      clearcoat: MATERIAL.clearcoat,
    })
    if (overlay) {
      // 다른 View 위에 겹쳐 그리는 비행용 알: 깊이 무시
      m.depthTest = false
      m.depthWrite = false
    }
    materialCache.set(key, m)
  }
  return m
}

type V3 = [number, number, number]

export interface DangoProps {
  color: DangoColor
  position?: V3
  scale?: number
  /** 이 시각(performance.now) 전에는 숨김 */
  appearAt?: number
  /** appearAt~landAt 동안 dropHeight 에서 떨어짐, 도착 순간 찌부 */
  landAt?: number
  dropHeight?: number
  /** 값이 바뀔 때마다 눌렸다 튀어오름 */
  pokeAt?: number
  /** 마운트 시 0에서 뿅 하고 등장 */
  popIn?: boolean
  popDelay?: number
  hidden?: boolean
  breathe?: boolean
  seed?: number
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  children?: ReactNode
}

export function Dango({
  color,
  position,
  scale = 1,
  appearAt = 0,
  landAt = 0,
  dropHeight = 0,
  pokeAt = 0,
  popIn = false,
  popDelay = 0,
  hidden = false,
  breathe = true,
  seed = 0,
  onPointerDown,
  children,
}: DangoProps) {
  const root = useRef<THREE.Group>(null)
  const drop = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const landed = useRef(landAt <= performance.now())

  const [spring, api] = useSpring(() => ({
    scale: (popIn ? [0, 0, 0] : [1, 1, 1]) as V3,
    config: SPRING.squash,
  }))

  const squash = () =>
    api.start({ from: { scale: [1.32, 0.62, 1.32] }, to: { scale: [1, 1, 1] }, config: SPRING.squash })

  useEffect(() => {
    if (popIn) api.start({ scale: [1, 1, 1], delay: popDelay, config: SPRING.pop })
  }, [popIn, popDelay, api])

  useEffect(() => {
    if (pokeAt) squash()
  }, [pokeAt])

  useFrame(() => {
    const t = performance.now()
    if (root.current) root.current.visible = !hidden && t >= appearAt

    if (drop.current) {
      if (t < landAt && landAt > appearAt) {
        const k = Math.min(1, Math.max(0, (t - appearAt) / (landAt - appearAt)))
        drop.current.position.y = dropHeight * (1 - k * k)
      } else {
        drop.current.position.y = 0
      }
    }
    if (!landed.current && t >= landAt) {
      landed.current = true
      squash()
    }

    if (body.current) {
      const a = breathe ? Math.sin(t * 0.001 * SIZES.breatheSpeed + seed * 1.7) * SIZES.breatheAmp : 0
      body.current.scale.set(1 + a, SIZES.dangoSquashY * (1 - a * 1.4), 1 + a)
    }
  })

  return (
    <group ref={root} position={position} scale={scale}>
      <group ref={drop}>
        <animated.group scale={spring.scale as unknown as V3}>
          <mesh
            ref={body}
            geometry={dangoGeometry}
            material={getDangoMaterial(color)}
            castShadow
            onPointerDown={onPointerDown}
          />
          {children}
        </animated.group>
      </group>
    </group>
  )
}
