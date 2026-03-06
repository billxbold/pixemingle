'use client'

import type { PhotoPosition } from '@/hooks/usePhotoOverlay'

interface PhotoOverlayProps {
  photos: PhotoPosition[]
  onPhotoClick: (index: number) => void
}

export function PhotoOverlay({ photos, onPhotoClick }: PhotoOverlayProps) {
  if (photos.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {photos.map(photo => (
        <div
          key={photo.candidateIndex}
          className="absolute pointer-events-auto cursor-pointer group"
          style={{
            left: photo.screenX - photo.size / 2,
            top: photo.screenY - photo.size / 2,
            width: photo.size,
            height: photo.size,
          }}
          onClick={() => onPhotoClick(photo.candidateIndex)}
        >
          {/* Pixel art frame */}
          <div
            className="w-full h-full border-2 border-gray-600 bg-gray-800 overflow-hidden group-hover:border-pink-400 transition-colors"
            style={{
              imageRendering: 'pixelated',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
            }}
          >
            {photo.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={photo.candidate.user.name}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <span className="text-xs">?</span>
              </div>
            )}
          </div>
          {/* Name label */}
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 px-1 rounded text-center whitespace-nowrap"
            style={{ fontSize: Math.max(8, photo.size * 0.15) }}
          >
            <span className="text-white font-mono">
              {photo.candidate.user.name}
            </span>
            <span className="text-pink-400 ml-1">
              {photo.candidate.score}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
