import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { findStamp } from './stampsData';

export const STAMP_COLORS = [
  { id: 'crimson', label: 'Lacre Rojo', bg: '#fbf0ee', border: '#8b1e1e', ink: '#7a1616' },
  { id: 'forest', label: 'Verde Pino', bg: '#eef6ee', border: '#275937', ink: '#1e462b' },
  { id: 'navy', label: 'Azul Postal', bg: '#edf4fb', border: '#203b63', ink: '#192e4d' },
  { id: 'sepia', label: 'Sepia Dorado', bg: '#faf2e6', border: '#755329', ink: '#5c3f1c' },
  { id: 'ink', label: 'Tinta Negra', bg: '#f2f2f2', border: '#262626', ink: '#1a1a1a' }
];

export const STAMP_MOTIFS = [
  { id: 'heart', symbol: '♥', label: 'Corazón' },
  { id: 'star', symbol: '✦', label: 'Estrella' },
  { id: 'plane', symbol: '✈', label: 'Correo Aéreo' },
  { id: 'rose', symbol: '✿', label: 'Flor' },
  { id: 'moon', symbol: '☾', label: 'Luna' },
  { id: 'anchor', symbol: '⚓', label: 'Ancla' }
];

const VERT_SIZE = {
  sm: 'max-w-[68px] max-h-[76px]',
  md: 'max-w-[84px] max-h-[96px]',
  lg: 'max-w-[128px] max-h-[148px]'
};

const HORIZ_SIZE = {
  sm: 'max-w-[108px] max-h-[66px]',
  md: 'max-w-[140px] max-h-[86px]',
  lg: 'max-w-[200px] max-h-[124px]'
};

export function StampBadge({ stamp, size = 'md', className = '', onZoom }) {
  if (!stamp) return null;

  if (stamp.type === 'preset' || !stamp.type) {
    const preset = findStamp(stamp.id);
    const sizeCls = preset.horizontal
      ? (HORIZ_SIZE[size] || HORIZ_SIZE.md)
      : (VERT_SIZE[size] || VERT_SIZE.md);

    return (
      <div
        className={`relative inline-flex items-center justify-center select-none shrink-0 group ${className}`}
        title={preset.name}
      >
        <img
          src={preset.src}
          alt={preset.name}
          className={`${sizeCls} w-auto h-auto object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.45)]`}
          loading="lazy"
        />
        {onZoom && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(stamp);
            }}
            className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#241812]/90 hover:bg-[#8e1616] text-[#f3e5c8] border border-[#c8a97e]/70 flex items-center justify-center shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
            title="Hacer zoom en la estampilla"
          >
            <ZoomIn size={12} />
          </button>
        )}
      </div>
    );
  }

  // Estampilla personalizada
  const palette = STAMP_COLORS.find(c => c.id === stamp.colorId) || STAMP_COLORS[0];
  const motif = STAMP_MOTIFS.find(m => m.id === stamp.motifId) || STAMP_MOTIFS[0];
  const dims = size === 'sm' ? 'w-14 h-18' : size === 'lg' ? 'w-26 h-34' : 'w-20 h-26';

  return (
    <div
      className={`${dims} relative p-1.5 shadow-md border-2 border-dashed flex flex-col justify-between items-center text-center select-none group ${className}`}
      style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.ink }}
    >
      <div className="w-full border border-current p-1 h-full flex flex-col justify-between items-center">
        <span className="text-[8px] font-bold tracking-widest uppercase leading-none truncate w-full">
          {stamp.topText || 'CORREO'}
        </span>
        <span className={size === 'sm' ? 'text-lg' : 'text-2xl'}>{motif.symbol}</span>
        <div className="w-full flex items-center justify-between text-[8px] font-bold border-t border-current pt-0.5 px-0.5">
          <span className="truncate max-w-[44px] uppercase">{stamp.bottomText || 'POSTAL'}</span>
          <span className="font-extrabold">{stamp.value || '5¢'}</span>
        </div>
      </div>
      {onZoom && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(stamp);
          }}
          className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#241812]/90 hover:bg-[#8e1616] text-[#f3e5c8] border border-[#c8a97e]/70 flex items-center justify-center shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
          title="Hacer zoom en la estampilla"
        >
          <ZoomIn size={12} />
        </button>
      )}
    </div>
  );
}

export function StampZoomModal({ stamp, onClose }) {
  const [zoom, setZoom] = useState(1.6);

  if (!stamp) return null;
  const isPreset = stamp.type === 'preset' || !stamp.type;
  const preset = isPreset ? findStamp(stamp.id) : null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1f140e] border-2 border-[#8c6b48] rounded-md shadow-2xl overflow-hidden text-[#f3e5c8] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-[#160e0a] border-b border-[#5c4028]/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif-vintage text-base md:text-lg font-bold truncate">
              {isPreset ? preset.name : `${stamp.topText || 'CORREO'} — ${stamp.bottomText || 'POSTAL'}`}
            </h3>
            {isPreset && preset.year && (
              <span className="font-typewriter text-xs text-[#cbb692]">
                Año {preset.year} • {preset.horizontal ? 'Formato horizontal' : 'Formato vertical'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm hover:bg-[#382417] text-[#cbb692] hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="relative h-[360px] md:h-[420px] overflow-auto flex items-center justify-center p-8"
          style={{
            background: 'radial-gradient(circle at center, #38261b 0%, #170f0a 100%)'
          }}
        >
          {isPreset ? (
            <img
              src={preset.src}
              alt={preset.name}
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s ease-out',
                transformOrigin: 'center center'
              }}
              className="max-w-[260px] max-h-[240px] w-auto h-auto object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.65)] select-none"
            />
          ) : (
            <div style={{ transform: `scale(${zoom * 1.4})`, transition: 'transform 0.2s ease-out' }}>
              <StampBadge stamp={stamp} size="lg" />
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-[#160e0a] border-t border-[#5c4028]/60 flex flex-wrap items-center justify-between gap-3 font-typewriter text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.35).toFixed(2)))}
              className="px-2.5 py-1.5 bg-[#2e1d14] hover:bg-[#422a1d] border border-[#6e5034] rounded-sm flex items-center gap-1"
            >
              <ZoomOut size={14} /> Alejar
            </button>
            <input
              type="range"
              min="1"
              max="3.2"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-28 md:w-40 accent-[#d97706]"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.2, +(z + 0.35).toFixed(2)))}
              className="px-2.5 py-1.5 bg-[#2e1d14] hover:bg-[#422a1d] border border-[#6e5034] rounded-sm flex items-center gap-1"
            >
              <ZoomIn size={14} /> Acercar
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.6)}
              className="p-1.5 bg-[#2e1d14] hover:bg-[#422a1d] border border-[#6e5034] rounded-sm"
              title="Restablecer zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <span className="text-[#f5d08a] font-bold">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
