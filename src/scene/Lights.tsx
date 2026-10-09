import { LIGHTS } from '../game/config'

/** 파스텔 톤용 부드러운 조명: ambient + 반구광 + 따뜻한 키 라이트 + 차가운 보조광 + 림 라이트 */
export function SoftLights({ dim = 1 }: { dim?: number }) {
  return (
    <>
      <ambientLight intensity={LIGHTS.ambient * dim} />
      <hemisphereLight args={[LIGHTS.skyColor, LIGHTS.groundColor, LIGHTS.hemi * dim]} />
      <directionalLight position={[3, 6, 5]} intensity={LIGHTS.warm * dim} color={LIGHTS.warmColor} />
      <directionalLight position={[-4, 2, 3]} intensity={LIGHTS.fill * dim} color={LIGHTS.fillColor} />
      <directionalLight position={[-2, 4, -6]} intensity={LIGHTS.rim * dim} color={LIGHTS.rimColor} />
    </>
  )
}
