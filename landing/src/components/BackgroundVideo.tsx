import { useEffect, useState } from 'react'

// Background clips live in src/assets/media/. The glob only matches files that
// exist, so dropping hero.webm / hero.mp4 / hero-poster.jpg in there is enough;
// no code change, and no 404s while the folder is empty.
const files = import.meta.glob<string>('../assets/media/*.{webm,mp4,jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function find(name: string, exts: string[]): string | undefined {
  for (const ext of exts) {
    const hit = files[`../assets/media/${name}.${ext}`]
    if (hit) return hit
  }
  return undefined
}

export function hasVideo(name: string): boolean {
  return Boolean(find(name, ['webm', 'mp4']))
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Full-bleed looping background video. Renders nothing when the clip is missing
 * or fails to load, so the parent's CSS background shows through. Under reduced
 * motion it shows the poster (if any) instead of playing.
 */
export default function BackgroundVideo({ name, className = '' }: { name: string; className?: string }) {
  const webm = find(name, ['webm'])
  const mp4 = find(name, ['mp4'])
  const poster = find(`${name}-poster`, ['jpg', 'jpeg', 'png', 'webp'])
  const reduced = usePrefersReducedMotion()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  if (failed || (!webm && !mp4)) return null

  if (reduced) {
    return poster ? (
      <img src={poster} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover ${className}`} />
    ) : null
  }

  return (
    <video
      aria-hidden
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      onLoadedData={() => setReady(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      {webm && <source src={webm} type="video/webm" />}
      {mp4 && <source src={mp4} type="video/mp4" onError={() => setFailed(true)} />}
    </video>
  )
}
