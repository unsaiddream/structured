'use client'

import { useEffect, useRef } from 'react'

const SPACING = 30
const BASE_RADIUS = 1.4
const MAX_RADIUS = 7
const INFLUENCE = 140
const DOT_COLOR_R = 99
const DOT_COLOR_G = 102
const DOT_COLOR_B = 241

export default function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let mouseX = -9999
    let mouseY = -9999
    let targetX = -9999
    let targetY = -9999
    let raf: number

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function draw() {
      if (!canvas || !ctx) return

      // Smooth follow
      mouseX += (targetX - mouseX) * 0.12
      mouseY += (targetY - mouseY) * 0.12

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cols = Math.ceil(canvas.width / SPACING) + 1
      const rows = Math.ceil(canvas.height / SPACING) + 1

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING
          const y = r * SPACING

          const dx = x - mouseX
          const dy = y - mouseY
          const dist = Math.sqrt(dx * dx + dy * dy)

          // Smooth falloff
          const t = Math.max(0, 1 - dist / INFLUENCE)
          const ease = t * t * (3 - 2 * t) // smoothstep

          const radius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * ease
          const opacity = 0.1 + 0.65 * ease

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${DOT_COLOR_R},${DOT_COLOR_G},${DOT_COLOR_B},${opacity})`
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    const onMouseLeave = () => {
      targetX = -9999
      targetY = -9999
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    document.documentElement.addEventListener('mouseleave', onMouseLeave)

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      document.documentElement.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
