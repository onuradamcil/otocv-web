// =========================================================================
// FaturaOnizleme — FATURA GÖRSELİNİ İMZALI BAĞLANTIYLA GÖSTERİR
//
// -------------------------------------------------------------------------
// ÖNCEKİ HÂLİ NEDEN AÇIKTI
// -------------------------------------------------------------------------
// Fatura görselleri public bir bucket'ta duruyor ve veritabanında tam URL
// saklanıyordu:
//
//   <img src={item.invoice_url} />
//
// URL'yi bir kez gören herkes dosyaya SÜRESİZ erişiyordu. Fatura görseli
// araç sahibinin adını, adresini, plakasını ve servis bilgisini taşır.
//
// Şimdi veritabanında yalnızca bucket içi yol var (`invoice_path`) ve o yol
// `sicil_getir()` tarafından YALNIZCA araç sahibine döndürülüyor. Bu bileşen
// yolu 5 dakika ömürlü imzalı bağlantıya çeviriyor.
//
// -------------------------------------------------------------------------
// NİYE MOUNT'TA İMZALIYOR, HEPSİNİ ÖNDEN DEĞİL
// -------------------------------------------------------------------------
// Bileşen yalnızca akordeon açıldığında render ediliyor. Yani imzalama
// isteği kullanıcı o kaydı açtığında atılıyor — 20 kayıtlı bir araçta 20
// gereksiz istek yok. Küçük resmin görünmesi için bir URL şart, o yüzden
// açılışta imzalanıyor.
//
// -------------------------------------------------------------------------
// BÜYÜTMEDE YENİDEN İMZALAMA
// -------------------------------------------------------------------------
// Kullanıcı kaydı açıp uzun süre bekleyip sonra "büyüt"e basarsa ilk imza
// ölmüş olabilir ve modal boş açılır. O yüzden büyütme her seferinde TAZE
// imza alıyor. Kısa ömür + tıklamada yenileme, uzun ömürlü tek bağlantıdan
// hem daha güvenli hem kullanıcı için daha sağlam.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from './icons';

const BUCKET = 'vehicle-invoices';
// 5 dakika. Küçük resmin görünmesi için yeterli, sızan bir bağlantının
// işe yaraması için kısa.
const OMUR_SN = 300;

/** Yolu imzalı bağlantıya çevirir. Başarısızsa null döner. */
async function imzala(yol) {
  if (!yol) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(yol, OMUR_SN);

  if (error) {
    // Yetki yoksa burası normal: başka kullanıcının faturası ya da dosya
    // taşınmamış eski bir kayıt. Sessizce geçmiyoruz ama kullanıcıya
    // teknik hata da göstermiyoruz.
    console.warn('Fatura bağlantısı alınamadı:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

/**
 * @param {string} yol      Bucket içi yol (`invoice_path`)
 * @param {Function} onBuyut Taze imzalı URL ile çağrılır (modal açmak için)
 */
export default function FaturaOnizleme({ yol, onBuyut }) {
  const [kucukUrl, setKucukUrl] = useState(null);
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | hazir | erisilemez
  const [buyutuluyor, setBuyutuluyor] = useState(false);

  useEffect(() => {
    let iptal = false;

    (async () => {
      const url = await imzala(yol);
      if (iptal) return;
      setKucukUrl(url);
      setDurum(url ? 'hazir' : 'erisilemez');
    })();

    return () => {
      iptal = true;
    };
  }, [yol]);

  const buyut = async () => {
    setBuyutuluyor(true);
    // Taze imza: ilk bağlantı ölmüş olabilir.
    const url = await imzala(yol);
    setBuyutuluyor(false);
    if (url) onBuyut?.(url);
    else setDurum('erisilemez');
  };

  if (durum === 'erisilemez') {
    // Belge var ama açılamıyor. Bunu gizlemek yanlış olurdu: kullanıcı
    // faturasını yüklediğini biliyor, hiç görünmemesi "kayboldu" demek.
    return (
      <div className="space-y-1.5 pt-1">
        <span className="text-etiket font-bold text-slate-500 tracking-wider block uppercase">
          Servis Faturası / Evrak
        </span>
        <p className="flex items-center gap-2 text-mini text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Icon name="uyari" size="sm" className="text-amber-500 shrink-0" />
          Belge kayıtlı, şu an açılamıyor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-1">
      <span className="text-etiket font-bold text-slate-500 tracking-wider block uppercase">
        Servis Faturası / Evrak
      </span>
      <button
        type="button"
        onClick={buyut}
        disabled={durum !== 'hazir' || buyutuluyor}
        className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 p-1.5 pr-3 rounded-lg shadow-sm text-mini font-bold text-indigo-600 transition-colors group disabled:opacity-60 disabled:cursor-wait"
      >
        {/* next/image kullanılmıyor: imzalı bağlantı her istekte değişiyor,
            dolayısıyla optimizasyon önbelleği hiç isabet etmez; üstelik uzak
            host beyanı gerektirir ve imzalı URL'de anlamı yok. */}
        {kucukUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={kucukUrl}
            alt=""
            className="w-10 h-10 object-cover rounded border border-slate-100"
            onError={() => setDurum('erisilemez')}
          />
        ) : (
          <span className="w-10 h-10 rounded border border-slate-100 bg-slate-100 animate-pulse block" />
        )}
        <span className="group-hover:underline">
          {buyutuluyor ? 'Açılıyor…' : 'Fatura / Evrak Görselini Büyüt'}
        </span>
      </button>
    </div>
  );
}
