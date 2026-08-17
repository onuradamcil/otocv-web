// =========================================================================
// OTO-CV VİTRİN BİLEŞENİ: HIGH-PERFORMANCE WEB VİTRİNİ (MarketplaceView.jsx)
// İşlev: Performans optimizasyonlu süzgeç motoru, ferah sol sidebar, 
//        Arabam.com tarzı aksiyonlu hizmet barı ve kurumsal Vitrin Paneli.
// =========================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { favoriKimlikleri, favoriDegistir } from '../../services/favoriService';
import { fetchMarketplaceListings } from '../../services/marketplaceService';
import { useToast } from '../../context/ToastContext';
import { useRouter } from 'next/navigation';
import Icon from '../common/icons';
import { pinNormalize, pinBicimiMi } from '../../utils/pinUretici';
import GlobalStepLoader from '../common/GlobalStepLoader';
import AracGorseli from '../common/AracGorseli';
// Düğme sınıfları elle yazılmıyor: `dugme.js` dört seviyeyi ve 44 px dokunma
// alanını tek yerden veriyor. Bu dosya daha önce hepsini elle yazıyordu ve
// dokunma hedefleri standardın altına düşmüştü.
import { dugme } from '../common/dugme';

// =========================================================================
// SÜZGEÇ ARAYÜZ PARÇALARI
//
// Dört seçenek grubu (marka, şehir, yakıt, vites) birebir aynı davranışı
// taşıyor. Elle kopyalamak, birinde `aria-pressed` unutulup diğerlerinde
// kalması gibi sessiz farklar üretiyor — bu dosyada zaten olan şey buydu:
// masaüstü çipleri bir duruma, mobil çipleri başka bir duruma yazıyordu.
// =========================================================================

