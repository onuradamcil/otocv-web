// =========================================================================
// BANA ÖZEL ÖZET (/dashboard)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Menüdeki bu madde aylardır bir "yapım aşamasında" yer tutucusuydu ve
// vaadi şuydu: "Araçlarınızın durumunu, yaklaşan tarihleri ve bakım
// özetini tek ekranda toplayan panel."
//
// Vaadin tamamı gerçek veriyle karşılanabiliyor; canlıda ölçüldü:
//   11 aracın 11'inde poliçe/muayene tarihi dolu
//   13 bakım kaydı, 8 araca dağılmış
//   11 aracın 11'inde sicil puanı, 2 araç vitrinde
//
// -------------------------------------------------------------------------
// PANELİN TEK İŞİ: NE ZAMAN NE YAPILMALI
// -------------------------------------------------------------------------
// Garaj "araçlarım" ekranı; burası "bugün neye bakmalıyım" ekranı. O yüzden
// sıralama tarihe göre değil ACİLİYETE göre: süresi dolanlar en üstte.
// Aynı bilgiyi garajda da görebilirsiniz ama orada on araca dağılmış
// durumda; burada tek listede ve sıralı.
//
// -------------------------------------------------------------------------
// ⚠ UYDURMA VERİ YOK
// -------------------------------------------------------------------------
// Bu projede birkaç kez, eksik veri "|| 0" ile doldurulup gerçek sanıldı.
// Burada kural: veri yoksa bölüm HİÇ ÇİZİLMİYOR. Sıfır ile "bilinmiyor"
// aynı şey değil — sicil puanı olmayan araç ortalamaya girmiyor, tarihi
// girilmemiş belge uyarı listesine girmiyor (ayrıca sayılıyor ki
// kullanıcı neyi doldurması gerektiğini bilsin).
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './common/icons';
import TrPlaka from './common/TrPlaka';
import GlobalStepLoader from './common/GlobalStepLoader';
import { ozetGetir } from '../services/ozetService';
import { formatTrDate } from '../utils/dateHelper';

/** Sayı + etiket taşıyan küçük kart. Ölçekteki `.sayi-vurgu` kullanılıyor. */
function SayiKarti({ sayi, etiket, ikon, vurgu = false }) {
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
      vurgu ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
    }`}>
      <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
        vurgu ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
      }`}>
        <Icon name={ikon} size="lg" />
      </div>
      <div className="min-w-0">
        <span className={`sayi-vurgu block leading-none ${vurgu ? 'text-rose-700' : 'text-slate-900'}`}>
          {sayi}
        </span>
        <span className={`etiket block mt-1 ${vurgu ? 'text-rose-800' : 'text-slate-600'}`}>
          {etiket}
        </span>
      </div>
    </div>
  );
}

/**
 * Yaklaşan tarih satırı. Renk ve metin `calculatePolicyStatus`tan geliyor.
 *
 * ⚠ MOBİLDE İKİ KADEME — TEK SATIR DENENDİ VE ÖLÇÜLDÜ, OKUNMUYORDU.
 * İlk hâli tek satırdı: nokta + plaka + belge adı + durum çipi. 390px'de
 * plaka rozeti ve durum çipi tüm genişliği yiyor, belge adına yer
 * kalmıyordu — ekranda "TÜV…", "Kask…", "Trafi…" görünüyordu. Kritik
 * listede daha da kötüydü: belge adı hiç okunmuyordu, yani kullanıcı
 * HANGİ belgenin süresinin dolduğunu göremiyordu.
 *
 * Şimdi mobilde plaka ve durum üstte, belge adı altta tam genişlikte.
 * `sm` ve üstünde tek satıra dönüyor — orada yer var.
 */
