// =========================================================================
// OTO-CV İKON KÜTÜPHANESİ — GİRİŞ NOKTASI (icons/index.js)
//
// Tek içe aktarma adresi. Çağrı yerleri registry.jsx'i ya da Icon.jsx'i
// doğrudan çağırmaz; hepsi buradan geçer. Böylece yarın çizimler bölünse
// ya da bir ikon paketine geçilse tek dosya değişir, 40 çağrı yeri değişmez.
//
// KULLANIM
//   import Icon from '@/components/common/icons';        // varsayılan
//   import Icon, { OLCEK, IKON_ADLARI } from '.../icons';
//
//   <Icon name="konum" size="sm" className="text-slate-400" />
//   <Icon name="uyari" size="md" label="Uyarı" />        // anlam ikondaysa
//
// BOYUT: xs 12 · sm 14 · md 16 · lg 20 · xl 24 · 2xl 32 (px)
//   satır içi metin yanında  → sm
//   buton içinde             → md
//   boş durum görselinde     → xl / 2xl
//
// ERİŞİLEBİLİRLİK: ikon varsayılan olarak süstür (aria-hidden). Yalnızca
// anlamı tek başına ikon taşıyorsa label ver. İkon tek başına bir butonun
// içeriğiyse label'ı BUTONA ver, ikonu süs bırak.
// =========================================================================

export { default } from './Icon';
export { OLCEK, IKON_ADLARI } from './Icon';
export { CIZIMLER } from './registry';
