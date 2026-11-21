import React, { useState, useMemo } from 'react';
import { Search, X, Check, Sparkles, Stamp as StampIcon, Filter } from 'lucide-react';
import { PRESET_STAMPS, STAMP_CATEGORIES, TOTAL_ARGENTINE_STAMPS, findStamp } from './stampsData';
import { StampBadge, StampZoomModal, STAMP_COLORS, STAMP_MOTIFS } from './StampVisual';

export default function StampPickerModal({ isOpen, onClose, currentStamp, onSelectStamp, userCity = 'Buenos Aires' }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'custom'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomStamp, setZoomStamp] = useState(null);

  // Custom stamp form state
  const [customTop, setCustomTop] = useState('CORREO');
  const [customBottom, setCustomBottom] = useState(userCity);
  const [customValue, setCustomValue] = useState('5¢');
  const [customColorId, setCustomColorId] = useState('crimson');
  const [customMotifId, setCustomMotifId] = useState('heart');

  const filteredStamps = useMemo(() => {
    const cat = STAMP_CATEGORIES.find(c => c.id === selectedCategory) || STAMP_CATEGORIES[0];
    const q = searchQuery.trim().toLowerCase();
    return PRESET_STAMPS.filter(s => cat.test(s.year) && (!q || s.name.toLowerCase().includes(q) || String(s.year).includes(q)));
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleApplyCustom = () => {
    onSelectStamp({
      type: 'custom',
      topText: customTop.trim() || 'CORREO',
      bottomText: customBottom.trim() || userCity,
      value: customValue.trim() || '5¢',
      colorId: customColorId,
      motifId: customMotifId
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-[#231711] border-2 border-[#8c6b48] rounded-md shadow-2xl flex flex-col text-[#f3e5c8] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera del Estudio Filatélico */}
        <div className="p-4 md:p-5 border-b border-[#5c4028]/60 bg-[#1c120c] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#8e1616] border border-[#d45d5d] flex items-center justify-center text-[#f7e7c4] shadow-md">
              <StampIcon size={20} />
            </div>
            <div>
              <h2 className="font-serif-vintage text-xl font-bold leading-tight">
                Catálogo Filatélico de la República Argentina
              </h2>
              <p className="font-typewriter text-xs text-[#cbb692]">
                {TOTAL_ARGENTINE_STAMPS} sellos reales del catálogo de filateliaargentina.com.ar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm hover:bg-[#382417] text-[#cbb692] hover:text-white transition"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas: Catálogo Oficial (100) vs Diseñador Manual */}
        <div className="px-4 md:px-5 pt-3 bg-[#1e130e] border-b border-[#5c4028]/40 flex flex-wrap items-center justify-between gap-2 font-typewriter text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-t-sm transition font-bold flex items-center gap-2 ${activeTab === 'catalog'
                  ? 'bg-[#2e1d14] text-[#f5d08a] border-t-2 border-[#d97706]'
                  : 'text-[#cbb692] hover:text-white'
                }`}
            >
              <StampIcon size={14} /> Sellos Reales (100)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 rounded-t-sm transition font-bold flex items-center gap-2 ${activeTab === 'custom'
                  ? 'bg-[#2e1d14] text-[#f5d08a] border-t-2 border-[#d97706]'
                  : 'text-[#cbb692] hover:text-white'
                }`}
            >
              <Sparkles size={14} /> Diseñar Estampilla a Mano
            </button>
          </div>

          <div className="text-[11px] text-[#cbb692] hidden sm:block pb-1">
            {activeTab === 'catalog' && (
              <span className="bg-[#382417] px-2.5 py-1 rounded text-[#f5d08a] border border-[#6e5034]">
                {filteredStamps.length} estampillas disponibles
              </span>
            )}
          </div>
        </div>

        {/* Contenido según pestaña */}
        {activeTab === 'catalog' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-5">
            {/* Barra de Filtros y Búsqueda */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cbb692]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, año, personaje o lugar (ej. 1978, Malvinas, fauna)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-[#180f0b] border border-[#6e5034] rounded-sm text-sm font-typewriter text-[#f3e5c8] placeholder-[#8c6e54] focus:outline-none focus:border-[#d97706]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#cbb692] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Botones de Categorías */}
              <div className="flex flex-wrap gap-1.5 font-typewriter text-[11px]">
                {STAMP_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-sm transition ${selectedCategory === cat.id
                        ? 'bg-[#8e1616] text-[#fdf6e7] font-bold shadow'
                        : 'bg-[#1e130e] hover:bg-[#2d1c15] text-[#cbb692] border border-[#5c4028]/50'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuadrícula de estampillas con scroll suave */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {filteredStamps.map(item => {
                  const isSelected = currentStamp?.type === 'preset' && currentStamp?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectStamp({ type: 'preset', id: item.id });
                        onClose();
                      }}
                      className={`cursor-pointer rounded-sm p-3 flex flex-col items-center justify-between gap-2 transition-all relative border ${isSelected
                          ? 'bg-[#3d2719] border-[#f5d08a] shadow-lg ring-2 ring-[#d97706]/40'
                          : 'bg-[#1c120c] border-[#5c4028]/60 hover:bg-[#2e1d14] hover:border-[#8c6b48]'
                        }`}
                    >
                      {/* Indicador de seleccionado */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#d97706] text-black flex items-center justify-center shadow">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      {/* Miniatura de la estampilla */}
                      <div className="py-1 flex items-center justify-center min-h-[82px]">
                        <StampBadge stamp={{ type: 'preset', id: item.id }} size="sm" onZoom={setZoomStamp} />
                      </div>

                      {/* Información filatélica */}
                      <div className="w-full text-center font-typewriter mt-1">
                        <span className="text-[10px] text-[#f5d08a] font-bold block truncate" title={item.name}>
                          {item.name}
                        </span>
                        <div className="flex items-center justify-between text-[9px] text-[#cbb692] border-t border-[#5c4028]/40 pt-1 mt-1">
                          <span>{item.year}</span>
                          <span className="font-bold text-white/90">ARG</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredStamps.length === 0 && (
                <div className="py-12 text-center font-typewriter text-sm text-[#cbb692]">
                  No se encontraron estampillas con el término "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Diseñador manual de estampilla */
          <div className="p-6 overflow-y-auto max-w-xl mx-auto w-full font-typewriter space-y-5">
            <div className="flex flex-col items-center justify-center p-4 bg-[#180f0b] border border-[#6e5034] rounded-sm">
              <StampBadge
                stamp={{
                  type: 'custom',
                  topText: customTop || 'CORREO',
                  bottomText: customBottom || userCity,
                  value: customValue || '5¢',
                  colorId: customColorId,
                  motifId: customMotifId
                }}
                size="lg"
              />
              <span className="text-xs text-[#cbb692] mt-3">Vista previa de tu diseño</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#cbb692] mb-1">Texto Superior</label>
                <input
                  type="text"
                  value={customTop}
                  onChange={e => setCustomTop(e.target.value)}
                  placeholder="ej. REPÚBLICA ARGENTINA o CORREO"
                  className="w-full px-3 py-2 bg-[#180f0b] border border-[#6e5034] rounded-sm text-sm text-[#f3e5c8] focus:outline-none focus:border-[#d97706]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#cbb692] mb-1">Ciudad / Pie</label>
                  <input
                    type="text"
                    value={customBottom}
                    onChange={e => setCustomBottom(e.target.value)}
                    placeholder="Buenos Aires"
                    className="w-full px-3 py-2 bg-[#180f0b] border border-[#6e5034] rounded-sm text-sm text-[#f3e5c8] focus:outline-none focus:border-[#d97706]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#cbb692] mb-1">Valor Facial</label>
                  <input
                    type="text"
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    placeholder="ej. 5c o 1 Peso"
                    className="w-full px-3 py-2 bg-[#180f0b] border border-[#6e5034] rounded-sm text-sm text-[#f3e5c8] focus:outline-none focus:border-[#d97706]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#cbb692] mb-1.5">Color de Tinta y Papel</label>
                <div className="flex flex-wrap gap-2">
                  {STAMP_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCustomColorId(c.id)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-bold transition flex items-center gap-1.5 border ${customColorId === c.id ? 'ring-2 ring-white border-white' : 'border-transparent'
                        }`}
                      style={{ backgroundColor: c.border, color: '#fff' }}
                    >
                      {customColorId === c.id && <Check size={12} />} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#cbb692] mb-1.5">Símbolo Central</label>
                <div className="flex flex-wrap gap-2">
                  {STAMP_MOTIFS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCustomMotifId(m.id)}
                      className={`px-3 py-2 rounded-sm text-base transition border ${customMotifId === m.id
                          ? 'bg-[#8e1616] border-[#f5d08a] text-white shadow'
                          : 'bg-[#180f0b] hover:bg-[#2d1c15] border-[#6e5034] text-[#f3e5c8]'
                        }`}
                    >
                      {m.symbol} <span className="text-xs ml-1 font-typewriter">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyCustom}
              className="w-full py-3 bg-[#8e1616] hover:bg-[#700f0f] text-[#fdf6e7] font-bold rounded-sm shadow-xl transition flex items-center justify-center gap-2"
            >
              <Check size={16} /> Usar esta estampilla personalizada en mi carta
            </button>
          </div>
        )}

        {/* Pie de modal */}
        <div className="p-3 bg-[#180f0b] border-t border-[#5c4028]/40 flex items-center justify-between font-typewriter text-xs text-[#cbb692]">
          <span>
            {currentStamp?.type === 'preset'
              ? `Estampilla elegida: ${findStamp(currentStamp.id)?.name || 'Seleccionada'}`
              : 'Estampilla artesanal personalizada'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#382417] hover:bg-[#4d3221] text-[#f3e5c8] rounded-sm transition"
          >
            Listo
          </button>
        </div>
      </div>
      <StampZoomModal stamp={zoomStamp} onClose={() => setZoomStamp(null)} />
    </div>
  );
}

