import { useEffect, useState } from 'react'

/** 매 프레임 performance.now() 를 돌려주는 훅 (작은 HUD 요소에만 사용) */
export function useNow(active = true) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!active) return
    let id = 0
    const loop = () => {
      setNow(performance.now())
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
  return now
}
