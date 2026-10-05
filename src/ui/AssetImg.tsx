import { useState, type ReactNode } from 'react'

/**
 * public/assets/<name> 이미지가 있으면 쓰고, 없으면 fallback(플레이스홀더)을 보여준다.
 * 나중에 PNG 파일만 넣으면 자동으로 교체됨.
 */
export function AssetImg({ name, alt = '', className, fallback }: { name: string; alt?: string; className?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return <img src={`/assets/${name}`} alt={alt} className={className} draggable={false} onError={() => setFailed(true)} />
}
