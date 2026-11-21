import stamps from './stamps.json';
import stampWreath from './assets/stamp_wreath_1962.jpg';
import stampCandle from './assets/stamp_candle_1962.jpg';
import stampOrnament from './assets/stamp_ornament.jpg';
import stampArIguazu from './assets/stamp_ar_iguazu.jpg';
import stampArAndes from './assets/stamp_ar_andes.jpg';
import stampArCeibo from './assets/stamp_ar_ceibo.jpg';
import stampArGlaciar from './assets/stamp_ar_glaciar.jpg';
import stampArFaro from './assets/stamp_ar_faro.jpg';
import stampArTren from './assets/stamp_ar_tren.jpg';
import stampArGaucho from './assets/stamp_ar_gaucho.jpg';

// Imágenes reales descargadas de filateliaargentina.com.ar
const files = import.meta.glob('./assets/stamps/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });

export const STAMP_CATEGORIES = [
  { id: 'all', label: 'Todas (100)', test: () => true },
  { id: '1930', label: 'Hasta 1959', test: y => y < 1960 },
  { id: '1960', label: '1960–1979', test: y => y >= 1960 && y < 1980 },
  { id: '1980', label: '1980–1999', test: y => y >= 1980 && y < 2000 },
  { id: '2000', label: '2000–2009', test: y => y >= 2000 && y < 2010 },
  { id: '2010', label: '2010 en adelante', test: y => y >= 2010 }
];

export const PRESET_STAMPS = stamps
  .filter(s => files[`./assets/stamps/${s.file}`])
  .map(s => ({ ...s, src: files[`./assets/stamps/${s.file}`] }));

// Estampillas antiguas: solo para que las cartas ya enviadas sigan mostrándose.
export const LEGACY_STAMPS = [
  { id: 'ar_iguazu', name: 'Cataratas del Iguazú', year: '', src: stampArIguazu },
  { id: 'ar_andes', name: 'Andes', year: '', src: stampArAndes },
  { id: 'ar_ceibo', name: 'Flor del Ceibo', year: '', src: stampArCeibo },
  { id: 'ar_glaciar', name: 'Glaciar Perito Moreno', year: '', src: stampArGlaciar },
  { id: 'ar_faro', name: 'Faro', year: '', src: stampArFaro },
  { id: 'ar_tren', name: 'Ferrocarril', year: '', src: stampArTren },
  { id: 'ar_gaucho', name: 'Gaucho y Ombú', year: '', src: stampArGaucho },
  { id: 'wreath', name: 'Navidad 1962 (Corona)', year: 1962, src: stampWreath },
  { id: 'candle', name: 'Navidad 1962 (Vela)', year: 1962, src: stampCandle },
  { id: 'ornament', name: 'Merry Christmas', year: '', src: stampOrnament }
];

export const findStamp = (id) =>
  PRESET_STAMPS.find(p => p.id === id) || LEGACY_STAMPS.find(p => p.id === id) || PRESET_STAMPS[0];

export const TOTAL_ARGENTINE_STAMPS = PRESET_STAMPS.length;