/** Sayılı tek satır seçenek (radyo davranışı: biri seçili). */
function SuzgecSatiri({ etiket, adet, secili, sec }) {
  return (
    <button
      type="button"
      onClick={sec}
      aria-pressed={secili}
      className={`w-full min-h-[44px] px-2.5 rounded-xl cursor-pointer flex justify-between items-center gap-2 text-left transition-colors ${
        secili ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="metin-yardimci font-semibold truncate">{etiket}</span>
      <span className="metin-yardimci text-slate-600 tabular-nums shrink-0">({adet})</span>
    </button>
  );
}

/** Aç/kapa süzgeci. Durum yalnızca renkle değil, onay işaretiyle de anlatılıyor. */
function SuzgecAnahtari({ etiket, adet, acik, degistir }) {
  return (
    <button
      type="button"
      onClick={degistir}
      aria-pressed={acik}
      className={`w-full min-h-[44px] px-2.5 rounded-xl cursor-pointer flex items-center gap-2 text-left transition-colors ${
        acik ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {/* ⚠ Kutu, durumu RENKTEN BAĞIMSIZ anlatıyor: renk körü kullanıcı ve
          gri tonlamalı baskıda ayırt edici olan bu (projede yerleşik kural). */}
      <span
        aria-hidden="true"
        className={`w-4 h-4 rounded border grid place-items-center shrink-0 ${
          acik ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
        }`}
      >
        {acik && <Icon name="onay" size="xs" strokeWidth={3} />}
      </span>
      <span className="metin-yardimci font-semibold flex-1 truncate">{etiket}</span>
      <span className="metin-yardimci text-slate-600 tabular-nums shrink-0">({adet})</span>
    </button>
  );
}

/** Masaüstü kenar çubuğu seçenek grubu. Seçenek yoksa grup HİÇ çizilmiyor. */
function SuzgecGrubu({ baslik, secenekler, tumuAdet, secili, sec }) {
  // Projede yerleşik kural: veri yoksa bölüm çizilmiyor. Tek seçeneği olan
  // bir süzgeç de süzmüyor — yalnızca yer kaplıyor.
  if (!secenekler || secenekler.length < 2) return null;

  return (
    <div className="space-y-1.5 pt-3 border-t border-slate-100">
      <span className="etiket text-slate-500 block">{baslik}</span>
      <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto pr-1">
        <SuzgecSatiri etiket="Tümü" adet={tumuAdet} secili={secili === 'Tümü'} sec={() => sec('Tümü')} />
        {secenekler.map(([ad, adet]) => (
          <SuzgecSatiri key={ad} etiket={ad} adet={adet} secili={secili === ad} sec={() => sec(ad)} />
        ))}
      </div>
    </div>
  );
}

/** Dar ekran çipi. */
function SuzgecCipi({ etiket, secili, sec }) {
  return (
    <button
      type="button"
      onClick={sec}
      aria-pressed={secili}
      className={`shrink-0 min-h-[44px] px-3.5 rounded-xl text-yardimci font-semibold border transition-colors cursor-pointer ${
        secili ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
    >
      {etiket}
    </button>
  );
}

/** Dar ekran seçenek grubu — çip olarak sarmalı. */
function MobilGrup({ baslik, secenekler, secili, sec }) {
  if (!secenekler || secenekler.length < 2) return null;
  return (
    <div className="pt-2 border-t border-slate-100 space-y-1.5">
      <span className="etiket text-slate-500 block">{baslik}</span>
      <div className="flex flex-wrap gap-1.5">
        <SuzgecCipi etiket="Tümü" secili={secili === 'Tümü'} sec={() => sec('Tümü')} />
        {secenekler.map(([ad, adet]) => (
          <SuzgecCipi key={ad} etiket={`${ad} (${adet})`} secili={secili === ad} sec={() => sec(ad)} />
        ))}
      </div>
    </div>
  );
}

export default function MarketplaceView({ 
  onSelectVehicle, 
  onNavigateToGarage, 
  onNavigateToVerify, 
  onNavigateToInsurance, 
  onNavigateToMaintenance,
  // `onOpenCreateListingModal` KALDIRILDI: `page.js` geçiyordu ama bu bileşen
  // hiç çağırmıyordu. Sihirbaza anasayfadan giden yol Header ve MobileDrawer
  // üzerinden; ölü bir prop, olmayan bir yolu varmış gibi gösteriyordu.
}) {
  const toast = useToast();
  // =========================================================================
  // 1. BLOK: REAKTİF VERİ VE FİLTRE HAFIZASI
  // =========================================================================
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // `selectedBrand` ve `quickFilter` KALDIRILDI: ikisi de yalnızca hiç
  // çizilmeyen `filteredListings` içinde okunuyordu. Süzgeç durumu artık tek
  // bir `suzgec` nesnesinde (aşağıda).
  const [showAllVitrin, setShowAllVitrin] = useState(false);

  // =========================================================================
  // SÜZGEÇ DURUMU — İLAN SİTESİ ALANLARI ÇIKTI, SİCİL ALANLARI GİRDİ
  //
  // Eski hâlinde `minPrice/maxPrice/minKm/maxKm` vardı ve DÖRDÜ DE ÖLÜYDÜ:
  // hiçbir girdiye bağlı değillerdi. Fiyat süzgeci bilinçli kaldırılmıştı
  // (ürün araç tutarı göstermiyor) ama state'i kalmıştı.
  //
  // Yeni alanların hepsi `vitrin_listesi` RPC'sinin BUGÜN döndürdüğü
  // sütunlardan: brand, year, city, fuel_type, transmission, trust_score.
  //
  // ⚠ HASAR BEYANI SÜZGECİ BİLİNÇLİ OLARAK YOK. RPC yalnızca
  // `tramer_amount` döndürüyor, `tramer_status` döndürmüyor. Tutar 0 ya da
  // boş olduğunda bu "hasar yok" mu "beyan edilmemiş" mi belli değil —
  // `tramerHelper.js` tam bu ayrımı korumak için yazıldı. İkisini aynı
  // kovaya atan bir süzgeç, beyan vermemiş aracı "hasarsız" göstermek
  // olurdu. Alan RPC'ye eklenene kadar bu süzgeç açılmıyor.
  // =========================================================================
  const [suzgec, setSuzgec] = useState({
    marka: 'Tümü',
    sehir: 'Tümü',
    yakit: 'Tümü',
    vites: 'Tümü',
    yilMin: '',
    yilMax: '',
    sicilEnAz: 0,
    yalnizOneCikan: false,
  });

  useEffect(() => {
    loadLiveListings();
  }, []);

  // Favoriler ayrı çekiliyor: vitrin listesi oturumsuz da görünüyor, favori
  // ise oturuma bağlı. İkisini tek sorguya bağlamak listeyi oturum
  // gerektirir hâle getirirdi.
  const router = useRouter();
  // Dar ekranda süzgeç panelinin açık/kapalı durumu.
  const [suzgecAcik, setSuzgecAcik] = useState(false);
  const [favoriler, setFavoriler] = useState(() => new Set());

  useEffect(() => {
    let iptal = false;
    favoriKimlikleri().then((k) => { if (!iptal) setFavoriler(k); });
    return () => { iptal = true; };
  }, []);

  const favoriTikla = async (pin) => {
    if (!pin) return;
    const suAn = favoriler.has(pin);

    // İYİMSER GÜNCELLEME: kalp anında dönüyor. Ağ yanıtını beklemek, tek
    // tıklık bir işlemi yavaş hissettiriyor. Hata gelirse geri alınıyor.
    setFavoriler((önceki) => {
      const yeni = new Set(önceki);
      if (suAn) yeni.delete(pin); else yeni.add(pin);
      return yeni;
    });

    const { favorili, hata } = await favoriDegistir(pin, suAn);

    setFavoriler((önceki) => {
      const yeni = new Set(önceki);
      if (favorili) yeni.add(pin); else yeni.delete(pin);
      return yeni;
    });

    if (hata) toast.hata(hata);
  };

  const loadLiveListings = async () => {
    try {
      setLoading(true);
      const result = await fetchMarketplaceListings();
      if (result.success) {
        setListings(result.data || []);
      }
    } catch (error) {
      console.error("Vitrin yüklenirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  const suzgecDegistir = (alan, deger) => {
    setSuzgec((onceki) => ({ ...onceki, [alan]: deger }));
  };

  const suzgecleriSifirla = () => {
    setSearchQuery('');
    setShowAllVitrin(false);
    setSuzgec({
      marka: 'Tümü', sehir: 'Tümü', yakit: 'Tümü', vites: 'Tümü',
      yilMin: '', yilMax: '', sicilEnAz: 0, yalnizOneCikan: false,
    });
  };

  // =========================================================================
  // 2. BLOK: PERFORMANCE OPTIMIZED (useMemo) SÜZGEÇ ALGORİTMASI
  // =========================================================================
  
  // =========================================================================
  // ⚠ BURADAKİ HATA SAYFANIN TAMAMINI SÜSE ÇEVİRMİŞTİ.
  //
  // Eski `filteredListings` hesaplanıyor ama HİÇBİR YERDE ÇİZİLMİYORDU;
  // ızgara `displayedVitrinListings` basıyordu. Yani arama kutusu, marka
  // çipleri, yıl aralığı ve hızlı süzgeçler tıklanınca rengi değişiyor,
  // `aria-pressed` güncelleniyor — ve listede TEK KART değişmiyordu.
  //
  // Ayrıca eski koddaki `if (!isSearching && !item.is_featured) return false;`
  // satırı "kullanıcı süzerse vitrin dışı araçlar da çıksın" diye yazılmıştı
  // ama dizi render edilmediği için o dal HİÇ erişilemiyordu.
  //
  // -------------------------------------------------------------------------
  // NİYE AYRI YÜKLEMLER, NİYE TEK BÜYÜK KOŞUL DEĞİL
  // -------------------------------------------------------------------------
  // Seçenek sayaçlarının DOĞRU olması için her süzgeci tek tek atlayabilmek
  // gerekiyor. Bir markanın yanındaki sayı, o markanın kendi süzgeci
  // uygulanmadan hesaplanmalı — yoksa seçili olmayan her marka "(0)" görünür
  // ve kullanıcı seçeneğin ölü olduğunu sanır. Bu, arama arayüzlerinde
  // "faceted count" denen yerleşik davranış.
  //
  // Eski kodda sayaçlar `listings` üzerinden, liste ise `is_featured`
  // üzerinden hesaplanıyordu: kenar çubuğu "Toyota (1)" yazarken ızgarada
  // hiç Toyota olmuyordu.
  // =========================================================================
  const kucuk = (s) => String(s || '').toLocaleLowerCase('tr-TR');

  const YUKLEMLER = useMemo(() => ({
    arama: (i, s, q) => {
      if (!q) return true;
      return [i.brand, i.model, i.series, i.listing_title, i.city, i.pin_code]
        .some((alan) => kucuk(alan).includes(q));
    },
    marka: (i, s) => s.marka === 'Tümü' || i.brand === s.marka,
    sehir: (i, s) => s.sehir === 'Tümü' || i.city === s.sehir,
    yakit: (i, s) => s.yakit === 'Tümü' || i.fuel_type === s.yakit,
    vites: (i, s) => s.vites === 'Tümü' || i.transmission === s.vites,
    yil: (i, s) => {
      const y = Number(i.year) || 0;
      if (s.yilMin && y < Number(s.yilMin)) return false;
      if (s.yilMax && y > Number(s.yilMax)) return false;
      return true;
    },
    sicil: (i, s) => (Number(i.trust_score) || 0) >= Number(s.sicilEnAz || 0),
    oneCikan: (i, s) => !s.yalnizOneCikan || i.is_featured === true,
  }), []);

  /**
   * Süzgeçleri uygular. `haric` verilen yüklem ATLANIR — faceted sayım için.
   * Sıralama: öne çıkanlar önce (ücreti ödenmiş görünürlük), sonra yeni olan.
   */
  const suz = useCallback((liste, s, q, haric) => {
    const gecenler = liste.filter((i) =>
      Object.entries(YUKLEMLER).every(([ad, f]) => ad === haric || f(i, s, q))
    );
    return gecenler.sort((a, b) => {
      // ⚠ ÖNE ÇIKARMA SIRALAMAYI BELİRLİYOR, GÖRÜNÜRLÜĞÜ ENGELLEMİYOR.
      // Eskiden `is_featured` kesin bir duvardı: öne çıkarma satın almamış
      // araç hiçbir koşulda anasayfada görünmüyordu. Artık ödenmiş öne
      // çıkarma sırada öne geçiriyor, ama süzgeç sonucundaki diğer araçlar
      // da listeleniyor.
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [YUKLEMLER]);

  const aramaSorgusu = kucuk(searchQuery).trim();

  /** Ekranda basılan liste. Artık TEK kaynak bu. */
  const sonuclar = useMemo(
    () => suz(listings, suzgec, aramaSorgusu),
    [suz, listings, suzgec, aramaSorgusu]
  );

  /** Öne çıkanların sayısı — vitrin şeridinin başlığı için. */
  const oneCikanSayisi = useMemo(
    () => listings.filter((i) => i.is_featured === true).length,
    [listings]
  );

  /**
   * Seçenek listeleri ve GERÇEK sayaçları.
   * Her seçenek grubu kendi süzgeci hariç tutularak sayılıyor.
   */
  const secenekler = useMemo(() => {
    const grupla = (haric, alanAdi) => {
      const kume = suz(listings, suzgec, aramaSorgusu, haric);
      const sayac = new Map();
      for (const i of kume) {
        const d = i[alanAdi];
        if (d === null || d === undefined || String(d).trim() === '') continue;
        sayac.set(d, (sayac.get(d) || 0) + 1);
      }
      return [...sayac.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'tr'));
    };

    const sicilKumesi = suz(listings, suzgec, aramaSorgusu, 'sicil');
    const oneCikanKumesi = suz(listings, suzgec, aramaSorgusu, 'oneCikan');

    return {
      markalar: grupla('marka', 'brand'),
      sehirler: grupla('sehir', 'city'),
      yakitlar: grupla('yakit', 'fuel_type'),
      vitesler: grupla('vites', 'transmission'),
      // ⚠ BANTLAR SABİT DEĞİL, SAYILARI GERÇEK.
      // Eskiden tek bir "Güven Skoru (%80+)" çipi vardı ve veritabanındaki en
      // yüksek puan 72 olduğu için o çip bağlansa bile DAİMA 0 sonuç verirdi.
      // Şimdi her bandın yanında kaç araç olduğu yazıyor: "80+ (0)" dürüst
      // bir bilgi, sabit "%80+" ise yanıltmaydı.
      sicilBantlari: [0, 40, 60, 80].map((esik) => ({
        esik,
        adet: sicilKumesi.filter((i) => (Number(i.trust_score) || 0) >= esik).length,
      })),
      oneCikanAdet: oneCikanKumesi.filter((i) => i.is_featured === true).length,
      tumuAdet: suz(listings, suzgec, aramaSorgusu, 'marka').length,
    };
  }, [suz, listings, suzgec, aramaSorgusu]);

  /** Herhangi bir süzgeç etkin mi? "Sıfırla" ve boş durum metni için. */
  const suzgecEtkin = aramaSorgusu !== ''
    || suzgec.marka !== 'Tümü' || suzgec.sehir !== 'Tümü'
    || suzgec.yakit !== 'Tümü' || suzgec.vites !== 'Tümü'
    || suzgec.yilMin !== '' || suzgec.yilMax !== ''
    || Number(suzgec.sicilEnAz) > 0 || suzgec.yalnizOneCikan;

  const gosterilenler = showAllVitrin ? sonuclar : sonuclar.slice(0, 12);

  // =========================================================================
  // 3. BLOK: ARAYÜZ RENDER KATMANI (DESKTOP WEB ENTERPRISE)
  // =========================================================================
  return (
    <div className="animate-fadeIn min-h-screen bg-[#F8FAFC] pb-16">
      
      {/* 3.1 HERO BANNER */}
      <div className="bg-[#0F172A] text-white py-8 px-4 border-b border-slate-800 select-none">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          {/* "Güvenle Satın Alın" KALKTI: satış sitesi başlığıydı. Ürünün
              vaadi aracı satmak değil, geçmişini belgelemek. */}
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-100">
            Aracın Geçmişini Bilin, Kararınızı Belgeyle Verin
          </h1>
          
          {/* ARAMA — PIN ARTIK GERÇEKTEN İŞLENİYOR.
              Yer tutucu "PIN kodu ile ara" diyordu ama girdi yalnızca vitrin
              listesini süzüyordu: PIN yazan kullanıcı hiçbir sonuç almıyor ve
              sitenin çalışmadığını sanıyordu. Vaat edip yapmamak, hiç
              vaat etmemekten kötü.

              Artık girdi PIN desenine uyuyorsa doğrudan karneye gidiliyor;
              uymuyorsa liste süzülüyor. `pinNormalize` alfabe dışı karakteri
              zaten reddediyor, yani marka adı yanlışlıkla PIN sanılmıyor. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // ⚠ ESKİDEN HER GİRDİ KARNEYE GİDİYORDU.
              //
              // `pinNormalize("bmw")` -> `CV-BMW` ve kod bunu geçerli sayıp
              // `/karne/CV-BMW`'ye yönlendiriyordu: marka arayan kullanıcı
              // VAR OLMAYAN bir karne sayfasına düşüyordu. Türkçe karakter
              // girildiğinde ise boş dönüyor ve Enter hiçbir şey yapmıyordu.
              //
              // Artık soru ayrı soruluyor: girdi gerçekten PIN biçiminde mi?
              // Değilse liste zaten yazarken süzülüyor (`sonuclar`), yani
              // Enter'ın yapacak işi yok — kullanıcı sonucu önünde görüyor.
              if (pinBicimiMi(searchQuery)) {
                const pin = pinNormalize(searchQuery);
                if (pin) router.push(`/karne/${encodeURIComponent(pin)}`);
              }
            }}
            className="max-w-2xl mx-auto bg-white p-1 rounded-xl border border-slate-700 shadow-lg flex items-center gap-2"
          >
            <div className="text-slate-500 pl-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Marka, model, şehir veya PIN ile ara"
              placeholder="Marka, model, şehir veya PIN kodu ile ara..."
              className="w-full bg-transparent border-none outline-none text-sm text-slate-900 font-semibold placeholder:text-slate-500 placeholder:font-normal pl-0.5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Aramayı temizle"
                className="w-8 h-8 grid place-items-center rounded-md text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Icon name="kapat" size="sm" />
              </button>
            )}
            {/* `min-h-[44px]`: eskiden 40 px idi, `dugme.js`'in ilan ettiği
                WCAG dokunma alanı asgarisinin altındaydı. */}
            {/* ⚠ BURAYA `odak-acik` EKLENDİ VE GERİ ALINDI — NOT DURUYOR Kİ
                AYNI HATA TEKRAR YAPILMASIN.
                Ölçümde "odak halkası (indigo #4f46e5) koyu hero zemininde
                2.84:1" çıkmıştı ve eşik 3.0 olduğu için düzeltilmesi gerektiği
                düşünülmüştü. Yanlış çıkarımdı:

                · Koyu hero zemininde ODAKLANABİLİR HİÇBİR ÖGE YOK. Koyu alanda
                  yalnızca `h1` duruyor; arama formu BEYAZ bir kutu.
                · `outline-offset: 2px` halkayı ögenin DIŞINA taşıyor. Bu koyu
                  düğmenin dışı, formun beyaz dolgusu — yani halka beyaz zemine
                  düşüyor. Beyaz halka orada 1.00:1 ölçüldü, yani GÖRÜNMEZ.

                Doğru davranış varsayılanı bırakmak: indigo halka beyaz zeminde
                6.29:1. `odak-acik` yalnızca gerçekten koyu bir zemin ÜZERİNDE
                duran odaklanabilir öge çıkarsa kullanılmalı. */}
            <button type="submit" className="bg-[#0F172A] hover:bg-slate-800 text-white text-yardimci font-semibold px-5 min-h-[44px] rounded-xl transition-colors shrink-0 cursor-pointer">
              Ara
            </button>
          </form>
        </div>
      </div>

      {/* 3.2 ANA MİZANPAJ (ÇİFT SÜTUN LU) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SOL SIDEBAR: HIZLI RADAR & FİLTRELER */}
          {/* KENAR ÇUBUĞU — DAR EKRANDA GİZLİ.
              Izgara `grid-cols-1 lg:grid-cols-12` olduğu için 1024px altında
              TEK SÜTUNA düşüyordu ve kenar çubuğu tam genişlik olup listenin
              üstünü baştan aşağı kaplıyordu: kullanıcı araçları görmek için
              tüm süzgeçleri kaydırmak zorundaydı.

              Eşik `lg` (1024px): tablet dikey ve altı için yatay süzgeç
              şeridi, üstünde klasik kenar çubuğu. Eşiği daha aşağı çekmek
              (md = 768px) kenar çubuğunu okunamayacak kadar daraltıyordu. */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5 select-none">
            
            {/* =================================================================
                SÜZGEÇLER — ARTIK GERÇEKTEN SÜZÜYOR.
                Eski hâlinde bu kutucukların hiçbiri listeyi etkilemiyordu
                (gerekçe yukarıda, `suz` fonksiyonunun başında).

                Başlık `h2`: sayfada h1'den sonraki ilk seviye burası.
                Eskiden `h4` idi ve belge sırası h1 -> h4 diye atlıyordu.
                ================================================================= */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <h2 className="baslik-kart text-slate-900">Süzgeçler</h2>
                {suzgecEtkin && (
                  <button
                    type="button"
                    onClick={suzgecleriSifirla}
                    className={dugme('sessiz', { ek: 'min-h-[44px] px-2 -mx-2 text-indigo-600' })}
                  >
                    Sıfırla
                  </button>
                )}
              </div>

              {/* ÖNE ÇIKANLAR — ücreti ödenmiş görünürlük. Kapatılabilir bir
                  süzgeç, kesin bir duvar değil. */}
              <SuzgecAnahtari
                etiket="Yalnızca öne çıkanlar"
                adet={secenekler.oneCikanAdet}
                acik={suzgec.yalnizOneCikan}
                degistir={() => suzgecDegistir('yalnizOneCikan', !suzgec.yalnizOneCikan)}
              />

              {/* SİCİL PUANI — sabit "%80+" yerine bantlar ve GERÇEK sayılar. */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <span className="etiket text-slate-500 block">Sicil Puanı</span>
                <div className="flex flex-col gap-0.5">
                  {secenekler.sicilBantlari.map(({ esik, adet }) => (
                    <SuzgecSatiri
                      key={esik}
                      etiket={esik === 0 ? 'Tümü' : `${esik} ve üzeri`}
                      adet={adet}
                      secili={Number(suzgec.sicilEnAz) === esik}
                      sec={() => suzgecDegistir('sicilEnAz', esik)}
                    />
                  ))}
                </div>
              </div>

              <SuzgecGrubu
                baslik="Marka"
                secenekler={secenekler.markalar}
                tumuAdet={secenekler.tumuAdet}
                secili={suzgec.marka}
                sec={(d) => suzgecDegistir('marka', d)}
              />

              <SuzgecGrubu
                baslik="Şehir"
                secenekler={secenekler.sehirler}
                tumuAdet={secenekler.tumuAdet}
                secili={suzgec.sehir}
                sec={(d) => suzgecDegistir('sehir', d)}
              />

              <SuzgecGrubu
                baslik="Yakıt"
                secenekler={secenekler.yakitlar}
                tumuAdet={secenekler.tumuAdet}
                secili={suzgec.yakit}
                sec={(d) => suzgecDegistir('yakit', d)}
              />

              <SuzgecGrubu
                baslik="Vites"
                secenekler={secenekler.vitesler}
                tumuAdet={secenekler.tumuAdet}
                secili={suzgec.vites}
                sec={(d) => suzgecDegistir('vites', d)}
              />

              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <span className="etiket text-slate-500 block">Model Yılı</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="sr-only">En eski model yılı</span>
                    <input
                      type="number" inputMode="numeric" placeholder="En eski"
                      value={suzgec.yilMin}
                      onChange={(e) => suzgecDegistir('yilMin', e.target.value)}
                      className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-yardimci outline-none focus:border-indigo-600"
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">En yeni model yılı</span>
                    <input
                      type="number" inputMode="numeric" placeholder="En yeni"
                      value={suzgec.yilMax}
                      onChange={(e) => suzgecDegistir('yilMax', e.target.value)}
                      className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-yardimci outline-none focus:border-indigo-600"
                    />
                  </label>
                </div>
              </div>

            </div>

          </aside>

          {/* SAĞ SAHA: HOVER AKSIYONLU HİZMET BAR & VİTRİN */}
          <section className="lg:col-span-9 space-y-6">

            {/* DAR EKRAN SÜZGEÇ ŞERİDİ — yalnızca lg altında.
                Kenar çubuğunun tamamını dikey olarak listenin üstüne yığmak
                yerine, en çok kullanılan üç hızlı süzgeç yatay kaydırılabilir
                çip olarak duruyor. Marka ve yıl süzgeçleri "Filtreler"
                düğmesiyle açılıyor; kapalıyken hiç yer kaplamıyor.

                Yatay kaydırma bilerek: mobilde çipleri alt satıra sarmak
                şeridin yüksekliğini iki-üç katına çıkarıyor ve yine listeyi
                aşağı itiyordu. */}
            <div className="lg:hidden space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {/* ⚠ ÇİPLER ARTIK GERÇEKTEN SÜZÜYOR.
                    Eskiden `quickFilter` yazıyorlardı ve o durum yalnızca
                    çizilmeyen `filteredListings` içinde okunuyordu: çip
                    yanıyor, liste değişmiyordu.

                    "Güven %80+" çipi de kaldırıldı — veritabanındaki en yüksek
                    puan 72 olduğu için bağlansa bile daima boş sonuç verirdi.
                    Yerine sayılı bantlar "Filtreler" panelinde. */}
                <SuzgecCipi
                  etiket={`Öne çıkanlar (${secenekler.oneCikanAdet})`}
                  secili={suzgec.yalnizOneCikan}
                  sec={() => suzgecDegistir('yalnizOneCikan', !suzgec.yalnizOneCikan)}
                />
                {secenekler.markalar.slice(0, 4).map(([ad, adet]) => (
                  <SuzgecCipi
                    key={ad}
                    etiket={`${ad} (${adet})`}
                    secili={suzgec.marka === ad}
                    sec={() => suzgecDegistir('marka', suzgec.marka === ad ? 'Tümü' : ad)}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setSuzgecAcik((a) => !a)}
                  aria-expanded={suzgecAcik}
                  className={`shrink-0 min-h-[44px] px-3.5 rounded-xl text-yardimci font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ml-auto ${
                    suzgecAcik ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Filtreler
                  <svg className={`w-3 h-3 transition-transform ${suzgecAcik ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {suzgecAcik && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 motion-safe:animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="etiket text-slate-500">Sicil Puanı</span>
                    {suzgecEtkin && (
                      <button
                        type="button"
                        onClick={suzgecleriSifirla}
                        className={dugme('sessiz', { ek: 'min-h-[44px] px-2 -mx-2 text-indigo-600' })}
                      >
                        Sıfırla
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {secenekler.sicilBantlari.map(({ esik, adet }) => (
                      <SuzgecCipi
                        key={esik}
                        etiket={esik === 0 ? `Tümü (${adet})` : `${esik}+ (${adet})`}
                        secili={Number(suzgec.sicilEnAz) === esik}
                        sec={() => suzgecDegistir('sicilEnAz', esik)}
                      />
                    ))}
                  </div>

                  <MobilGrup baslik="Marka" secenekler={secenekler.markalar}
                    secili={suzgec.marka} sec={(d) => suzgecDegistir('marka', d)} />
                  <MobilGrup baslik="Şehir" secenekler={secenekler.sehirler}
                    secili={suzgec.sehir} sec={(d) => suzgecDegistir('sehir', d)} />
                  <MobilGrup baslik="Yakıt" secenekler={secenekler.yakitlar}
                    secili={suzgec.yakit} sec={(d) => suzgecDegistir('yakit', d)} />
                  <MobilGrup baslik="Vites" secenekler={secenekler.vitesler}
                    secili={suzgec.vites} sec={(d) => suzgecDegistir('vites', d)} />

                  <div className="pt-2 border-t border-slate-100">
                    <span className="etiket text-slate-500">Model Yılı</span>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <label className="block">
                        <span className="sr-only">En eski model yılı</span>
                        <input type="number" inputMode="numeric" placeholder="En eski"
                          value={suzgec.yilMin}
                          onChange={(e) => suzgecDegistir('yilMin', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 min-h-[44px] text-yardimci outline-none focus:border-indigo-600" />
                      </label>
                      <label className="block">
                        <span className="sr-only">En yeni model yılı</span>
                        <input type="number" inputMode="numeric" placeholder="En yeni"
                          value={suzgec.yilMax}
                          onChange={(e) => suzgecDegistir('yilMax', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 min-h-[44px] text-yardimci outline-none focus:border-indigo-600" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            
            {/* =====================================================================
                HİZMET ŞERİDİ — BEŞ KART, HOVER'DA YÜKSELEN

                Bu şerit bir ara hiyerarşik bir düzene (bir baskın + üç
                yardımcı) çevrilmişti; geri alındı. Beş eşit kart ürün
                sahibinin tercihi ve şeridin işi bir eylemi dayatmak değil,
                platformun beş kapısını aynı anda göstermek.

                TEK REVİZYON — ÇİFT KAPI KAPATILDI:
                Eski beşlide "Künye Sorgula" ve "Sicil Sorgula" kartlarının
                İKİSİ de `onNavigateToVerify`e gidiyordu; kullanıcıya iki
                kapı gösterip tek odaya çıkarıyordu. PIN sorgusu tek kartta
                birleşti, boşalan yere gerçek ve ayrı bir iş kondu: araç
                devri (`/devir`).

                Kartlar `<button>`; `<div onClick>` klavyeyle kullanılamıyor.
                Yükselme efekti `motion-reduce` ile kapanıyor — hareket
                duyarlılığı olan kullanıcı için sektör standardı.
            ===================================================================== */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs select-none">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  {
                    ad: 'Tescilli Garajım', ozet: 'Ruhsatlı araçlarınızı ve geçmişi yönetin.',
                    eylem: 'Garajıma Git', ikon: 'arac', tik: onNavigateToGarage,
                    kabart: 'bg-blue-600', yazi: 'group-hover:text-blue-600',
                    alt: 'text-blue-600 border-blue-600',
                  },
                  {
                    ad: 'Sicil Sorgula', ozet: 'PIN ile aracın karnesini ve geçmişini açın.',
                    eylem: 'Sorgulama Yap', ikon: 'pinKod', tik: onNavigateToVerify,
                    kabart: 'bg-rose-600', yazi: 'group-hover:text-rose-600',
                    alt: 'text-rose-600 border-rose-600',
                  },
                  {
                    // ⚠ "Canlı poliçe tekliflerini karşılaştırın" İDİ.
                    // Canlı teklif yok, anlaşmalı sigorta ortağı da yok:
                    // kart bugün tutulamayan bir vaat veriyordu. Kart
                    // KALDIRILMADI — hedef onu doldurmak; ama vaat, ekranın
                    // bugün yapabildiğine çekildi.
                    ad: 'Sigorta & Kasko', ozet: 'Poliçe tarihlerinizi takip edin, yenilemeyi kaçırmayın.',
                    eylem: 'Süreleri Gör', ikon: 'kalkan', tik: onNavigateToInsurance,
                    kabart: 'bg-slate-800', yazi: 'group-hover:text-slate-900',
                    alt: 'text-slate-900 border-slate-900',
                  },
                  {
                    // ⚠ EYLEM "Randevu Al" İDİ VE RANDEVU ALINAMIYORDU.
                    // Kart `/maintenance-planner`a gidiyordu, orası da
                    // `ComingSoon` yer tutucusuydu. Sigorta kartındaki
                    // ölü kapının aynısı. Rota gerçek ekran oldu; eylem
                    // adı da ekranın gerçekten yaptığı işe çekildi.
                    ad: 'Bakım Takvimi', ozet: 'Servis geçmişinizi görün, kayıt ekledikçe sicil puanı yükselsin.',
                    // Eskiden burada da `anahtar` vardı ve devir kartıyla
                    // aynı ikonu paylaşıyordu. Takvim işi takvim ikonu,
                    // anahtar ise devrin kendisi.
                    eylem: 'Bakımları Gör', ikon: 'takvim', tik: onNavigateToMaintenance,
                    kabart: 'bg-slate-500', yazi: 'group-hover:text-slate-700',
                    alt: 'text-slate-700 border-slate-700',
                  },
                  {
                    // "AI Değerleme" bu sırada duruyordu ve tıklanınca yalnızca
                    // "yakında" bildirimi basıyordu; ayrıca araç değeri
                    // göstermek platformu satış sitesi konumuna sokuyordu.
                    // Yerine gelen "Sicil Sorgula" ise 2. kartın kopyasıydı.
                    // Şimdi burada gerçekten ayrı bir iş var.
                    ad: 'Araç Devir', ozet: 'Sicili yeni sahibine devredin.',
                    eylem: 'Devri Başlat', ikon: 'anahtar', tik: () => router.push('/devir'),
                    kabart: 'bg-indigo-600', yazi: 'group-hover:text-indigo-600',
                    alt: 'text-indigo-600 border-indigo-500',
                  },
                ].map((k, i) => (
                  <button
                    key={k.ad}
                    type="button"
                    onClick={k.tik}
                    className={`bg-white border border-slate-200/90 rounded-md p-3 transition-all duration-200
                      hover:-translate-y-1 hover:shadow-md hover:border-slate-300
                      motion-reduce:transition-none motion-reduce:hover:translate-y-0
                      cursor-pointer group flex flex-col justify-between min-h-[110px] text-left w-full
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600
                      ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
                  >
                    <div>
                      <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center mb-2 shadow-xs ${k.kabart}`}>
                        <Icon name={k.ikon} size="sm" />
                      </div>
                      {/* `h3`: bölüm başlığı `h2`, kart başlıkları onun altı.
                          Eskiden `h4` idi ve sayfada hiç `h2`/`h3` olmadığı için
                          belge sırası h1 -> h4 diye atlıyordu. */}
                      <h3 className={`baslik-kart text-slate-900 transition-colors ${k.yazi}`}>
                        {k.ad}
                      </h3>
                      {/* `.metin-yardimci` (12px) — keyfi bir piksel değeri
                          DEĞİL. Burada 10px vardı; bunlar ETİKET değil CÜMLE
                          ve projedeki ölçekte 10px (`.etiket`) yalnızca büyük
                          harfli kısa etiketler için. Arada 11px denendi ama o
                          da ölçeğin dışında kalıyordu: keyfi değerler zaten
                          tipografi ölçeğinin çözmek için var olduğu sorun. */}
                      <p className="metin-yardimci text-slate-500 font-normal leading-snug mt-0.5">
                        {k.ozet}
                      </p>
                    </div>
                    <div /* `opacity-80` kaldırıldı: eşik altı kontrast üretiyordu. Fare vurgusu
                           zaten alt çizgi ve kart gölgesiyle veriliyor. */
                      className={`mt-2 text-etiket font-bold border-b-2 w-max transition-all ${k.alt}`}>
                      {k.eylem} &gt;
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 🚀 3.3 VİTRİN ALANI VE YENİLENMİŞ VİTRİN PANEL HEADER'I */}
            <div className="space-y-4">
              
              {/* Başlık `h2`: belge sırası h1 -> h2 -> h3 olarak akıyor.
                  Eskiden `h3` idi ve ana içerikte hiç `h2` yoktu; sayfa
                  h1'den h4'e atlıyordu (projenin kendi kuralı bunu yasaklıyor,
                  Footer.jsx:16-20).

                  Sayaç GERÇEK sonuç sayısını gösteriyor: süzgeç uygulandığında
                  başlık da onu yansıtıyor, yoksa kullanıcı listenin süzülüp
                  süzülmediğini anlayamıyor. */}
              <div className="flex justify-between items-baseline gap-3 pb-2 border-b border-slate-200 select-none mb-3">
                <h2 className="baslik-bolum text-slate-900">
                  {suzgecEtkin ? 'Süzgeç sonuçları' : 'Vitrindeki Araçlar'}
                  <span className="metin-yardimci text-slate-500 font-normal ml-2 tabular-nums">
                    ({sonuclar.length})
                  </span>
                </h2>

                {sonuclar.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVitrin(!showAllVitrin)}
                    className={dugme('sessiz', { ek: 'shrink-0' })}
                  >
                    {showAllVitrin ? 'Daha az göster' : 'Tümünü göster'}
                  </button>
                )}
              </div>

              {/* İLAN LİSTELEME GRİDİ */}
              {loading ? (
                /* Vitrin kart izgarasi bekleniyor -> kart iskeleti. */
                <GlobalStepLoader mode="iskelet" varyant="kart" kapsayici={false} baslik={false} adet={6} />
              ) : gosterilenler.length === 0 ? (
                /* ⚠ BOŞ DURUM İKİ AYRI ŞEY OLABİLİR VE İKİSİ AYNI CÜMLEYİ
                   HAK ETMİYOR. Eskiden tek metin vardı ve "vitrinde araç yok"
                   diyordu — süzgeçle daraltıp sonuç bulamayan kullanıcı da
                   bunu görüyor, vitrinin boş olduğunu sanıyordu. */
                <div className="py-16 flex flex-col items-center justify-center text-center gap-2 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                  <span className="text-slate-400" aria-hidden="true">
                    <Icon name="arac" size="2xl" />
                  </span>
                  {suzgecEtkin ? (
                    <>
                      <h3 className="baslik-kart text-slate-900">Bu süzgeçlerle araç bulunamadı</h3>
                      <p className="metin-yardimci text-slate-500">
                        Süzgeçleri gevşetip tekrar deneyin.
                      </p>
                      <button type="button" onClick={suzgecleriSifirla} className={dugme('ikincil')}>
                        Süzgeçleri sıfırla
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="baslik-kart text-slate-900">Vitrinde henüz araç yok</h3>
                      <p className="metin-yardimci text-slate-500">
                        Aracınızın sicilini vitrine çıkarıp görünür kılabilirsiniz.
                      </p>
                      <button type="button" onClick={onNavigateToGarage} className={dugme('ikincil')}>
                        Garajıma git
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* ARABAM.COM STYLE VİTRİN KARTLARI GRİDİ */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {gosterilenler.map((item, sira) => (
                    <ArabamStyleVitrinCard
                      key={item.listing_id || item.id}
                      item={item}
                      sira={sira}
                      onSelectVehicle={onSelectVehicle}
                      favorili={favoriler.has(item.pin_code)}
                      onFavori={favoriTikla}
                    />
                  ))}
                </div>
              )}
            </div>

          </section>

        </div>
      </div>

    </div>
  );
}

// =========================================================================
// 🚀 ARABAM.COM PIXEL-PERFECT VİTRİN KARTI (ArabamStyleVitrinCard)
// =========================================================================
function ArabamStyleVitrinCard({ item, sira = 0, onSelectVehicle, favorili = false, onFavori }) {
  const firstPhoto = item.image_url ? item.image_url.split(',')[0].trim() : null;

  return (
    // KART ARTIK `div` DEĞİL — KLAVYEYLE AÇILABİLİYOR.
    // Eskiden `<div onClick>` idi: fare olmadan hiçbir araca girilemiyordu.
    // Kalp ayrı bir düğme olduğu için kart `button` değil `article` +
    // içindeki başlık bağlantısı olmalıydı; ama mevcut düzeni bozmadan en
    // küçük doğru çözüm: karta `role="button"`, `tabIndex` ve klavye
    // işleyicisi vermek.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectVehicle(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectVehicle(item); }
      }}
      aria-label={`${item.brand || ''} ${item.model || ''} ${item.year || ''} — sicilini görüntüle`}
      className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-md overflow-hidden shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between select-none p-1.5 focus-visible:ring-offset-1"
    >
      <div className="h-36 w-full bg-[#F1F5F9] rounded flex items-center justify-center overflow-hidden shrink-0 relative">
        {/* FAVORİ — kartın kendi tıklamasını TETİKLEMEMELİ.
            `stopPropagation` olmadan kalbe basmak aracı da açardı. */}
        {onFavori && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFavori(item.pin_code); }}
            aria-pressed={!!favorili}
            aria-label={favorili ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            /* `w-11 h-11` = 44x44. Eskiden `w-9 h-9` (36 px) idi ve ölçümde
               dokunma alanı asgarisinin altında çıkıyordu — kalp, kartın
               üstünde parmakla en zor isabet edilen ögeydi. */
            className={`absolute top-1.5 right-1.5 z-10 w-11 h-11 grid place-items-center rounded-full bg-white/90 backdrop-blur-sm border transition-colors cursor-pointer ${
              favorili
                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                : 'border-slate-200 text-slate-500 hover:text-rose-500 hover:border-rose-200'
            }`}
          >
            {/* `dolu`: durum yalnızca RENKLE anlatılmıyor. Renk körü
                kullanıcı dolu/boş farkını biçimden görüyor. */}
            <Icon name="kalp" size="md" dolu={!!favorili} />
          </button>
        )}
        {/* `sizes` ızgaranın GERÇEK ölçüsünden türetildi
            (`grid-cols-2 sm:3 md:4 xl:5`, içerik alanı 9/12). Yanlış bir `sizes`
            iyileştirmenin tüm kazancını yok eder: tarayıcı gereğinden büyük
            kopyayı indirir ve `<img>` hâline göre hiçbir şey değişmez. */}
        {/* ⚠ İLK İKİ KARTA `priority` — ÖLÇÜMLE GELDİ, TAHMİNLE DEĞİL.
            Tam suite koşumunda Next şu uyarıyı bastı: bu kovadaki bir görsel
            anasayfada "Largest Contentful Paint" olarak algılandı. Yani
            sayfanın hızını belirleyen öge vitrin kartının fotoğrafı ve
            tembel yükleniyordu.

            Niye 2 ve niye hepsi değil: ızgara dar ekranda 2 sütun, yani ilk
            satır iki kart. LCP mobilde ölçülüyor ve Core Web Vitals'ta
            değerlendirilen profil o. Beş sütunun tamamına `priority` vermek
            "her şey öncelikli" demek olurdu — Next bunu da uyarıyor ve
            öncelik anlamını yitiriyor. */}
        <AracGorseli
          src={firstPhoto}
          alt={`${item.brand || ''} ${item.model || ''}`.trim()}
          priority={sira < 2}
          sizes="(max-width: 639px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, (max-width: 1279px) 18vw, 170px"
        />
        {/* Not: görsel yokluğunda "GÖRSEL YOK" durumu artık `AracGorseli`
            içinde basılıyor — aynı metin, tek yerde. */}
      </div>
      
      <div className="pt-2 px-1 pb-1 flex-1 flex flex-col justify-between bg-white">
        <div className="space-y-1">
          {/* ⚠ `|| 'Ankara'` KALDIRILDI — UYDURMA VERİYDİ.
              Şehri boş olan HER araca her ziyaretçiye "Ankara" basılıyordu.
              Bu, projede daha önce temizlenen `'Aksaray, Merkez'` vakasının
              birebir aynısı; o tarama burayı atlamış.

              Kural: veri yoksa alan çizilmiyor. Boş bir yer, uydurma bir
              yerden iyidir. */}
          <div className="flex justify-between items-center gap-2 metin-yardimci font-semibold text-slate-900">
            <span className="truncate">{item.city || ''}</span>
            {item.year && <span className="tabular-nums shrink-0">{item.year}</span>}
          </div>

          {/* `h3`: vitrin bölümünün başlığı `h2`, kartlar onun altı. */}
          <h3 className="metin-yardimci text-slate-700 leading-snug line-clamp-2 min-h-[32px]">
            {item.listing_title || `${item.brand} ${item.model} ${item.package || ''}`}
          </h3>
        </div>

        <div className="mt-2 bg-slate-50 border border-slate-200/80 rounded px-2 py-1 flex items-center justify-between">
          <span className="text-etiket text-slate-500 font-medium">Güven Karne Skoru</span>
          <span className="text-yardimci font-bold text-indigo-600">{item.trust_score ?? 0}/100</span>
        </div>

        {/* ⚠ TUTAR GÖSTERİLMİYOR — HUKUKİ.
            Ürüne ait herhangi bir fiyat, platformu satış sitesi konumuna
            sokuyor. Bu ürün dijital taşıt sicili. Kartın vurgusu bedel
            değil SİCİL: karne, kartın asıl vaadi. */}
        <div className="mt-2 flex items-center gap-1.5 text-yardimci font-bold text-indigo-600">
          <Icon name="karne" size="xs" />
          Sicil karnesini gör
        </div>
      </div>
    </div>
  );
}