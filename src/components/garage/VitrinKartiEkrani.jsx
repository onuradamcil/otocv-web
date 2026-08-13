// =========================================================================
// VİTRİN KARTI (VitrinKartiEkrani.jsx)
//
// -------------------------------------------------------------------------
// NİYE MODAL DEĞİL SAYFA
// -------------------------------------------------------------------------
// Eskiden `PublishListingModal` idi: altı alanlı bir form, ücretli bir
// yükseltme ve kalıcı bir kayıt üreten bir modal. Modalın doğru olduğu yer
// TEK KARAR, kısa ve geri dönülür işlerdir — onay kutusu, seçim, silme
// onayı. Çok alanlı bir form modalda üç şeyi kaybediyor:
//
//   · Adres çubuğunda görünmüyor: paylaşılamıyor, yenilenemiyor.
//   · Geri tuşu tüm sayfayı kapatıyor, formu değil.
//   · Mobilde klavye açılınca ekranın yarısını yiyor ve modal kaydırma ile
//     sayfa kaydırması birbirine giriyor.
//
// Onay ve seçim diyalogları (araç seçici, paywall, hesap kapatma) modal
// KALDI. Ayrım bilinçli.
//
// -------------------------------------------------------------------------
// ALTI ALANDAN İKİYE — ÖLÇÜLDÜ
// -------------------------------------------------------------------------
// Modal şunları soruyordu: başlık, bedel, tramer tutarı, il, ilçe, açıklama.
// Bunların DÖRDÜ kayıt sihirbazının 2. adımında zaten soruluyor:
//
//   başlık      Step2ListingDetails (üstelik otomatik de üretiliyor)
//   il / ilçe   Step2ListingDetails, aranabilir liste
//   açıklama    Step2ListingDetails, ZENGİN editör (modaldeki düz alandan
//               daha güçlüydü — yani kullanıcı ikinci kez, daha kötü bir
//               araçla yazıyordu)
//   tramer      Step2ListingDetails, hasar şemasıyla birlikte
//
// Aynı bilgiyi iki kez sormak yalnızca zaman kaybı değil: iki kopya
// birbirinden ayrışıyor ve hangisinin doğru olduğu belirsizleşiyor.
//
// Geriye gerçekten yeni olan iki şey kalıyor: BEDEL ve ÖNE ÇIKARMA.
// Araçtan gelenler özet olarak gösteriliyor ve "Araç kaydını düzenle"
// bağlantısıyla tek kaynağa gidiliyor.
//
// -------------------------------------------------------------------------
// ⚠ ARAÇ BEDELİ HİÇ SORULMUYOR — HUKUKİ GEREKÇE
// -------------------------------------------------------------------------
// Ürüne (araca) ait herhangi bir fiyat gösterilmesi, platformu satış
// sitesi konumuna sokuyor. Bu ürün bir dijital taşıt sicili; satış
// platformu DEĞİL. Bu yüzden vitrin kartında bedel alanı yok, pazaryerinde
// de tutar gösterilmiyor.
//
// Vitrin kartının işi aracın SİCİLİNİ görünür kılmak: doğrulanmış bakım
// geçmişi, poliçe durumu ve sicil puanı. Alıcı adayı araçla ilgileniyorsa
// sahibiyle iletişime geçiyor; pazarlık platformun dışında.
//
// Kendi HİZMET ücretlerimiz (öne çıkarma gibi) ayrı bir şey: onlar bizim
// sattığımız hizmetin bedeli, aracın değil.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { zamanAsimiyla } from '../../lib/istek';
import { useToast } from '../../context/ToastContext';
import { publishVehicleListing, unpublishVehicleListing } from '../../services/marketplaceService';
import { URUNLER, fiyatYaz } from '../../data/paketler';
import { harcanmamisHak } from '../../services/odemeService';
import PaywallDialog from '../common/PaywallDialog';
import GlobalStepLoader from '../common/GlobalStepLoader';
import Icon from '../common/icons';
import { dugme } from '../common/dugme';

