import { useEffect, useRef, useState } from 'react'

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

export function media(name: string) {
  return {
    webm: find(name, ['webm']),
    mp4: find(name, ['mp4']),
    poster: find(`${name}-poster`, ['jpg', 'jpeg', 'png', 'webp']),
  }
}

export function hasVideo(name: string): boolean {
  const { webm, mp4 } = media(name)
  return Boolean(webm || mp4)
}

export function usePrefersReducedMotion() {
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
 *
 * `playing` pauses the clip without unmounting it (the journey stage keeps
 * every scene mounted and plays only the one on screen); `load` defers fetching
 * the footage until the caller says it is needed.
 */
export default function BackgroundVideo({
  name,
  className = '',
  playing = true,
  load = true,
}: {
  name: string
  className?: string
  playing?: boolean
  load?: boolean
}) {
  const { webm, mp4, poster } = media(name)
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video || !load) return
    if (playing) video.play().catch(() => {})
    else video.pause()
  }, [playing, load, ready])

  if (failed || (!webm && !mp4)) return null

  if (reduced) {
    return poster ? (
      <img src={poster} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover ${className}`} />
    ) : null
  }

  return (
    <video
      ref={ref}
      aria-hidden
      autoPlay={playing}
      muted
      loop
      playsInline
      preload={load ? 'auto' : 'none'}
      poster={poster}
      onLoadedData={() => setReady(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${ready || poster ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      {load && webm && <source src={webm} type="video/webm" />}
      {load && mp4 && <source src={mp4} type="video/mp4" onError={() => setFailed(true)} />}
    </video>
  )
}
