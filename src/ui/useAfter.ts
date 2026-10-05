import { useEffect, useReducer } from 'react'

/** time(performance.now 기준)이 지났는지. 지나는 순간 한 번 다시 렌더링한다 */
export function useAfter(time: number | undefined) {
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  const passed = time === undefined || performance.now() >= time
  useEffect(() => {
    if (time === undefined) return
    const wait = time - performance.now()
    if (wait <= 0) return
    const id = setTimeout(rerender, wait + 1)
    return () => clearTimeout(id)
  }, [time])
  return passed
}
