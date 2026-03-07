'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { WorldState } from '@/engine/engine/officeState'
import type { SceneManager } from '@/engine/sceneManager'
import type { SelectionRenderState } from '@/engine/engine/renderer'
import type { VenueImages } from '@/engine/assetLoader'
import { startGameLoop } from '@/engine/engine/gameLoop'
import { renderFrame } from '@/engine/engine/renderer'
import { TILE_SIZE } from '@/engine/types'
import type { ParticleSystem } from '@/engine/particles'
import { renderParticles } from '@/engine/particles'
import type { PropSystem } from '@/engine/propRenderer'
import {
  CAMERA_FOLLOW_LERP,
  CAMERA_FOLLOW_SNAP_THRESHOLD,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_SCROLL_THRESHOLD,
  PAN_MARGIN_FRACTION,
} from '@/engine/constants'

interface CanvasProps {
  worldStateRef: React.MutableRefObject<WorldState | null>
  sceneManagerRef: React.MutableRefObject<SceneManager | null>
  panRef: React.MutableRefObject<{ x: number; y: number }>
  venueImagesRef?: React.MutableRefObject<VenueImages | null>
  particlesRef?: React.MutableRefObject<ParticleSystem>
  propsRef?: React.MutableRefObject<PropSystem>
  onFrameUpdate?: (dt: number) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  onAgentClick?: (agentId: number) => void
  onTileClick?: (col: number, row: number) => void
}

