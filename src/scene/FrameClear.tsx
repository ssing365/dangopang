import { useFrame } from '@react-three/fiber'

/**
 * View 들은 각자 scissor 영역만 그리고 화면을 지우지 않으므로,
 * 매 프레임 맨 먼저(priority 1) 캔버스 전체를 투명하게 지운다.
 * 각 View 는 index(=priority) 2 이상을 사용할 것.
 */
export function FrameClear() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false)
    gl.clear(true, true, true)
  }, 1)
  return null
}
