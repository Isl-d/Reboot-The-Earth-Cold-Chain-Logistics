import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Illustrative fleet network: cold stores (teal) linked to the trucks nearest
// them (cyan), one truck in an incident (red pulse). Layout is seeded so it is
// stable between reloads. Decorative only; not live data.

const COLORS = {
  truck: new THREE.Color('#00c8e0'),
  store: new THREE.Color('#22d4b0'),
  incident: new THREE.Color('#f87171'),
  link: new THREE.Color('#2d4160'),
  grid: new THREE.Color('#1e3048'),
}

const TRUCK_COUNT = 36
const RADIUS = 5.2

function seededRandom(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function dotTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.9)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

export default function NetworkScene({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // No WebGL: the container's CSS background stays.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.display = 'block'
    host.appendChild(renderer.domElement)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    const cameraBase = new THREE.Vector3(0, 6.5, 10.5)
    camera.position.copy(cameraBase)
    camera.lookAt(0, 0, 0)

    const group = new THREE.Group()
    scene.add(group)
    const disposables: { dispose(): void }[] = []

    // Radar-style ground.
    const grid = new THREE.PolarGridHelper(RADIUS + 0.8, 12, 5, 72, COLORS.grid, COLORS.grid)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.55
    group.add(grid)
    disposables.push(grid.geometry, grid.material as THREE.Material)

    // Layout.
    const rand = seededRandom(20260925)
    const stores = [
      new THREE.Vector3(-1.6, 0.05, -0.8),
      new THREE.Vector3(2.1, 0.05, 0.9),
      new THREE.Vector3(0.3, 0.05, 2.6),
      new THREE.Vector3(-2.8, 0.05, 2.0),
    ]
    const trucks = Array.from({ length: TRUCK_COUNT }, () => {
      const a = rand() * Math.PI * 2
      const r = 0.8 + Math.sqrt(rand()) * (RADIUS - 0.8)
      return new THREE.Vector3(Math.cos(a) * r, 0.05 + rand() * 0.25, Math.sin(a) * r)
    })
    const incidentIndex = 5

    // Nodes.
    const all = [...stores, ...trucks]
    const positions = new Float32Array(all.length * 3)
    const colors = new Float32Array(all.length * 3)
    all.forEach((p, i) => {
      positions.set([p.x, p.y, p.z], i * 3)
      const c = i < stores.length ? COLORS.store : i - stores.length === incidentIndex ? COLORS.incident : COLORS.truck
      colors.set([c.r, c.g, c.b], i * 3)
    })
    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    nodeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const sprite = dotTexture()
    const nodeMat = new THREE.PointsMaterial({
      size: 0.32,
      map: sprite,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const nodes = new THREE.Points(nodeGeo, nodeMat)
    group.add(nodes)
    disposables.push(nodeGeo, nodeMat, sprite)

    // Links: each truck to its nearest store, stores to each other.
    const linkPts: number[] = []
    trucks.forEach((t) => {
      const nearest = stores.reduce((best, s) => (s.distanceTo(t) < best.distanceTo(t) ? s : best))
      linkPts.push(t.x, t.y, t.z, nearest.x, nearest.y, nearest.z)
    })
    stores.forEach((a, i) => stores.slice(i + 1).forEach((b) => linkPts.push(a.x, a.y, a.z, b.x, b.y, b.z)))
    const linkGeo = new THREE.BufferGeometry()
    linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPts, 3))
    const linkMat = new THREE.LineBasicMaterial({ color: COLORS.truck, transparent: true, opacity: 0.16 })
    group.add(new THREE.LineSegments(linkGeo, linkMat))
    disposables.push(linkGeo, linkMat)

    // Incident pulse ring.
    const ringGeo = new THREE.RingGeometry(0.18, 0.24, 48)
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.incident,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.copy(trucks[incidentIndex])
    group.add(ring)
    disposables.push(ringGeo, ringMat)

    // Hover highlight.
    const hoverGeo = new THREE.RingGeometry(0.16, 0.2, 40)
    const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })
    const hover = new THREE.Mesh(hoverGeo, hoverMat)
    hover.visible = false
    group.add(hover)
    disposables.push(hoverGeo, hoverMat)

    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 0.22 }
    const pointer = new THREE.Vector2(9, 9)
    const parallax = new THREE.Vector2()

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      parallax.copy(pointer)
      if (reduced) render(0)
    }
    const onPointerLeave = () => {
      pointer.set(9, 9)
      parallax.set(0, 0)
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)

    const clock = new THREE.Clock()
    function render(elapsed: number) {
      if (!reduced) {
        group.rotation.y = elapsed * 0.06
        const pulse = (elapsed % 1.8) / 1.8
        ring.scale.setScalar(1 + pulse * 2.4)
        ringMat.opacity = 0.9 * (1 - pulse)
        camera.position.x += (cameraBase.x + parallax.x * 0.8 - camera.position.x) * 0.05
        camera.position.y += (cameraBase.y + parallax.y * 0.5 - camera.position.y) * 0.05
        camera.lookAt(0, 0, 0)
      }

      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(nodes)[0]
      if (hit?.index !== undefined) {
        hover.visible = true
        hover.position.fromArray(positions, hit.index * 3)
        hover.quaternion.copy(camera.quaternion)
      } else {
        hover.visible = false
      }

      renderer.render(scene, camera)
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (!w || !h) return
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      render(clock.getElapsedTime())
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (reduced) return
      renderer.setAnimationLoop(entry.isIntersecting ? () => render(clock.getElapsedTime()) : null)
    })
    io.observe(host)

    return () => {
      io.disconnect()
      ro.disconnect()
      renderer.setAnimationLoop(null)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} className={`h-full w-full ${className}`} />
}