export default function VitrinKartiEkrani({ pin }) {
  const toast = useToast();

  const [arac, setArac] = useState(null);
  const [vitrinKaydi, setVitrinKaydi] = useState(null);
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | hazir | yok | baglanti
  const [tetik, setTetik] = useState(0);

  const [oneCikar, setOneCikar] = useState(false);
  const [paywallAcik, setPaywallAcik] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hataMetni, setHataMetni] = useState(null);

  useEffect(() => {
    let iptal = false;

    (async () => {
      setDurum('yukleniyor');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (iptal) return;
        if (!user) { setDurum('yok'); return; }

        // RLS zaten sahibe kısıtlıyor (`vehicles_oku_sahip`), ama `user_id`
        // koşulu açıkça yazılıyor: güvenlik tek katmana bırakılmıyor.
        const { data, error } = await zamanAsimiyla(
          supabase
            .from('vehicles')
            .select('*, listings(*)')
            .eq('pin_code', pin)
            .eq('user_id', user.id)
            .maybeSingle()
        );

        if (iptal) return;
        if (error) { console.error(error); setDurum('baglanti'); return; }
        if (!data) { setDurum('yok'); return; }

        const liste = Array.isArray(data.listings) ? data.listings : (data.listings ? [data.listings] : []);
        const aktif = liste.find((l) => l.status === 'active') || null;

        setArac(data);
        setVitrinKaydi(aktif);
        setOneCikar(aktif?.is_featured === true);
        setDurum('hazir');
      } catch (e) {
        if (iptal) return;
        console.error('Vitrin kartı yüklenemedi:', e);
        setDurum('baglanti');
      }
    })();

    return () => { iptal = true; };
  }, [pin, tetik]);

  // -----------------------------------------------------------------------
  const yayinla = async () => {
    setHataMetni(null);
    setGonderiliyor(true);

    // Alanların TAMAMI araç kaydından geliyor. Modaldeki gibi ikinci kez
    // sorulmuyor; tek kaynak `vehicles`.
    const sonuc = await publishVehicleListing(arac, {
      title: arac.title || `${arac.year} ${arac.brand} ${arac.model}`,
      description: arac.description || '',
      city: arac.city,
      district: arac.district,
      tramerAmount: arac.tramer_amount || 0,
      isFeatured: oneCikar,
    });

    setGonderiliyor(false);

    if (!sonuc.success) {
      setHataMetni(sonuc.error || 'Vitrine çıkarılamadı.');
      return;
    }
    toast.basari(vitrinKaydi ? 'Vitrin kartınız güncellendi.' : 'Aracınız vitrinde.');
    setTetik((n) => n + 1);
  };

  const kaldir = async () => {
    setGonderiliyor(true);
    const sonuc = await unpublishVehicleListing(arac);
    setGonderiliyor(false);

    if (!sonuc.success) { setHataMetni(sonuc.error); return; }
    // Kayıt SİLİNMİYOR, pasife alınıyor — geçmiş, sayaçlar ve bedel duruyor.
    toast.basari('Aracınız vitrinden kaldırıldı.');
    setTetik((n) => n + 1);
  };

  // Öne çıkarma ücretli. Kutuyu doğrudan çevirmiyoruz: harcanmamış hak
  // yoksa paywall açılıyor. Kaldırmak ücret gerektirmiyor.
  const oneCikarDegistir = async (istenen) => {
    if (!istenen) { setOneCikar(false); return; }

    const hak = await harcanmamisHak(URUNLER.vitrin.kod);
    if (hak) { setOneCikar(true); return; }
    setPaywallAcik(true);
  };

  // -----------------------------------------------------------------------
  if (durum === 'yukleniyor') {
    return <GlobalStepLoader mode="iskelet" varyant="form" gecikmeMs={200} />;
  }

  if (durum === 'baglanti') {
    return (
      <Kutu
        baslik="Vitrin kartına ulaşılamadı"
        aciklama="Sunucuya bağlanılamadı. Bağlantınızı kontrol edip tekrar deneyin."
      >
        <button type="button" onClick={() => setTetik((n) => n + 1)} className={dugme('birincil')}>
          Tekrar Dene
        </button>
        <Link href="/garage" className={dugme('ikincil')}>Garajıma Dön</Link>
      </Kutu>
    );
  }

  if (durum === 'yok') {
    return (
      <Kutu
        baslik="Araç bulunamadı"
        aciklama="Bu araç sizin garajınızda görünmüyor. Vitrin kartını yalnızca aracın sahibi düzenleyebilir."
      >
        <Link href="/garage" className={dugme('birincil')}>Garajıma Dön</Link>
      </Kutu>
    );
  }

  const eksikAlanlar = [
    !arac.city && 'il',
    !arac.district && 'ilçe',
    !arac.description && 'açıklama',
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="border-b border-slate-200 pb-4">
          <h1 className="baslik-sayfa text-slate-900">Vitrin Kartı</h1>
          <p className="metin-yardimci text-slate-500 mt-1">
            Aracınızın pazaryerinde görüneceği kart. Bilgiler araç kaydınızdan geliyor.
          </p>
        </div>

        {/* ARAÇ ÖZETİ — DÜZENLENMİYOR, GÖSTERİLİYOR */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <span className="inline-flex items-center border-[1.5px] border-slate-800 rounded-md bg-white font-mono font-black h-7 overflow-hidden shrink-0">
              <span className="bg-[#003399] text-white text-[9px] font-sans font-bold px-1.5 h-full flex items-center">TR</span>
              <span className="px-2.5 text-slate-900 text-sm tracking-wider uppercase h-full flex items-center whitespace-nowrap">
                {(arac.plate_number || '').replace(/\s+/g, '').replace(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/, '$1 $2 $3')}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="baslik-bolum text-slate-900 truncate">
                {arac.title || `${arac.brand} ${arac.model}`}
              </h2>
              <p className="metin-yardimci text-slate-500 font-mono">
                {arac.year} • {arac.km ? Number(arac.km).toLocaleString('tr-TR') : '0'} km
                {arac.city ? ` • ${arac.city}${arac.district ? ' / ' + arac.district : ''}` : ''}
              </p>
            </div>
          </div>

          {arac.description && (
            <p className="metin-yardimci text-slate-600 line-clamp-3 border-t border-slate-100 pt-3">
              {String(arac.description).replace(/<[^>]*>/g, '').slice(0, 300)}
            </p>
          )}

          {/* Eksik alan varsa SÖYLENİYOR ve tek kaynağa yönlendiriliyor.
              Modal bunları burada tekrar sorup araç kaydını güncellemiyordu:
              iki kopya ayrışıyordu. */}
          {eksikAlanlar.length > 0 && (
            <div role="status" className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="metin-yardimci text-amber-900">
                Araç kaydınızda <strong>{eksikAlanlar.join(', ')}</strong> eksik. Vitrin kartı bu
                bilgileri araç kaydından alıyor.
              </p>
            </div>
          )}

          <Link
            href={`/details/${encodeURIComponent(pin)}`}
            className="inline-flex items-center gap-1.5 min-h-[36px] metin-yardimci text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <Icon name="duzenle" size="xs" />
            Araç kaydını görüntüle
          </Link>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="baslik-bolum text-slate-900">Vitrin ayarları</h2>

          {/* ⚠ BEDEL ALANI YOK VE BU BİLİNÇLİ.
              Araca ait herhangi bir tutar göstermek platformu satış sitesi
              konumuna sokuyor. Vitrin kartının işi aracın SİCİLİNİ görünür
              kılmak; pazarlık platformun dışında. */}
          <p className="metin-yardimci text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            Vitrin kartı aracınızın <strong>doğrulanmış sicilini</strong> gösterir: bakım
            geçmişi, poliçe durumu ve sicil puanı. Bedel bilgisi yer almaz; ilgilenenler
            sizinle iletişime geçer.
          </p>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={oneCikar}
              onChange={(e) => oneCikarDegistir(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-indigo-600 cursor-pointer"
              aria-label="Öne çıkar"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="baslik-bolum text-slate-800">Öne Çıkar</span>
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  {fiyatYaz(URUNLER.vitrin.fiyat)}
                </span>
              </span>
              <span className="block metin-yardimci text-slate-500 mt-0.5">
                Aracınız pazaryerinin en üst rafında görünür.
              </span>
            </span>
          </label>

          {hataMetni && (
            <p role="alert" className="metin-yardimci text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {hataMetni}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link href="/garage" className={dugme('ikincil', { ek: 'flex-1' })}>Vazgeç</Link>
            <button
              type="button"
              onClick={yayinla}
              disabled={gonderiliyor}
              className={dugme('birincil', { ek: 'flex-1' })}
            >
              {gonderiliyor ? 'Kaydediliyor…' : vitrinKaydi ? 'Vitrin kartını güncelle' : 'Vitrine çıkar'}
            </button>
          </div>

          {vitrinKaydi && (
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={kaldir}
                disabled={gonderiliyor}
                className={dugme('yikici', { tamGenislik: true })}
              >
                Vitrinden kaldır
              </button>
              <p className="metin-yardimci text-slate-500 mt-2 text-center">
                Kaydınız silinmiyor; araç yalnızca pazaryerinde görünmez oluyor.
              </p>
            </div>
          )}
        </section>
      </div>

      {paywallAcik && (
        <PaywallDialog
          urunKodu={URUNLER.vitrin.kod}
          onKapat={() => setPaywallAcik(false)}
          onSatinAl={() => {
            // Satın alma kaydını PaywallDialog kendisi üretiyor; burada
            // yalnızca tercih işaretleniyor. `listings_vitrin_denetle`
            // tetikleyicisi o kaydı arıyor — bu satır tek başına ayrıcalık
            // vermiyor.
            setOneCikar(true);
            setPaywallAcik(false);
          }}
        />
      )}
    </div>
  );
}

function Kutu({ baslik, aciklama, children }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <h1 className="baslik-bolum text-slate-900">{baslik}</h1>
        <p className="metin-yardimci text-slate-500">{aciklama}</p>
        <div className="flex flex-col sm:flex-row gap-2">{children}</div>
      </div>
    </div>
  );
}
