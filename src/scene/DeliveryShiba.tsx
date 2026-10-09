import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { DELIVERY, type DangoColor } from '../game/config'
import sakuraUrl from '../assets/shiba/sakura.png'
import whiteUrl from '../assets/shiba/white.png'
import mugwortUrl from '../assets/shiba/mugwort.png'
import pumpkinUrl from '../assets/shiba/pumpkin.png'
import mitarashiUrl from '../assets/shiba/mitarashi.png'

// delivery_shiba.png 시트에서 색별로 한 장씩 잘라낸 그림. 모두 왼쪽을 보고 걷는 방향으로 맞춰져 있다.
const SHIBA_URLS: Record<DangoColor, string> = {
  sakura: sakuraUrl,
  white: whiteUrl,
  mugwort: mugwortUrl,
  pumpkin: pumpkinUrl,
  mitarashi: mitarashiUrl,
}
const ALL_URLS = Object.values(SHIBA_URLS)
useTexture.preload(ALL_URLS)

const smooth = (k: number) => k * k * (3 - 2 * k)
const clamp01 = (k: number) => Math.min(1, Math.max(0, k))

/**
 * 새 알 옆에서 스르르 나타나 알을 내려놓고 사라지는 꼬마 시바.
 * position = 알 자리(바닥 높이), 트레이 가운데 쪽에서 걸어 들어온다.
 */
export function DeliveryShiba({ color, position, groundY }: { color: DangoColor; position: [number, number, number]; groundY: number }) {
  const textures = useTexture(ALL_URLS)
  const tex = textures[ALL_URLS.indexOf(SHIBA_URLS[color])]
  // sRGB 로 읽어야 색이 바래지 않는다 (이미 올라간 텍스처면 다시 올리기)
  if (tex.colorSpace !== THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
  }
  const img = tex.image as HTMLImageElement | undefined
  const aspect = img ? img.width / img.height : 0.8

  const group = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const start = useRef(performance.now())
  // 알이 왼쪽에 있으면 오른쪽에서 왼쪽으로 걸어오고(그림 그대로), 반대면 뒤집는다
  const dir = position[0] < 0 ? 1 : -1

  useFrame(() => {
    const g = group.current
    const m = mat.current
    if (!g || !m) return
    const t = performance.now() - start.current
    const { arriveMs, stayMs, leaveMs } = DELIVERY
    const arrive = smooth(clamp01(t / arriveMs))
    const leave = smooth(clamp01((t - arriveMs - stayMs) / leaveMs))
    const done = t > arriveMs + stayMs + leaveMs
    g.visible = !done
    if (done) return

    const offset = DELIVERY.fromOffset + (DELIVERY.toOffset - DELIVERY.fromOffset) * arrive + 0.25 * leave
    // 걸어오는 동안만 종종걸음, 서 있을 땐 살짝 숨쉬기
    const hop = t < arriveMs ? Math.abs(Math.sin(t * DELIVERY.hopSpeed)) * DELIVERY.hopAmp : 0
    g.position.set(position[0] + dir * offset, groundY + hop, position[2] + 0.15)
    const s = 1 - 0.15 * leave
    g.scale.set(s, s * (1 + Math.sin(t * 0.012) * 0.02), s)
    // 반투명한 시간이 길면 색이 바래 보이니, 나타날 땐 빨리 진해지고 사라질 땐 끝에서만 옅어진다
    const fadeIn = clamp01(t / (arriveMs * DELIVERY.fadeInPart))
    const fadeOut = clamp01((leave - (1 - DELIVERY.fadeOutPart)) / DELIVERY.fadeOutPart)
    m.opacity = fadeIn * (1 - fadeOut)
  })

  const h = DELIVERY.height
  return (
    <group ref={group} visible={false}>
      <Billboard>
        {/* 발이 바닥에 닿도록 그림 아래쪽을 원점에 맞춘다. 옆 알에 가려지지 않게 항상 위에 그린다 */}
        <mesh position={[0, h / 2, 0]} scale={[dir * h * aspect, h, 1]} renderOrder={10}>
          <planeGeometry />
          <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
    </group>
  )
}