export function Canvas({
  worldStateRef,
  sceneManagerRef,
  panRef,
  venueImagesRef,
  particlesRef,
  propsRef,
  onFrameUpdate,
  zoom,
  onZoomChange,
  onAgentClick,
  onTileClick,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })
  const leftPanStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null)
  const leftDraggedRef = useRef(false)
  const zoomAccumulatorRef = useRef(0)
  // Touch state refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchPanRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartZoomRef = useRef<number>(zoom)

  const clampPan = useCallback((px: number, py: number): { x: number; y: number } => {
    const canvas = canvasRef.current
    const worldState = worldStateRef.current
    if (!canvas || !worldState) return { x: px, y: py }
    const layout = worldState.getLayout()
    const mapW = layout.cols * TILE_SIZE * zoom
    const mapH = layout.rows * TILE_SIZE * zoom
    const marginX = canvas.width * PAN_MARGIN_FRACTION
    const marginY = canvas.height * PAN_MARGIN_FRACTION
    const maxPanX = (mapW / 2) + canvas.width / 2 - marginX
    const maxPanY = (mapH / 2) + canvas.height / 2 - marginY
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    }
  }, [worldStateRef, zoom])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    resizeCanvas()

    const observer = new ResizeObserver(() => resizeCanvas())
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        const worldState = worldStateRef.current
        const sceneManager = sceneManagerRef.current
        if (!worldState) return
        worldState.update(dt)
        sceneManager?.update(dt)
        onFrameUpdate?.(dt)
      },
      render: (ctx) => {
        const worldState = worldStateRef.current
        const sceneManager = sceneManagerRef.current
        if (!worldState) return

        const w = canvas.width
        const h = canvas.height

        // Camera follow
        if (worldState.cameraFollowId !== null) {
          const followCh = worldState.characters.get(worldState.cameraFollowId)
          if (followCh) {
            const layout = worldState.getLayout()
            const mapW = layout.cols * TILE_SIZE * zoom
            const mapH = layout.rows * TILE_SIZE * zoom
            const targetX = mapW / 2 - followCh.x * zoom
            const targetY = mapH / 2 - followCh.y * zoom
            const dx = targetX - panRef.current.x
            const dy = targetY - panRef.current.y
            if (Math.abs(dx) < CAMERA_FOLLOW_SNAP_THRESHOLD && Math.abs(dy) < CAMERA_FOLLOW_SNAP_THRESHOLD) {
              panRef.current = { x: targetX, y: targetY }
            } else {
              panRef.current = {
                x: panRef.current.x + dx * CAMERA_FOLLOW_LERP,
                y: panRef.current.y + dy * CAMERA_FOLLOW_LERP,
              }
            }
          }
        }

        const selectionRender: SelectionRenderState = {
          selectedAgentId: worldState.selectedAgentId,
          hoveredAgentId: worldState.hoveredAgentId,
          hoveredTile: worldState.hoveredTile,
          seats: worldState.seats,
          characters: worldState.characters,
        }

        const { offsetX, offsetY } = renderFrame(
          ctx, w, h,
          worldState.tileMap,
          worldState.furniture,
          worldState.getCharacters(),
          zoom,
          panRef.current.x,
          panRef.current.y,
          selectionRender,
          undefined,
          worldState.getLayout().tileColors,
          worldState.getLayout().cols,
          worldState.getLayout().rows,
          venueImagesRef?.current,
        )
        offsetRef.current = { x: offsetX, y: offsetY }

        // Particles
        if (particlesRef?.current && particlesRef.current.particles.length > 0) {
          renderParticles(ctx, particlesRef.current.particles, offsetX, offsetY, zoom)
        }

        // Props
        if (propsRef?.current && propsRef.current.props.length > 0) {
          propsRef.current.render(ctx, offsetX, offsetY, zoom)
        }

        // Scene fade overlay
        if (sceneManager && sceneManager.fadeAlpha < 1) {
          ctx.save()
          ctx.globalAlpha = 1 - sceneManager.fadeAlpha
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, w, h)
          ctx.restore()
        }
      },
    })

    return () => {
      stop()
      observer.disconnect()
    }
  }, [worldStateRef, sceneManagerRef, resizeCanvas, zoom, panRef])

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const cssX = clientX - rect.left
      const cssY = clientY - rect.top
      const deviceX = cssX * dpr
      const deviceY = cssY * dpr
      const worldX = (deviceX - offsetRef.current.x) / zoom
      const worldY = (deviceY - offsetRef.current.y) / zoom
      return { worldX, worldY }
    },
    [zoom],
  )

  const screenToTile = useCallback(
    (clientX: number, clientY: number): { col: number; row: number } | null => {
      const worldState = worldStateRef.current
      const pos = screenToWorld(clientX, clientY)
      if (!pos || !worldState) return null
      const col = Math.floor(pos.worldX / TILE_SIZE)
      const row = Math.floor(pos.worldY / TILE_SIZE)
      const layout = worldState.getLayout()
      if (col < 0 || col >= layout.cols || row < 0 || row >= layout.rows) return null
      return { col, row }
    },
    [screenToWorld, worldStateRef],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const worldState = worldStateRef.current
      if (!worldState) return

      if (isPanningRef.current) {
        const dpr = window.devicePixelRatio || 1
        const dx = (e.clientX - panStartRef.current.mouseX) * dpr
        const dy = (e.clientY - panStartRef.current.mouseY) * dpr
        panRef.current = clampPan(
          panStartRef.current.panX + dx,
          panStartRef.current.panY + dy,
        )
        return
      }

      // Left-click drag pan
      if (leftPanStartRef.current) {
        const dx = Math.abs(e.clientX - leftPanStartRef.current.mouseX)
        const dy = Math.abs(e.clientY - leftPanStartRef.current.mouseY)
        if (!leftDraggedRef.current && (dx > 5 || dy > 5)) {
          leftDraggedRef.current = true
          worldState.cameraFollowId = null
          const canvas = canvasRef.current
          if (canvas) canvas.style.cursor = 'grabbing'
        }
        if (leftDraggedRef.current) {
          const dpr = window.devicePixelRatio || 1
          const ddx = (e.clientX - leftPanStartRef.current.mouseX) * dpr
          const ddy = (e.clientY - leftPanStartRef.current.mouseY) * dpr
          panRef.current = clampPan(
            leftPanStartRef.current.panX + ddx,
            leftPanStartRef.current.panY + ddy,
          )
          return
        }
      }

      const pos = screenToWorld(e.clientX, e.clientY)
      if (!pos) return
      const hitId = worldState.getCharacterAt(pos.worldX, pos.worldY)
      const tile = screenToTile(e.clientX, e.clientY)
      worldState.hoveredTile = tile
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.cursor = hitId !== null ? 'pointer' : 'default'
      }
      worldState.hoveredAgentId = hitId
    },
    [worldStateRef, screenToWorld, screenToTile, panRef, clampPan],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const worldState = worldStateRef.current
      if (!worldState) return

      if (e.button === 0) {
        leftPanStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        }
        leftDraggedRef.current = false
      }

      if (e.button === 1) {
        e.preventDefault()
        worldState.cameraFollowId = null
        isPanningRef.current = true
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        }
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'grabbing'
      }
    },
    [worldStateRef, panRef],
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        leftPanStartRef.current = null
        if (leftDraggedRef.current) {
          const canvas = canvasRef.current
          if (canvas) canvas.style.cursor = 'default'
          // leftDraggedRef stays true so handleClick can suppress it
        }
      }
      if (e.button === 1) {
        isPanningRef.current = false
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'default'
      }
    },
    [],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Suppress click if it was actually a drag
      if (leftDraggedRef.current) {
        leftDraggedRef.current = false
        return
      }

      const worldState = worldStateRef.current
      if (!worldState) return

      const pos = screenToWorld(e.clientX, e.clientY)
      if (!pos) return

      const hitId = worldState.getCharacterAt(pos.worldX, pos.worldY)
      if (hitId !== null) {
        worldState.dismissBubble(hitId)
        if (worldState.selectedAgentId === hitId) {
          worldState.selectedAgentId = null
          worldState.cameraFollowId = null
        } else {
          worldState.selectedAgentId = hitId
          worldState.cameraFollowId = hitId
        }
        onAgentClick?.(hitId)
        return
      }

      const tile = screenToTile(e.clientX, e.clientY)
      if (tile) {
        onTileClick?.(tile.col, tile.row)
      }

      if (worldState.selectedAgentId !== null) {
        worldState.selectedAgentId = null
        worldState.cameraFollowId = null
      }
    },
    [worldStateRef, onAgentClick, onTileClick, screenToWorld, screenToTile],
  )

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const worldState = worldStateRef.current
    if (!worldState) return
    if (worldState.selectedAgentId !== null) {
      const tile = screenToTile(e.clientX, e.clientY)
      if (tile) {
        worldState.walkToTile(worldState.selectedAgentId, tile.col, tile.row)
      }
    }
  }, [worldStateRef, screenToTile])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const worldState = worldStateRef.current
      if (!worldState) return

      if (e.ctrlKey || e.metaKey) {
        zoomAccumulatorRef.current += e.deltaY
        if (Math.abs(zoomAccumulatorRef.current) >= ZOOM_SCROLL_THRESHOLD) {
          const delta = zoomAccumulatorRef.current < 0 ? 1 : -1
          zoomAccumulatorRef.current = 0
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta))
          if (newZoom !== zoom) {
            onZoomChange(newZoom)
          }
        }
      } else {
        const dpr = window.devicePixelRatio || 1
        worldState.cameraFollowId = null
        panRef.current = clampPan(
          panRef.current.x - e.deltaX * dpr,
          panRef.current.y - e.deltaY * dpr,
        )
      }
    },
    [zoom, onZoomChange, worldStateRef, panRef, clampPan],
  )

  const handleMouseLeave = useCallback(() => {
    const worldState = worldStateRef.current
    if (!worldState) return
    isPanningRef.current = false
    worldState.hoveredAgentId = null
    worldState.hoveredTile = null
  }, [worldStateRef])

  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) e.preventDefault()
  }, [])

  // --- Touch event handlers (attached via useEffect with { passive: false }) ---

  const getTouchDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1) {
        const t = e.touches[0]
        touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
        touchPanRef.current = {
          startX: t.clientX,
          startY: t.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        }
        pinchStartDistRef.current = null
      } else if (e.touches.length === 2) {
        // Start pinch-to-zoom
        touchPanRef.current = null
        const dist = getTouchDistance(e.touches[0], e.touches[1])
        pinchStartDistRef.current = dist
        pinchStartZoomRef.current = zoom
      }
    },
    [panRef, zoom],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault()
      const worldState = worldStateRef.current
      if (!worldState) return

      if (e.touches.length === 1 && touchPanRef.current && !pinchStartDistRef.current) {
        // Single-finger pan
        const t = e.touches[0]
        const dpr = window.devicePixelRatio || 1
        const dx = (t.clientX - touchPanRef.current.startX) * dpr
        const dy = (t.clientY - touchPanRef.current.startY) * dpr
        worldState.cameraFollowId = null
        panRef.current = clampPan(
          touchPanRef.current.panX + dx,
          touchPanRef.current.panY + dy,
        )
      } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        // Pinch-to-zoom
        const dist = getTouchDistance(e.touches[0], e.touches[1])
        const scale = dist / pinchStartDistRef.current
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(pinchStartZoomRef.current * scale)))
        if (newZoom !== zoom) {
          onZoomChange(newZoom)
        }
      }
    },
    [worldStateRef, panRef, clampPan, zoom, onZoomChange],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault()
      // If it was a quick tap (no significant movement), treat as click
      if (e.changedTouches.length === 1 && touchStartRef.current && !pinchStartDistRef.current) {
        const t = e.changedTouches[0]
        const dx = Math.abs(t.clientX - touchStartRef.current.x)
        const dy = Math.abs(t.clientY - touchStartRef.current.y)
        const dt = Date.now() - touchStartRef.current.time
        if (dx < 10 && dy < 10 && dt < 300) {
          // Simulate a tap/click
          const worldState = worldStateRef.current
          if (worldState) {
            const pos = screenToWorld(t.clientX, t.clientY)
            if (pos) {
              const hitId = worldState.getCharacterAt(pos.worldX, pos.worldY)
              if (hitId !== null) {
                worldState.dismissBubble(hitId)
                if (worldState.selectedAgentId === hitId) {
                  worldState.selectedAgentId = null
                  worldState.cameraFollowId = null
                } else {
                  worldState.selectedAgentId = hitId
                  worldState.cameraFollowId = hitId
                }
                onAgentClick?.(hitId)
              } else {
                const tile = screenToTile(t.clientX, t.clientY)
                if (tile) onTileClick?.(tile.col, tile.row)
                if (worldState.selectedAgentId !== null) {
                  worldState.selectedAgentId = null
                  worldState.cameraFollowId = null
                }
              }
            }
          }
        }
      }
      touchStartRef.current = null
      touchPanRef.current = null
      if (e.touches.length < 2) {
        pinchStartDistRef.current = null
      }
    },
    [worldStateRef, screenToWorld, screenToTile, onAgentClick, onTileClick],
  )

  // Attach touch + wheel events with { passive: false } so preventDefault() works
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#1E1E2E',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        style={{ display: 'block', touchAction: 'none' }}
      />
    </div>
  )
}
