// =========================================================================
// VİTRİN SATIRI — ARAMA SONUÇLARININ YATAY LİSTE BİÇİMİ (VitrinSatiri.jsx)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Sonuçlar vitrin KARTIYLA gösteriliyordu. Kart göz atmak için tasarlandı:
// büyük fotoğraf, beş alan (şehir, yıl, başlık, sicil puanı). Arama yapan
// kullanıcı ise KARŞILAŞTIRMAK istiyor ve kartta karşılaştıracak veri yok.
//
// -------------------------------------------------------------------------
// ⚠ NİYE SEKTÖR LİDERİNİN SATIRI BİREBİR KOPYALANMADI
// -------------------------------------------------------------------------
// Referans sitelerin yatay listesinde çapa sütun FİYAT: göz önce oraya
// gidiyor, sıralama ona göre. Bu üründe araca ait fiyat HUKUKEN
// gösterilmiyor — platformu satış sitesi konumuna sokuyor.
//
// O düzen birebir alınsaydı en baskın sütun boş kalırdı. Bu yüzden fiyatın
// durduğu yeri SİCİL PUANI aldı: ürünün gerçekten sattığı şey aracın
// geçmişinin ne kadar belgeli olduğu. Satır da buna göre kuruldu —
// teknik şerit soldan okunuyor, karar veren sayı sağda duruyor.
//
// -------------------------------------------------------------------------
// ⚠ `aria-label` KARTLAKİ İLE AYNI KALIPTA — TEST BAĞLI
// -------------------------------------------------------------------------
// `25-anasayfa` ve `18-vitrin-gorunurlugu` paketleri araç ögelerini
// "sicilini görüntüle" alt dizesiyle buluyor. Satır biçimi o dizeyi
// korumazsa testler aracı göremez ve sessizce "vitrin boş" sanır.
// =========================================================================

'use client';

import React from 'react';
import AracGorseli from '../common/AracGorseli';
import Icon from '../common/icons';
import { tramerDurumu, TRAMER_DURUM } from '../../utils/tramerHelper';

/** Kilometreyi Türkçe binlik ayracıyla yazar. 0 geçerli bir değer. */
function kmYaz(km) {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toLocaleString('tr-TR') + ' km';
}

/**
 * "3 gün önce" biçimi.
 *
 * ⚠ `Intl.RelativeTimeFormat` KULLANILMIYOR: sunucu ve istemci farklı anda
 * çalıştığında "az önce"/"1 dakika önce" ayrışıyor ve React hidrasyon
 * uyarısı basıyor. Gün çözünürlüğü bu listede zaten yeterli.
 */
function neZaman(tarih) {
  if (!tarih) return null;
  const t = new Date(tarih).getTime();
  if (!Number.isFinite(t) || t === 0) return null;
  const gun = Math.floor((Date.now() - t) / 86400000);
  if (gun < 0) return null;
  if (gun === 0) return 'bugün';
  if (gun === 1) return 'dün';
  if (gun < 30) return `${gun} gün önce`;
  const ay = Math.floor(gun / 30);
  return ay < 12 ? `${ay} ay önce` : `${Math.floor(ay / 12)} yıl önce`;
}

