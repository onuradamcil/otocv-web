// =========================================================================
// BAŞLIK ŞERİDİ ARAMASI (HeaderArama.jsx)
//
// -------------------------------------------------------------------------
// NİYE VAR — KOYU KAHRAMAN BLOĞU KALKTI
// -------------------------------------------------------------------------
// Arama kutusu anasayfadaki `#0F172A` kahraman bloğunun içindeydi. O blok
// ekranın üst üçte birini kaplıyor, sayfanın asıl işi olan araç ızgarasını
// aşağı itiyordu. Ürün sahibinin kararıyla blok kaldırıldı ve arama
// başlık şeridine taşındı — yani artık HER SAYFADA erişilebilir.
//
// -------------------------------------------------------------------------
// ⚠ MANTIK BİREBİR TAŞINDI, SADELEŞTİRİLMEDİ
// -------------------------------------------------------------------------
// Girdi PIN BİÇİMİNDEYSE doğrudan karneye, değilse arama ekranına gidiyor.
// Bu ayrım tarihsel bir hatanın onarımı ve korunması şart:
//
//   `pinNormalize("bmw")` -> `CV-BMW`
//
// Eski kod bunu geçerli sayıp `/karne/CV-BMW`'ye yönlendiriyordu; marka
// arayan kullanıcı VAR OLMAYAN bir karne sayfasına düşüyordu.
//
// -------------------------------------------------------------------------
// ⚠ `aria-label` DEĞİŞMEZ
// -------------------------------------------------------------------------
// Test paketi arama kutusunu `getByLabel(/PIN ile ara/i)` ile buluyor.
// Etiketi değiştirmek dört testi sessizce kırar.
//
// -------------------------------------------------------------------------
// ÖNERİ PANELİ
// -------------------------------------------------------------------------
// Kullanıcı yazdıkça marka/seri/model (sunucu) ve il/ilçe (istemci) önerisi
// çıkıyor; öneriye tıklamak hazır süzülmüş sonuç ekranına götürüyor.
//
// ⚠ ENTER'IN ESKİ DAVRANIŞI KORUNUYOR. Ok tuşuyla bir öneri SEÇİLMEDİYSE
// Enter eskisi gibi `/arama?q=…`e gidiyor. Bu bir konfor tercihi değil:
// `25-anasayfa.spec.js`teki dört test kutuya yazıp Enter'a basıyor ve o
// adresi bekliyor. Enter'ı "ilk öneriye git" yapmak dördünü birden kırardı.
//
// ⚠ OK TUŞUYLA GEZİNME BU PROJEDE YENİ BİR DESEN. `role="combobox"`,
// `listbox`, `option`, `aria-activedescendant` kod tabanında başka hiçbir
// yerde geçmiyor; kopyalanacak bir örnek yoktu. Bu yüzden ARIA sözleşmesi
// burada tam yazıldı — eksik bırakılırsa panel ekran okuyucuda hiç
// duyurulmaz.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { pinNormalize, pinBicimiMi } from '../../utils/pinUretici';
import { katalogOnerileri, konumOnerileri, EN_AZ_HARF } from '../../services/oneriService';

const ODAK = 'focus-visible:ring-offset-2';

/** Panel başlıkları — öneri türünden bölüm adına. */
const BOLUM = { marka: 'ARAÇ', seri: 'ARAÇ', model: 'ARAÇ', sehir: 'KONUM', ilce: 'KONUM' };

/**
 * ⚠ ADRESTEKİ SORGU KUTUYA YANSITILIYOR.
 * `/arama?q=bmw` adresine gelen kullanıcı kutuyu BOŞ görüyordu: aradığı
 * kelimeyi ne görebiliyor ne düzeltebiliyordu, baştan yazmak zorundaydı.
 *
 * `key={q}` ile yeniden bağlanıyor — böylece adres değişince kutu yeni
 * sorguyla tazeleniyor. Bunu `useEffect` + `setState` ile yapmak bu
 * projenin lint kuralına (`react-hooks/set-state-in-effect`) takılıyor;
 * `key` aynı sonucu React'in kendi mekanizmasıyla veriyor.
 */
export default function HeaderArama({ mobil = false }) {
  const adrestekiSorgu = useSearchParams().get('q') ?? '';
  return <AramaFormu key={adrestekiSorgu} baslangic={adrestekiSorgu} mobil={mobil} />;
}

