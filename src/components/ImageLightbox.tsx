import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { asset } from '../lib/format'

/** Photo en plein ecran : navigation entre les photos, zoom (toucher/cliquer la photo), fermeture par la croix, Echap ou un toucher hors de la photo. */
export function ImageLightbox({ images, index, alt, onIndex, onClose }: {
  images: string[]; index: number; alt: string; onIndex: (i: number) => void; onClose: () => void
}) {
  const [zoomed, setZoomed] = useState(false)
  const many = images.length > 1
  const go = (d: number) => { setZoomed(false); onIndex((index + d + images.length) % images.length) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && many) go(1)
      else if (e.key === 'ArrowLeft' && many) go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const btn = 'flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 active:bg-white/40'

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/95" onClick={e => { e.stopPropagation(); if (!zoomed) onClose() }}>
      <div className="flex items-center justify-between p-3" onClick={e => e.stopPropagation()}>
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">{many ? `${index + 1} / ${images.length}` : alt}</span>
        <div className="flex gap-2">
          <button onClick={() => setZoomed(z => !z)} className={btn} aria-label="Zoom">{zoomed ? <ZoomOut size={22} /> : <ZoomIn size={22} />}</button>
          <button onClick={onClose} className={btn} aria-label="Fermer"><X size={24} /></button>
        </div>
      </div>

      <div className={`relative flex min-h-0 flex-1 ${zoomed ? 'overflow-auto' : 'items-center justify-center'}`}>
        <img
          src={asset(images[index])} alt={alt}
          onClick={e => { e.stopPropagation(); setZoomed(z => !z) }}
          className={zoomed ? 'm-auto max-w-none cursor-zoom-out' : 'h-full w-full cursor-zoom-in object-contain p-2'}
          style={zoomed ? { width: '220%' } : undefined}
        />
        {many && !zoomed && (
          <>
            <button onClick={e => { e.stopPropagation(); go(-1) }} className={`${btn} absolute left-3 top-1/2 -translate-y-1/2`} aria-label="Precedente"><ChevronLeft size={26} /></button>
            <button onClick={e => { e.stopPropagation(); go(1) }} className={`${btn} absolute right-3 top-1/2 -translate-y-1/2`} aria-label="Suivante"><ChevronRight size={26} /></button>
          </>
        )}
      </div>

      {many && !zoomed && (
        <div className="flex justify-center gap-2 overflow-x-auto p-3" onClick={e => e.stopPropagation()}>
          {images.map((src, i) => (
            <button key={src} onClick={() => go(i - index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? 'border-teal' : 'border-white/20 opacity-70'}`}>
              <img src={asset(src)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