/** Tramer rozetinin metni ve rengi. Üç durum AYRI — 'bilinmiyor' 'yok' değil. */
function tramerRozeti(item) {
  const d = tramerDurumu(item);
  if (d === TRAMER_DURUM.VAR) {
    return { metin: 'Tramer kaydı var', sinif: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
  if (d === TRAMER_DURUM.YOK) {
    return { metin: 'Tramer kaydı yok', sinif: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }
  // ⚠ BEYAN EDİLMEYEN 'HASARSIZ' SAYILMIYOR. Sihirbazda bilerek düzeltilen
  // hatanın aynısı olurdu; `16-uydurma-veri` bunu bekçiliyor.
  return { metin: 'Tramer beyanı yok', sinif: 'bg-slate-50 text-slate-600 border-slate-200' };
}

export default function VitrinSatiri({ item, sira = 0, favorili, onFavori, onSec }) {
  const ilkFoto = item.image_url ? String(item.image_url).split(',')[0].trim() : null;
  // Karne yalnızca vitrin katmanında açık; PIN'i olmayan aracın karnesi yok.
  const karneAcik = Boolean(item.pin_code);
  const tramer = tramerRozeti(item);
  const km = kmYaz(item.km);
  const zaman = neZaman(item.created_at);

  const baslik = item.listing_title
    || [item.brand, item.series, item.model, item.package].filter(Boolean).join(' ');

  // Teknik şerit: yalnızca DOLU alanlar. Veri yoksa alan çizilmiyor —
  // boş bir yer, uydurma bir yerden iyidir.
  const teknik = [
    item.year ? String(item.year) : null,
    km,
    item.fuel_type || null,
    item.transmission || null,
  ].filter(Boolean);

  const konum = [item.city, item.district].filter(Boolean).join(' / ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSec(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSec(item); }
      }}
      aria-label={`${item.brand || ''} ${item.model || ''} ${item.year || ''} — ${karneAcik ? '' : 'karnesi kapalı, '}sicilini görüntüle`}
      className="group bg-white border border-slate-200/90 hover:border-slate-400 rounded-md shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer select-none flex gap-3 p-2.5 focus-visible:ring-offset-1"
    >
      {/* FOTOĞRAF — sabit oran, listede satırlar hizalı kalsın diye. */}
      <div className="relative w-[124px] h-[92px] shrink-0 bg-[#F1F5F9] rounded overflow-hidden">
        <AracGorseli
          src={ilkFoto}
          alt={`${item.brand || ''} ${item.model || ''}`.trim()}
          uyum="cover"
          /* İlk iki satır öncelikli: LCP bu listede de ilk görsel oluyor. */
          priority={sira < 2}
          sizes="124px"
        />
        {item.is_featured && (
          <span className="absolute top-1 left-1 etiket bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-mono">
            ÖNE ÇIKAN
          </span>
        )}
      </div>

      {/* ORTA BLOK — başlık, teknik şerit, rozetler. */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="min-w-0">
          <h3 className="baslik-kart text-slate-900 truncate">{baslik}</h3>

          {teknik.length > 0 && (
            <p className="metin-yardimci text-slate-600 mt-0.5 tabular-nums truncate">
              {teknik.join(' · ')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className={`etiket border rounded px-1.5 py-0.5 ${tramer.sinif}`}>
            {tramer.metin}
          </span>
          {/* Karne durumu KARTTA YOKTU. Listede duruyor çünkü kullanıcının
              asıl merak ettiği "bu aracın geçmişini görebilir miyim". */}
          <span
            className={`etiket border rounded px-1.5 py-0.5 ${
              karneAcik
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {karneAcik ? 'Karne paylaşımda' : 'Karne kapalı'}
          </span>
        </div>
      </div>

      {/* SAĞ BLOK — çapa. Referans sitelerde burası FİYAT; bizde SİCİL. */}
      <div className="shrink-0 w-[132px] flex flex-col items-end justify-between py-0.5">
        <div className="flex items-start gap-1.5">
          <div className="text-right">
            <div className="etiket text-slate-500">SİCİL PUANI</div>
            <div className="baslik-sayfa text-indigo-600 tabular-nums leading-none mt-0.5">
              {item.trust_score ?? 0}
              <span className="metin-yardimci text-slate-400">/100</span>
            </div>
          </div>

          {onFavori && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFavori(item.pin_code); }}
              aria-pressed={!!favorili}
              aria-label={favorili ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              /* 44x44 — dokunma hedefi asgarisi. */
              className={`w-11 h-11 grid place-items-center rounded-full border transition-colors cursor-pointer shrink-0 ${
                favorili
                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                  : 'border-slate-200 text-slate-500 hover:text-rose-500 hover:border-rose-200'
              }`}
            >
              {/* `dolu`: durum yalnızca renkle anlatılmıyor. */}
              <Icon name="kalp" size="md" dolu={!!favorili} />
            </button>
          )}
        </div>

        <div className="text-right metin-yardimci text-slate-500 leading-tight">
          {konum && <div className="truncate max-w-[130px]">{konum}</div>}
          {zaman && <div className="text-slate-400">{zaman}</div>}
        </div>
      </div>
    </div>
  );
}