function AramaFormu({ baslangic, mobil }) {
  const router = useRouter();
  const kimlik = useId();
  const kapsayiciRef = useRef(null);

  const [sorgu, setSorgu] = useState(baslangic);
  const [gecikmis, setGecikmis] = useState('');
  const [oneriler, setOneriler] = useState([]);
  const [acik, setAcik] = useState(false);
  // -1 = hiçbir öneri seçili değil (Enter'ın eski davranışı geçerli)
  const [etkin, setEtkin] = useState(-1);

  // -----------------------------------------------------------------------
  // GECİKME — 300 ms, projenin yerleşik değeri (`MarketplaceView.jsx:789`)
  // -----------------------------------------------------------------------
  // Her tuşta sorgu atmak yüz binlerce kullanıcıda gereksiz yük; ayrıca geç
  // dönen eski bir yanıt yenisinin üstüne yazabiliyor.
  useEffect(() => {
    const z = setTimeout(() => setGecikmis(sorgu), 300);
    return () => clearTimeout(z);
  }, [sorgu]);

  // -----------------------------------------------------------------------
  // ÖNERİLERİ GETİR — iki kaynak
  // -----------------------------------------------------------------------
  useEffect(() => {
    const metin = gecikmis.trim();
    // ⚠ BURADA `setOneriler([])` YOK. Efekt gövdesinde senkron setState bu
    // projenin lint kuralına takılıyor (`react-hooks/set-state-in-effect`) ve
    // gereksiz bir render turu üretiyor. Kısa girdide liste OKUMA ANINDA
    // türetiliyor (`gosterilen`) — projenin yerleşik çözümü bu.
    if (metin.length < EN_AZ_HARF) return undefined;

    // ⚠ İPTAL BAYRAĞI: kullanıcı yazmaya devam ederse önceki isteğin geç
    // dönen yanıtı yeni listeyi ezmemeli.
    let iptal = false;
    // Konum tamamen istemcide, beklemesi yok; katalog sunucudan geliyor.
    const konum = konumOnerileri(metin);
    katalogOnerileri(metin).then((katalog) => {
      if (iptal) return;
      setOneriler([...katalog, ...konum]);
      setEtkin(-1);
    });
    return () => { iptal = true; };
  }, [gecikmis]);

  // -----------------------------------------------------------------------
  // DIŞARI TIKLAMA + ESC — `Header.jsx:139-159` kalıbı
  // -----------------------------------------------------------------------
  // `mousedown` kullanılıyor, `click` değil: panel içindeki bir satıra
  // tıklandığında `click` sırasında öğe DOM'dan kalkmış olabiliyor ve
  // `contains` yanlış cevap veriyor.
  useEffect(() => {
    if (!acik) return undefined;

    const disari = (e) => {
      if (kapsayiciRef.current && !kapsayiciRef.current.contains(e.target)) {
        setAcik(false);
      }
    };
    const tus = (e) => { if (e.key === 'Escape') { setAcik(false); setEtkin(-1); } };

    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', tus);
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', tus);
    };
  }, [acik]);

  // Kısa girdide öneri listesi GÖSTERİLMİYOR ama state'i temizlemiyoruz:
  // kullanıcı bir harf silip geri yazdığında eski liste anında geri geliyor,
  // yeni sorgu beklenmiyor.
  const gosterilen = gecikmis.trim().length < EN_AZ_HARF ? [] : oneriler;
  const gorunur = acik && gosterilen.length > 0;

  const oneriyeGit = (o) => {
    setAcik(false);
    setEtkin(-1);
    router.push(o.adres);
  };

  const gonder = (e) => {
    e.preventDefault();

    // ⚠ ÖNCE SEÇİLİ ÖNERİ. Yalnızca ok tuşuyla gerçekten bir satır
    // seçildiyse oraya gidiliyor; aksi hâlde eski davranış aynen sürüyor.
    if (etkin >= 0 && gosterilen[etkin]) {
      oneriyeGit(gosterilen[etkin]);
      return;
    }

    const q = sorgu.trim();
    if (!q) return;
    setAcik(false);

    if (pinBicimiMi(q)) {
      const pin = pinNormalize(q);
      if (pin) router.push(`/karne/${encodeURIComponent(pin)}`);
      return;
    }
    router.push(`/arama?q=${encodeURIComponent(q)}`);
  };

  const tusaBas = (e) => {
    if (!gorunur) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setEtkin((i) => (i + 1) % gosterilen.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setEtkin((i) => (i <= 0 ? gosterilen.length - 1 : i - 1));
    }
  };

  return (
    <div ref={kapsayiciRef} className={`relative w-full ${mobil ? '' : 'max-w-lg'}`}>
      <form
        onSubmit={gonder}
        role="search"
        /* ⚠ TEK ODAK HALKASI — ÖNCEDEN İKİ TANE ÇİZİLİYORDU.
           Ölçüldü: girdi global `:focus-visible` kuralından
           `outline: 2px solid #4f46e5` alıyor, form da `focus-within` ile
           kenarlığını indigoya çeviriyordu. Sonuç iç içe iki mavi çerçeveydi.
           Artık halka YALNIZCA kapsayıcıda; girdininki `.odak-kapsayicida`
           ile bastırılıyor.

           Zemin beyaz: koyu şeritte en okunaklı ve aramayı şeridin odağı
           yapıyor. */
        className="relative z-10 flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 h-11 w-full transition-shadow
          focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400"
      >
        <span className="text-slate-500 shrink-0" aria-hidden="true">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </span>

        {/* ⚠ Bu etiket TEST ÇAPASI — bkz. dosya başı. */}
        <input
          type="text"
          value={sorgu}
          onChange={(e) => { setSorgu(e.target.value); setAcik(true); }}
          onFocus={() => setAcik(true)}
          onKeyDown={tusaBas}
          aria-label="Marka, model, şehir veya PIN ile ara"
          placeholder="Marka, model veya PIN ile ara"
          autoComplete="off"
          /* ARIA birleşik kutu sözleşmesi. `aria-expanded` INPUT'a
             konuyor — testlerde `button[aria-expanded]` seçicisi yasak
             (`tests/OKUBENI.md:113`), input o seçiciye takılmıyor. */
          role="combobox"
          aria-expanded={gorunur}
          aria-controls={`${kimlik}-oneriler`}
          aria-autocomplete="list"
          aria-activedescendant={etkin >= 0 ? `${kimlik}-oneri-${etkin}` : undefined}
          className="odak-kapsayicida w-full min-h-[44px] bg-transparent border-none outline-none text-govde text-slate-900 placeholder:text-slate-500"
        />

        {sorgu && (
          <button
            type="button"
            onClick={() => { setSorgu(''); setAcik(false); }}
            aria-label="Aramayı temizle"
            /* 44px: şeritte dar görünse de dokunma hedefi eşiği aşağı
               çekilmiyor (WCAG 2.5.5). Genişlik `w-8` ama yükseklik tam. */
            className={`shrink-0 grid place-items-center w-8 min-h-[44px] text-slate-500 hover:text-slate-900 rounded ${ODAK}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {gorunur && (
        <ul
          id={`${kimlik}-oneriler`}
          role="listbox"
          aria-label="Arama önerileri"
          className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-100 animate-panelAcilis"
        >
          {gosterilen.map((o, i) => {
            const ilkBolum = i === 0 || BOLUM[gosterilen[i - 1].tur] !== BOLUM[o.tur];
            return (
              <li
                key={`${o.tur}-${o.adres}`}
                /* ⚠ GECİKME SATIR SIRASINA BAĞLI. Hepsi aynı anda belirirse
                   hareket fark edilmiyor; 28 ms aralıkla liste "doluyor"
                   hissi veriyor. Üst sınır var: 10. satırdan sonra gecikme
                   büyümüyor, yoksa uzun listede son satır yarım saniye
                   sonra gelir ve tıklanacak şey yokmuş gibi görünür. */
                style={{ animationDelay: `${Math.min(i, 9) * 28}ms` }}
                /* ⚠ `motion-safe:` ÖNEKİ YOK VE OLMAMALI. O bir Tailwind
                   varyantı; `animate-oneriGirisi` ise globals.css'te tanımlı
                   ÖZEL bir sınıf. Tailwind sahibi olmadığı bir sınıfın
                   varyantını üretemiyor — ölçüldü: `animationName: none`,
                   yani animasyon sessizce hiç çalışmıyordu.
                   Hareket duyarlılığı zaten globals.css'teki
                   `prefers-reduced-motion` bloğuyla karşılanıyor. */
                className="animate-oneriGirisi"
              >
                {ilkBolum && (
                  <span className="block px-3 pt-2.5 pb-1 etiket text-slate-500 select-none">
                    {BOLUM[o.tur]}
                  </span>
                )}
                {/* Satırlar `<button>`: `25-anasayfa`nın 44 px taraması
                    sayfadaki TÜM `button`/`a` ögelerini ölçüyor. */}
                <button
                  type="button"
                  id={`${kimlik}-oneri-${i}`}
                  role="option"
                  aria-selected={i === etkin}
                  onMouseEnter={() => setEtkin(i)}
                  onClick={() => oneriyeGit(o)}
                  className={`w-full min-h-[44px] px-3 flex items-center text-left text-govde text-slate-900 transition-colors ${
                    i === etkin ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  } ${ODAK}`}
                >
                  {o.etiket}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ===================================================================
          SAYFA KARARTMA
          ===================================================================
          ⚠ KATMAN KARARI: karartma `z-40`, başlık şeridi `z-50`. Yani şerit
          ve içindeki arama kutusu karartmanın ÜSTÜNDE kalıyor, sayfa altında
          kararıyor — arabam.com'daki etkinin aynısı.

          Şeridi de karartmanın altına almak MÜMKÜN DEĞİL: `header` `z-50`
          ile kendi yığma bağlamını kuruyor; içindeki panel, dışarıdaki daha
          yüksek bir kaplamayı aşamaz. Kaplamayı şeridin üstüne almak ise
          arama kutusunu da karartırdı.

          `createPortal` ŞART: karartma `fixed`; şeridin içinde kalsaydı
          `backdrop-filter` taşıyan bir ata onu kapsayıcı bloğa hapsedebilir
          (`PaywallDialog.jsx:114-126`'daki tuzağın aynısı).

          Kaydırma KİLİTLENMİYOR: bu bir diyalog değil, açılır panel.
          `useModalErisim` bilerek kullanılmadı — o kanca kaydırmayı kilitler
          ve açılışta odağı çalar, ikisi de burada yanlış olurdu.
          =================================================================== */}
      {gorunur && typeof document !== 'undefined' && createPortal(
        <div
          aria-hidden="true"
          onMouseDown={() => setAcik(false)}
          className="fixed inset-0 z-40 bg-[#0F172A]/50 backdrop-blur-sm motion-safe:animate-fadeIn"
        />,
        document.body,
      )}
    </div>
  );
}
