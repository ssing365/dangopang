import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { animated, useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { DANGO_COLORS, MATERIAL, SIZES, SPRING, TEXTURE, type DangoColor } from '../game/config'

// ── 손으로 빚은 느낌을 내기 위한 절차적 노이즈 ──────────────────────────

function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}

/** 3D 값 노이즈 (0~1). 구 표면 방향으로 샘플링하면 이음새가 생기지 않는다 */
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}

/** 구 UV 에 맞춘 텍스처: 각 텍셀을 구 위 방향으로 바꿔 3D 노이즈를 찍는다 */
function sphereNoiseTexture(
  size: number,
  sample: (x: number, y: number, z: number) => number,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
) {
  const w = size * 2, h = size
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  for (let j = 0; j < h; j++) {
    const theta = ((j + 0.5) / h) * Math.PI
    for (let i = 0; i < w; i++) {
      const phi = ((i + 0.5) / w) * Math.PI * 2
      const x = -Math.cos(phi) * Math.sin(theta)
      const y = Math.cos(theta)
      const z = Math.sin(phi) * Math.sin(theta)
      const g = Math.round(Math.min(1, Math.max(0, sample(x, y, z))) * 255)
      const k = (j * w + i) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = g
      img.data[k + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = colorSpace
  tex.anisotropy = 4
  return tex
}

const T = TEXTURE
/** 표면 결: 찹쌀 반죽의 오톨도톨한 결 + 가루 알갱이 */
const grainTexture = sphereNoiseTexture(T.size, (x, y, z) => {
  const f = T.grainFreq
  const big = noise3(x * f, y * f, z * f)
  const fine = noise3(x * f * 3.1 + 7, y * f * 3.1, z * f * 3.1)
  return 0.5 + (big - 0.5) * 0.7 + (fine - 0.5) * 0.6
})
/** 색 얼룩: 아주 옅게 어두운 부분이 섞여서 단색 플라스틱처럼 안 보이게 */
const mottleTexture = sphereNoiseTexture(
  T.size / 2,
  (x, y, z) => {
    const f = T.mottleFreq
    return 1 - T.mottle * noise3(x * f + 3, y * f, z * f)
  },
  THREE.SRGBColorSpace,
)

/** 완벽한 구 대신 살짝 찌그러진 손빚은 모양. 이음새 법선은 같은 위치끼리 평균낸다 */
function makeLumpyGeometry(variant: number) {
  const geo = new THREE.SphereGeometry(SIZES.dangoRadius, 48, 32)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const p = new THREE.Vector3()
  const f = SIZES.lumpFreq
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    const n = p.clone().normalize()
    const o = variant * 17.3
    const d = noise3(n.x * f + o, n.y * f + o, n.z * f + o) - 0.5
    p.multiplyScalar(1 + d * 2 * SIZES.lumpAmp)
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  geo.computeVertexNormals()
  const nor = geo.attributes.normal as THREE.BufferAttribute
  const sums = new Map<string, THREE.Vector3>()
  const keyOf = (i: number) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`
  for (let i = 0; i < pos.count; i++) {
    const k = keyOf(i)
    const s = sums.get(k) ?? new THREE.Vector3()
    s.x += nor.getX(i); s.y += nor.getY(i); s.z += nor.getZ(i)
    sums.set(k, s)
  }
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(keyOf(i))!.clone().normalize()
    nor.setXYZ(i, s.x, s.y, s.z)
  }
  return geo
}

const dangoGeometries = Array.from({ length: SIZES.lumpVariants }, (_, i) => makeLumpyGeometry(i))
export const dangoGeometry = dangoGeometries[0]
/** seed 별로 모양이 조금씩 다른 지오메트리 (같은 seed 는 항상 같은 모양) */
export function getDangoGeometry(seed: number) {
  return dangoGeometries[Math.abs(Math.round(seed)) % dangoGeometries.length]
}

const materialCache = new Map<string, THREE.MeshPhysicalMaterial>()

/** 찹쌀떡 질감: 오톨도톨한 결 + 부드럽게 퍼지는 광택 + sheen 으로 보송하게 */
export function getDangoMaterial(color: DangoColor, overlay = false) {
  const key = `${color}:${overlay}`
  let m = materialCache.get(key)
  if (!m) {
    const c = DANGO_COLORS[color]
    m = new THREE.MeshPhysicalMaterial({
      color: c.hex,
      map: mottleTexture,
      bumpMap: grainTexture,
      bumpScale: MATERIAL.bumpScale,
      roughness: MATERIAL.roughness,
      specularIntensity: MATERIAL.specular,
      sheen: MATERIAL.sheen,
      sheenRoughness: MATERIAL.sheenRoughness,
      sheenColor: new THREE.Color(c.sheen),
      clearcoat: MATERIAL.clearcoat,
      clearcoatRoughness: MATERIAL.clearcoatRoughness,
      emissive: c.hex,
      emissiveIntensity: MATERIAL.emissive,
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
            geometry={getDangoGeometry(seed)}
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
