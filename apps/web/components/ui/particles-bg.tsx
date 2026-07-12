'use client'

import { cn } from '@/lib/utils'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = Omit<React.ComponentProps<'div'>, 'ref'>

export default function ParticlesBg({ className, ...props }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const SEPARATION = 150
    const AMOUNTX    = 40
    const AMOUNTY    = 60

    /* scene */
    const scene = new THREE.Scene()
    // Navy fog so distant dots fade into the background naturally
    scene.fog = new THREE.Fog(0x0d1b2e, 2000, 10000)

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000)
    camera.position.set(0, 355, 1220)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x0d1b2e, 0) // transparent clear — navy bg comes from DOM

    containerRef.current.appendChild(renderer.domElement)

    /* geometry */
    const positions: number[] = []
    const colors:    number[] = []

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2,
        )
        // Soft white dots — a subtle green tint on every 5th particle
        if ((ix + iy) % 5 === 0) {
          colors.push(120, 220, 140) // green-tinted
        } else {
          colors.push(180, 195, 210) // cool white
        }
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size:         7,
      vertexColors: true,
      transparent:  true,
      opacity:      0.65,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    /* animation */
    let count = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      const posAttr = geometry.attributes.position
      const pos     = posAttr.array as Float32Array
      let i = 0
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          pos[i * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50
          i++
        }
      }
      posAttr.needsUpdate = true

      renderer.render(scene, camera)
      count += 0.1
    }

    animate()

    /* resize */
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    /* cleanup */
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animId)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none fixed inset-0', className)}
      style={{ zIndex: 0 }}
      {...props}
    />
  )
}