function TarihSatiri({ kayit, onAc }) {
  const { durum } = kayit;
  return (
    <button
      type="button"
      onClick={onAc}
      className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer"
    >
      <span className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${durum.dotClass}`} />
        <TrPlaka plaka={kayit.plaka} boyut="sm" />
        {/* Durum çipi mobilde plakanın yanında; masaüstünde satır sonunda. */}
        <span className={`etiket px-2 py-1 rounded-lg border shrink-0 sm:hidden ${durum.bgClass}`}>
          {durum.text}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="baslik-kart text-slate-900 block">{kayit.belge}</span>
        <span className="metin-yardimci text-slate-500 block truncate">
          {kayit.arac} · {formatTrDate(kayit.tarih)}
        </span>
      </span>

      <span className={`etiket px-2 py-1 rounded-lg border shrink-0 hidden sm:inline-block ${durum.bgClass}`}>
        {durum.text}
      </span>
    </button>
  );
}

/** Bölüm sarmalayıcı — kart kalıbı garaj ve vitrin ekranlarıyla aynı. */
function Bolum({ baslik, aciklama, children, sag }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="baslik-bolum text-slate-900">{baslik}</h2>
          {aciklama && <p className="metin-yardimci text-slate-500 mt-0.5">{aciklama}</p>}
        </div>
        {sag}
      </div>
      {children}
    </section>
  );
}

export default function OzetEkrani() {
  const router = useRouter();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    (async () => {
      const sonuc = await ozetGetir();
      if (iptal) return;
      if (!sonuc.basarili) setHata(sonuc.hata || 'Özet yüklenemedi.');
      else setVeri(sonuc.veri);
      setYukleniyor(false);
    })();
    return () => { iptal = true; };
  }, []);

  if (yukleniyor) {
    return <GlobalStepLoader isLoading title="Özetiniz hazırlanıyor" subtitle="Araç ve belge bilgileriniz okunuyor..." />;
  }

  if (hata) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-2">
          <h1 className="baslik-bolum text-slate-900">Özet açılamadı</h1>
          <p className="metin-govde text-slate-600">{hata}</p>
        </div>
      </div>
    );
  }

  // ARACI OLMAYAN KULLANICI: sayaç göstermek yerine ne yapacağını söylüyor.
  // Sıfırlarla dolu bir panel, ürünün çalışmadığı izlenimi veriyor.
  if (!veri || veri.aracSayisi === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-fadeIn">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center mx-auto">
            <Icon name="arac" size="xl" />
          </div>
          <h1 className="baslik-sayfa text-slate-900">Henüz aracınız yok</h1>
          <p className="metin-govde text-slate-600 max-w-md mx-auto">
            İlk aracınızı kaydettiğinizde poliçe ve muayene tarihleri, bakım geçmişi
            ve sicil puanı bu ekranda toplanacak.
          </p>
          <button
            type="button"
            onClick={() => router.push('/add-vehicle/step1')}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Icon name="arti" size="sm" />
            Yeni Araç Kaydet
          </button>
        </div>
      </div>
    );
  }

  const { kritikler, tumTarihler, eksikTarih, bakim, vitrin, sicil, aracSayisi } = veri;
  const guvenli = tumTarihler.filter((t) => !t.durum.isCritical);

  // Sıradakiler: tarihi en yakın olan altısı. Sayı keyfi değil — ekranda
  // ölçüldü, altı satır kritik listeyi bastırmadan "sırada ne var" sorusunu
  // cevaplıyor. Tamamı garajda zaten var.
  const SIRADAKI_ADET = 6;
  const siradakiler = [...guvenli]
    .sort((a, b) => new Date(a.tarih) - new Date(b.tarih))
    .slice(0, SIRADAKI_ADET);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5 animate-fadeIn">
      <div>
        <h1 className="baslik-sayfa text-slate-900">Bana Özel Özet</h1>
        <p className="metin-govde text-slate-600 mt-1">
          {aracSayisi} aracınızın belge takvimi, bakım geçmişi ve vitrin durumu.
        </p>
      </div>

      {/* SAYAÇ ŞERİDİ — hepsi gerçek veriden, hiçbiri varsayılan değil. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SayiKarti sayi={kritikler.length} etiket="İlgi bekleyen belge" ikon="uyari" vurgu={kritikler.length > 0} />
        <SayiKarti sayi={aracSayisi} etiket="Kayıtlı araç" ikon="arac" />
        <SayiKarti sayi={bakim.toplam} etiket="Bakım kaydı" ikon="anahtar" />
        <SayiKarti sayi={vitrin.adet} etiket="Vitrinde" ikon="goz" />
      </div>

      {/* 1 · İLGİ BEKLEYENLER — panelin asıl sebebi */}
      <Bolum
        baslik="İlgi bekleyen belgeler"
        aciklama={kritikler.length > 0
          ? 'Süresi dolmuş ya da 30 günden az kalmış belgeler.'
          : 'Süresi dolmuş ya da yaklaşan belge yok.'}
      >
        {kritikler.length > 0 ? (
          <div className="space-y-2">
            {kritikler.map((k) => (
              <TarihSatiri
                key={`${k.plaka}-${k.belge}`}
                kayit={k}
                onAc={() => router.push(`/garage/${k.plaka}/duzenle`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <Icon name="onay" size="lg" className="text-emerald-700 shrink-0" />
            <p className="metin-govde text-emerald-900">
              Tüm belgeleriniz güvenli aralıkta. Yaklaşan bir tarih olduğunda burada görünecek.
            </p>
          </div>
        )}

        {/* Eksik tarih bir UYARI değil, eksik veri — ayrı ve sakin bir dille. */}
        {eksikTarih > 0 && (
          <p className="metin-yardimci text-slate-500 border-t border-slate-100 pt-3">
            {eksikTarih} belgenin tarihi girilmemiş. Takip edilebilmesi için araç
            kayıtlarınızdan tamamlayabilirsiniz.
          </p>
        )}
      </Bolum>

      {/* 2 · SIRADAKİLER — TAMAMI DEĞİL, EN YAKIN BİRKAÇI
          -------------------------------------------------------------------
          İlk yazımda burası güvenli aralıktaki HER belgeyi listeliyordu ve
          ekranda ölçüldü: 28 satır, hepsi yeşil "Aktif". Bir bilgi değil,
          duvar. Panelin işi "bugün neye bakmalıyım" demek; 28 satır tam da
          onu boğuyordu.
          Şimdi tarihi en yakın olan birkaçı gösteriliyor, gerisi garajda.
          Sıralama tarihe göre — kritik listesinden farklı olarak burada
          aciliyet yok, sıradaki ne olduğu önemli. */}
      {guvenli.length > 0 && (
        <Bolum
          baslik="Sıradaki belgeler"
          aciklama="Tarihi en yakın olanlar."
          sag={
            <button
              type="button"
              onClick={() => router.push('/garage')}
              className="etiket text-indigo-700 hover:text-indigo-900 min-h-[44px] px-2 cursor-pointer shrink-0"
            >
              Tümü garajda →
            </button>
          }
        >
          <div className="space-y-2">
            {siradakiler.map((k) => (
              <TarihSatiri
                key={`${k.plaka}-${k.belge}`}
                kayit={k}
                onAc={() => router.push(`/garage/${k.plaka}/duzenle`)}
              />
            ))}
          </div>
          {guvenli.length > siradakiler.length && (
            <p className="metin-yardimci text-slate-500 border-t border-slate-100 pt-3">
              {guvenli.length - siradakiler.length} belge daha güvenli aralıkta.
            </p>
          )}
        </Bolum>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 3 · BAKIM ÖZETİ */}
        <Bolum baslik="Bakım geçmişi">
          <dl className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="metin-govde text-slate-600">Toplam kayıt</dt>
              <dd className="baslik-kart text-slate-900 tabular-nums">{bakim.toplam}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="metin-govde text-slate-600">Kaydı olan araç</dt>
              <dd className="baslik-kart text-slate-900 tabular-nums">
                {bakim.kayitliArac} / {aracSayisi}
              </dd>
            </div>
            {/* Son bakım tarihi YOKSA satır hiç çizilmiyor — "—" basmak
                kullanıcıya bilgi vermiyor, yer kaplıyor. */}
            {bakim.sonTarih && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="metin-govde text-slate-600">Son bakım</dt>
                <dd className="baslik-kart text-slate-900">{formatTrDate(bakim.sonTarih)}</dd>
              </div>
            )}
          </dl>

          {bakim.kayitsizArac > 0 && (
            <p className="metin-yardimci text-slate-500 border-t border-slate-100 pt-3">
              {bakim.kayitsizArac} aracın hiç bakım kaydı yok. Kayıt eklendikçe sicil
              puanı yükseliyor.
            </p>
          )}
        </Bolum>

        {/* 4 · VİTRİN + SİCİL */}
        <Bolum baslik="Vitrin ve sicil">
          <dl className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="metin-govde text-slate-600">Vitrindeki araç</dt>
              <dd className="baslik-kart text-slate-900 tabular-nums">{vitrin.adet}</dd>
            </div>
            {vitrin.adet > 0 && (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="metin-govde text-slate-600">Görüntüleyen kişi</dt>
                  <dd className="baslik-kart text-slate-900 tabular-nums">{vitrin.goruntulenme}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="metin-govde text-slate-600">Favorileyen</dt>
                  <dd className="baslik-kart text-slate-900 tabular-nums">{vitrin.favori}</dd>
                </div>
              </>
            )}
            {/* Sicil puanı olan araç yoksa bu satır hiç yok. */}
            {sicil && (
              <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2.5">
                <dt className="metin-govde text-slate-600">
                  Ortalama sicil puanı
                  {sicil.eksik > 0 && (
                    <span className="metin-yardimci text-slate-500 block">
                      {sicil.adet} araç üzerinden
                    </span>
                  )}
                </dt>
                <dd className="sayi-vurgu text-indigo-700 tabular-nums">%{sicil.ortalama}</dd>
              </div>
            )}
          </dl>
        </Bolum>
      </div>
    </div>
  );
}
