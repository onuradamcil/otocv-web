// =========================================================================
// OTO-CV VİTRİN BİLEŞENİ: HIGH-PERFORMANCE WEB VİTRİNİ (MarketplaceView.jsx)
// İşlev: Performans optimizasyonlu süzgeç motoru, ferah sol sidebar, 
//        Arabam.com tarzı aksiyonlu hizmet barı ve kurumsal Vitrin Paneli.
// =========================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';
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
// Marka ağacının saf mantığı ayrı dosyada: React'e dokunmuyor ve bu dosya
// zaten 1300+ satır. Normalize (Türkçe 'I' tuzağı) ve kanonik etiket seçimi
// oradaki yorumlarda gerekçeli.
import { KADEMELER, agacUygun, agacAnahtari } from '../../utils/markaAgaci';
// Marka ağacının dalları KATALOG tablolarından geliyor (49 marka / 822 seri /
// 3.591 model / 23.138 paket). Bu servis dosyada zaten vardı ama hiç
// çağrılmıyordu; yeni fonksiyon yazmak yerine canlandırıldı. Step1'in kaskad
// mantığıyla birebir aynı: kademe kademe, tıklandıkça.
import {
  fetchCatalogBrands,
  fetchCatalogSeries,
  fetchCatalogModels,
  fetchCatalogPackages,
} from '../../services/catalogService';
// DEMO — GEÇİCİ. Vitrin dolu hâlini görmek için; `?demo=N` yoksa hiç
// çağrılmıyor. Kaldırmak için bu satırı, `loadLiveListings` içindeki dalı
// ve demo şeridini sil (üçü de "DEMO" ile işaretli).
import { demoVitrinUret, DEMO_EN_FAZLA } from '../../utils/demoVitrin';
import { seckiUret } from '../../utils/secki';
//  importu KALDIRILDI: tek kullanicisi "Ucretlerin tamami" bagi vardi.
// `paketler` importu KALDIRILDI: "Ücretli işlemler" bölümü çıktı.
// ⚠ `ozetGetir` DEĞİL. O fonksiyon panel için tüm bakım kayıtlarını çekiyor;
// anasayfada o maliyet gereksiz. Gerekçe servis dosyasında yazılı.
// `garajSeridiGetir` importu KALDIRILDI: garaj şeridi ürün sahibinin
// kararıyla çıktı (aşağıda, kaldırıldığı yerde gerekçesi yok — bölüm
// tamamen silindi; servis fonksiyonu da `ozetService`ten kaldırıldı).

// =========================================================================
// SÜZGEÇ ARAYÜZ PARÇALARI
//
// Dört seçenek grubu (marka, şehir, yakıt, vites) birebir aynı davranışı
// taşıyor. Elle kopyalamak, birinde `aria-pressed` unutulup diğerlerinde
// kalması gibi sessiz farklar üretiyor — bu dosyada zaten olan şey buydu:
// masaüstü çipleri bir duruma, mobil çipleri başka bir duruma yazıyordu.
// =========================================================================

// "Son eklenenler" eşiği. 7 gün: referans siteler 24-48 saat kullanıyor ama
// onların günlük ilan hacmi bizim TOPLAM envanterimizden büyük. 48 saatlik bir
// süzgeç bizde neredeyse her zaman boş dönerdi — çalışan ama faydasız bir
// seçenek, tam da kaldırdığımız "%80+" çipinin hatası olurdu.
//
// ⚠ MODÜL DÜZEYİNDE: bileşen içinde tanımlıysa her render'da yeniden üretilen
// bir değer olup `useMemo` bağımlılığı haline geliyor ve lint haklı olarak
// uyarıyor.
const YENI_ESIGI_MS = 7 * 24 * 60 * 60 * 1000;


// Anasayfada gösterilecek EN FAZLA kart. Ürün sahibinin kararı: "sınırsız
// ilan gösterilmemeli, 6*4 olabilir".
//
// ⚠ 24 SEÇİLDİ ÇÜNKÜ SÜTUN SAYILARINA BÖLÜNÜYOR: ızgara `auto-fill` ve
// genişliğe göre 2/3/4/5/6 sütun veriyor. 24; 2, 3, 4 ve 6'ya tam bölünüyor,
// yani o genişliklerde son satır DOLU bitiyor — şikâyet edilen "yarım kalmış
// son satır" ortadan kalkıyor. Yalnızca 5 sütunda (1024-1279 px) son satır
// 4 kartla kapanıyor; 6 kartlık satırda 2 kart kalmasından çok daha az göze
// batıyor ve bunu tam çözmek sütun sayısını JS ile ölçmeyi gerektirirdi.
const ANASAYFA_KART_SINIRI = 24;

// "Sizin için seçtiklerimiz" bölümündeki kart sayısı. 12 = geniş ekranda
// iki dolu satır; vitrinin yarısı kadar yer kaplayarak ikincil kaldığını
// belli ediyor.
const SECKI_KART_SINIRI = 12;

// `/vitrin` sayfasında bir seferde çizilen kart sayısı. Envanter bugün
// küçük ama sınırsız `map` bir gün binlerce düğüm demek olurdu.
const TAM_SAYFA_ADIM = 48;

/**
 * Bu aracın KARNESİ paylaşıma açık mı?
 *
 * ⚠ TEK KURAL, ÜÇ DURUMU BİRDEN KAPSIYOR. Karne `/karne/<pin>` ile açılıyor,
 * yani PIN'i olmayan bir kartın gidecek yeri yok:
 *   · `vitrin` katmanı        -> PIN dolu, karne açık
 *   · `listelenebilir` katman -> PIN null (RPC bilerek vermiyor)
 *   · demo kayıt              -> PIN null (arkasında gerçek sicil yok)
 *
 * Daha önce burada "demo mu" diye soruluyordu; görünürlük katmanları
 * gelince o soru yetersiz kaldı — listelenen gerçek bir aracın da karnesi
 * kapalı olabiliyor. Ölçüt artık verinin kendisi.
 */
const karneAcikMi = (item) => Boolean(item?.pin_code);

/**
 * Sayılı tek satır seçenek (radyo davranışı: biri seçili).
 *
 * @param {boolean} [p.basili=true] `aria-pressed` basılsın mı.
 * @param {boolean} [p.derine=false] Satır bir ALT KADEMEYE iniyor mu.
 */
function SuzgecSatiri({ etiket, adet, secili, sec, basili = true, derine = false }) {
  return (
    <button
      type="button"
      onClick={sec}
      // ⚠ `aria-pressed` YALNIZCA GERÇEK AÇ/KAPA İÇİN. Marka ağacının satırı
      // tıklandığında bir alt kademeye geçiyor ve LİSTEDEN KAYBOLUYOR;
      // orada `aria-pressed="false"` asla değişmeyen bir durum bildirir,
      // yani ekran okuyucu kullanıcısına yanlış kontrol tipi anlatır.
      {...(basili ? { 'aria-pressed': secili } : {})}
      className={`w-full min-h-[44px] px-2.5 rounded-md cursor-pointer flex justify-between items-center gap-2 text-left transition-colors ${
        secili ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="metin-yardimci font-semibold truncate">{etiket}</span>
      <span className="metin-yardimci text-slate-600 tabular-nums shrink-0 flex items-center gap-1">
        {/* ⚠ SAYAÇ İSTEĞE BAĞLI. Marka ağacı katalogtan besleniyor ve
            katalogda "kaç araç var" bilgisi yok; ürün sahibi de sayaç
            istemedi. Şehir/Yakıt/Vites grupları ise envanterden geliyor,
            orada sayaç anlamlı ve duruyor. */}
        {adet !== undefined && adet !== null && `(${adet})`}
        {/* Kademe derinleşiyor: ok bunu söylüyor. Kayıtta sağa bakan ikon
            YOK (`registry.jsx`: `asagi`, `geri` var); `asagi` döndürülüyor —
            `SuzgecAkordiyon` da `rotate-180` ile aynı şeyi yapıyor, yeni bir
            kalıp değil. `aria-hidden` (Icon varsayılanı): anlamı satırın
            kendi metni taşıyor. */}
        {derine && <Icon name="asagi" size="xs" className="-rotate-90 text-slate-400" />}
      </span>
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
      className={`w-full min-h-[44px] px-2.5 rounded-md cursor-pointer flex items-center gap-2 text-left transition-colors ${
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

/**
 * Seçenek listesi. BAŞLIK VE ÇERÇEVE ARTIK BURADA DEĞİL — onları saran
 * `SuzgecAkordiyon` veriyor. Aksi hâlde başlık iki kez çizilirdi.
 *
 * ⚠ `length < 2` koruması BURADAN KALDIRILDI ve çağıran tarafa taşındı:
 * burada `null` dönmek, akordiyon başlığını BOŞ bir gövdeyle bırakıyordu —
 * kullanıcı grubu açıyor ve hiçbir şey görmüyordu. Grubun tamamı çizilmemeli.
 */
function SuzgecGrubu({ secenekler, tumuAdet, secili, sec }) {
  return (
    <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto pr-1">
      <SuzgecSatiri etiket="Tümü" adet={tumuAdet} secili={secili === 'Tümü'} sec={() => sec('Tümü')} />
      {secenekler.map(([ad, adet]) => (
        <SuzgecSatiri key={ad} etiket={ad} adet={adet} secili={secili === ad} sec={() => sec(ad)} />
      ))}
    </div>
  );
}

// =========================================================================
// AKORDİYON GRUBU — REFERANS SİTELERİN KALIBI
//
// arabam.com'un süzgeç panelinde 21 grup var ve başlıklar arası mesafe ~41 px
// ölçüldü: yani çoğu KAPALI akordiyon. Sebebi açık — yedi ya da yirmi grubu
// aynı anda açık tutmak kenar çubuğunu ekranlar boyu uzatıyor ve kullanıcı
// araçları görmek için süzgeçleri kaydırmak zorunda kalıyor.
//
// Bizde önceki hâl tam bu sorundaydı: dört seçenek grubu (marka/şehir/yakıt/
// vites) ve iki blok hepsi açıktı. Marka listesi kaldırıldı ama kalanlar da
// envanter büyüdüğünde aynı yere varırdı.
//
// ⚠ MODAL DEĞİL, AÇILIR PANEL. `role="dialog"` KULLANILMIYOR: `04-mobil`
// paketi mobil çekmeceyi `[role='dialog'][aria-modal='true']` ile buluyor
// (satır 112) ve anasayfada ikinci bir eşleşme o testi kırar.
// =========================================================================

/**
 * Katlanabilir süzgeç grubu.
 *
 * @param {object} p
 * @param {string} p.baslik Grup adı — başlık düğmesinin erişilebilir adı.
 * @param {boolean} p.baslangictaAcik İlk açılışta açık mı.
 * @param {string} [p.ozet] Başlıkta gösterilecek kısa durum (ör. seçili değer).
 */
function SuzgecAkordiyon({ baslik, baslangictaAcik = false, ozet, children }) {
  const [acik, setAcik] = useState(baslangictaAcik);
  // `useId`: aynı sayfada birden fazla akordiyon var, `aria-controls`
  // hedeflerinin çakışmaması gerekiyor.
  const govdeId = `suzgec-${useId()}`;

  return (
    <div className="border-t border-slate-100 first:border-t-0">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        aria-controls={govdeId}
        className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left cursor-pointer group"
      >
        <span className="etiket text-slate-600 group-hover:text-slate-900 transition-colors">
          {baslik}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {/* Kapalıyken seçili değeri başlıkta göstermek, grubu açmadan
              "burada bir süzgeç etkin" bilgisini veriyor. */}
          {!acik && ozet && (
            <span className="metin-yardimci text-indigo-600 font-semibold truncate max-w-[110px]">
              {ozet}
            </span>
          )}
          {/* Ok ikonu `aria-hidden`: durumu `aria-expanded` taşıyor, ikon
              yalnızca görsel. Ad düğmede, ikonda değil (Icon.jsx:53 kuralı). */}
          <span
            aria-hidden="true"
            className={`text-slate-400 transition-transform ${acik ? 'rotate-180' : ''}`}
          >
            <Icon name="asagi" size="sm" />
          </span>
        </span>
      </button>

      {acik && (
        <div id={govdeId} className="pb-3 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * En az / en çok aralık girdisi. Yıl ve Kilometre aynı bileşeni kullanıyor —
 * referans sitelerde de Fiyat/Yıl/Kilometre birebir aynı kontrol.
 *
 * ⚠ Etiketler `sr-only`: görsel olarak yer tutucu yeterli ama ekran okuyucu
 * kullanıcısı iki girdiyi ayırt edemezdi.
 */
function AralikGirdisi({ ad, birim, enAz, enCok, degistir }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { anahtar: 'enAz', deger: enAz, etiket: `En az ${ad}`, yer: birim ? `En az (${birim})` : 'En az' },
        { anahtar: 'enCok', deger: enCok, etiket: `En çok ${ad}`, yer: birim ? `En çok (${birim})` : 'En çok' },
      ].map((g) => (
        <label key={g.anahtar} className="block">
          <span className="sr-only">{g.etiket}</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={g.yer}
            value={g.deger}
            onChange={(e) => degistir(g.anahtar, e.target.value)}
            className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-md px-2.5 text-yardimci outline-none focus:border-indigo-600"
          />
        </label>
      ))}
    </div>
  );
}

/**
 * Dar ekran çipi.
 *
 * @param {boolean} [p.basili=true] `aria-pressed` basılsın mı (ağaç
 *   çiplerinde basılmıyor: tıklama seçim değil, derine iniş).
 * @param {string} [p.ad] Genişletilmiş erişilebilir ad. ⚠ GÖRÜNEN METNİ
 *   İÇERMEK ZORUNDA (WCAG 2.5.3 Label in Name) — çağıran taraf
 *   `${etiket} — ...` biçiminde kuruyor.
 */
function SuzgecCipi({ etiket, secili, sec, basili = true, ad }) {
  return (
    <button
      type="button"
      onClick={sec}
      {...(basili ? { 'aria-pressed': secili } : {})}
      {...(ad ? { 'aria-label': ad } : {})}
      className={`shrink-0 min-h-[44px] px-3.5 rounded-md text-yardimci font-semibold border transition-colors cursor-pointer ${
        secili ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
    >
      {etiket}
    </button>
  );
}

/**
 * Dar ekran seçenek grubu — çip olarak sarmalı.
 * Başlık ve çerçeve `SuzgecAkordiyon`da; `length < 2` koruması da çağıran
 * tarafta (boş akordiyon gövdesi bırakmamak için).
 */
function MobilGrup({ secenekler, secili, sec }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <SuzgecCipi etiket="Tümü" secili={secili === 'Tümü'} sec={() => sec('Tümü')} />
      {secenekler.map(([ad, adet]) => (
        <SuzgecCipi key={ad} etiket={`${ad} (${adet})`} secili={secili === ad} sec={() => sec(ad)} />
      ))}
    </div>
  );
}

// =========================================================================
// KADEMELİ MARKA AĞACI — sahibinden.com kalıbı
//
// Marka → Seri → Model → Donanım. Bir kademe seçildiği anda ızgara SÜZÜLÜYOR
// ve altındaki kademe açılıyor: ayrı bir "uygula" adımı yok. Yani bu yapı
// hem gezinme hem süzgeç — ürün sahibinin şartı buydu.
//
// ⚠ DURUM BURADA TUTULMUYOR. Masaüstü ve dar ekran AYNI bileşeni, AYNI
// durumu okuyarak kullanıyor; tek fark `bicim`. Bu dosyanın geçmişinde
// "masaüstü çipleri bir duruma, mobil çipleri başkasına yazıyordu" hatası
// var; ikinci bir durum kaynağı açmak onu geri getirirdi.
//
// ⚠ AĞAÇTA "Tümü" SATIRI YOK. Kırıntının kökü ("Tüm markalar") o işi
// yapıyor; iki kontrolün aynı eylemi taşıması kullanıcıya hangisinin ne
// yaptığını sorduruyor.
// =========================================================================

/**
 * @param {object} p
 * @param {{hedef: number, etiket: string}[]} p.yol Kırıntı halkaları. SON
 *   halka bulunulan yer (düğme DEĞİL). Boş dizi = köktesin, kırıntı çizilmiyor.
 * @param {string|null} p.kademeBasligi Gösterilen kademenin adı ('Seri').
 * @param {{id: number, name: string}[]} p.cocuklar Katalog düğümleri.
 * @param {number} p.derinlik Çocukların ait olduğu kademe (0-3).
 * @param {(hedef: number) => void} p.git Kırıntıda üst kademeye dön.
 * @param {(derinlik: number, anahtar: string) => void} p.sec
 * @param {'liste'|'cip'} [p.bicim] Masaüstü satır / dar ekran çip.
 */
// Kırıntı yolunun kademe girintileri. Dizi olarak yazılıyor çünkü Tailwind
// JIT'i `pl-${i*3}` gibi hesaplanmış sınıf adlarını TARAYAMIYOR — sınıfın
// kaynakta birebir geçmesi gerekiyor.
const YOL_GIRINTISI = ['pl-0', 'pl-3', 'pl-6', 'pl-9', 'pl-12'];

function MarkaAgaci({ yol, kademeBasligi, cocuklar, derinlik, yukleniyor, git, sec, bicim = 'liste' }) {
  const kokte = yol.length === 0;

  return (
    <div className="space-y-2">
      {!kokte && (
        /* ⚠ YOL YATAY DEĞİL, DİKEY VE GİRİNTİLİ.
           Önceki hâl `flex-wrap` ile yan yana diziyordu ve uzun adlarda
           panele sığmıyordu: "Tüm markalar › Alfa Romeo › 145" satırı
           taşıyor, ok işareti bir alt satırın başına düşüyor ve iz
           okunmaz hâle geliyordu. Kenar çubuğu ~250 px; marka + seri +
           model adları yan yana o genişliğe sığmıyor.

           Her kademe kendi satırında ve bir öncekinden girintili. Bu aynı
           zamanda referans sitedeki ağaç görünümü. Genişlik sorunu tamamen
           ortadan kalkıyor: satır başına tek ad, taşarsa `truncate`.

           ⚠ `<nav>` DEĞİL. Bunlar sayfa bağlantısı değil süzgeç düğmesi;
           `nav` landmark'ı ekran okuyucuda sahte bir gezinme bölgesi
           üretir. */
        <div className="flex flex-col">
          {yol.map((halka, i) => {
            const suradasin = i === yol.length - 1;
            const girinti = YOL_GIRINTISI[Math.min(i, YOL_GIRINTISI.length - 1)];
            return suradasin ? (
              /* Bulunulan yer düğme DEĞİL: tıklanacak bir işi yok ve ölü bir
                 kontrol göstermek yanlış bilgi. Düğme olmadığı için 44 px
                 yükümlülüğü de doğmuyor. */
              <span
                key={`${halka.hedef}-${halka.etiket}`}
                aria-current="true"
                className={`${girinti} flex items-center gap-1 py-1 metin-yardimci font-semibold text-slate-900 min-w-0`}
              >
                {i > 0 && (
                  <span aria-hidden="true" className="text-slate-400 shrink-0">
                    <Icon name="asagi" size="xs" className="-rotate-90" />
                  </span>
                )}
                <span className="truncate">{halka.etiket}</span>
              </span>
            ) : (
              <button
                key={`${halka.hedef}-${halka.etiket}`}
                type="button"
                onClick={() => git(halka.hedef)}
                /* Satır tam genişlik olduğu için `min-w-[44px]` derdi
                   kalmadı; yalnızca yükseklik korunuyor. */
                className={`${girinti} w-full min-h-[44px] flex items-center gap-1 rounded-md px-1 metin-yardimci font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer text-left min-w-0`}
              >
                {i > 0 && (
                  <span aria-hidden="true" className="text-slate-400 shrink-0">
                    <Icon name="asagi" size="xs" className="-rotate-90" />
                  </span>
                )}
                <span className="truncate">{halka.etiket}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ⚠ KADEME BAŞLIĞI (SERİ / MODEL / DONANIM) EKRANDA GÖSTERİLMİYOR.
          Ürün sahibinin kararı: "marka hariç alt başlıkları kaldır". Kırıntı
          yolu zaten hangi kademede olunduğunu söylüyor — "Tüm markalar ›
          McLaren › 540C" satırının altındaki listenin model listesi olduğu
          bağlamdan anlaşılıyor; ayrıca bir "MODEL" etiketi basmak aynı
          bilgiyi ikinci kez veriyordu.

          ⚠ BİLGİ SİLİNMEDİ, TAŞINDI. Ekran okuyucu kullanıcısı kırıntıyı
          "görsel olarak" tarayamıyor; kademe adı aşağıdaki listenin
          erişilebilir adına geçti (`role="group"` + `aria-label`). Görsel
          sadeleşme uğruna o kullanıcıyı bağlamsız bırakmak olmazdı. */}
      {yukleniyor ? (
        /* Katalog kademesi iniyor. Step1'de bu durumda hiçbir şey
           yazmıyordu ve sütun boş görünüyordu; burada söyleniyor. */
        <p className="metin-yardimci text-slate-500">Yükleniyor…</p>
      ) : cocuklar.length === 0 ? (
        /* EN DERİN KADEME (donanım seçili) ya da katalogda o dalın altı boş.
           Çıkış yolu yukarıdaki kırıntı, yani ölü uç değil. */
        <p className="metin-yardimci text-slate-500">
          Bu kademenin altında ayrım yok. Üst kademeye dönmek için yukarıdaki yolu kullanın.
        </p>
      ) : bicim === 'cip' ? (
        <div
          role="group"
          aria-label={kademeBasligi ? `${kademeBasligi} seçenekleri` : 'Marka seçenekleri'}
          className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto"
        >
          {cocuklar.map((c) => (
            <SuzgecCipi
              key={c.id}
              etiket={c.name}
              basili={false}
              secili={false}
              sec={() => sec(derinlik, c)}
            />
          ))}
        </div>
      ) : (
        /* ⚠ `max-h-72 overflow-y-auto` — KAYAN LİSTE ŞART.
           Katalogda 49 marka var ve BMW'nin altında 18 seri, onun altında
           274 model. Sınırsız uzayan bir liste kenar çubuğunu ekranlar boyu
           uzatır; ürün sahibinin istediği de "marka scroll menüsü". */
        <div
          role="group"
          aria-label={kademeBasligi ? `${kademeBasligi} seçenekleri` : 'Marka seçenekleri'}
          className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1"
        >
          {cocuklar.map((c) => (
            <SuzgecSatiri
              key={c.id}
              etiket={c.name}
              basili={false}
              derine
              sec={() => sec(derinlik, c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketplaceView({
  // `/vitrin` sayfası bu bileşeni YENİDEN KULLANIYOR. Süzgeç motoru, marka
  // ağacı ve kart ızgarası 700 satırdan fazla; ikinci bir kopya çıkarmak
  // yerine anasayfaya özgü bölümler bu bayrakla kapatılıyor.
  //
  // Kapanan bölümler: Hizmetler şeridi, ayrılmış boşluk, "Sizin için
  // seçtiklerimiz", "Nasıl çalışır" ve "Tümünü göster" bağı. Kalan: hero
  // araması, süzgeç paneli ve ızgara — yani sayfanın var oluş sebebi.
  tamSayfa = false,
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

  // ⚠ `Date.now()` RENDER SIRASINDA ÇAĞRILAMAZ — lint bunu hata sayıyor ve
  // haklı: saf olmayan bir çağrı, bileşen yeniden çizildiğinde farklı sonuç
  // üretip süzgeci kararsız yapıyor. Zaman bir kez, açılışta alınıyor.
  // "Son 7 gün" penceresi sayfa açılışına göre hesaplanıyor; bir süzgeç için
  // doğru davranış bu.
  const [acilisZamani] = useState(() => Date.now());
  // Yalnızca `/vitrin` sayfasında kullanılıyor: "Daha fazla göster" ile artıyor.
  const [sayfaAdet, setSayfaAdet] = useState(TAM_SAYFA_ADIM);

  // =========================================================================
  // MARKA AĞACI — KATALOG GEZİNMESİ
  // =========================================================================
  // `agacYolu` bulunulan kırılım: her kademe katalogtan gelen `{ id, ad }`.
  // `id` bir ALT kademeyi çekmek için, `ad` araçlarla eşleştirmek için lazım.
  //
  // ⚠ SÜZME ÖLÇÜTÜ BURADA DEĞİL `suzgec`te. İki ayrı state tutmanın sebebi
  // şu: `suz()` yalnızca `suzgec`i okuyor ve ızgara ondan besleniyor; ağaç
  // ise katalog kimliklerine ihtiyaç duyuyor. `agacSec` ikisini BİRLİKTE
  // güncelliyor, dolayısıyla ayrışamıyorlar.
  const [agacYolu, setAgacYolu] = useState([]);
  // ⚠ ÇOCUKLAR VE HANGİ YOLA AİT OLDUKLARI TEK STATE'TE. Ayrı bir
  // `yukleniyor` bayrağı tutulmuyor: onu set etmek efekt gövdesinde
  // eşzamanlı `setState` demekti ve React lint'i haklı olarak "zincirleme
  // render" uyarısı veriyordu. Bunun yerine durum TÜRETİLİYOR — elimizdeki
  // çocuklar bulunulan yola ait değilse yükleme sürüyor demektir.
  const [agacKademe, setAgacKademe] = useState({ anahtar: null, cocuklar: [] });


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
    sehir: 'Tümü',
    yakit: 'Tümü',
    vites: 'Tümü',
    yilMin: '',
    yilMax: '',
    // `km` alanı `vitrin_listesi` RPC'sinden BUGÜN de geliyordu ama hiçbir
    // yerde kullanılmıyordu — en büyük süzgeç boşluğu buydu. Referans
    // sitelerin ikisinde de Kilometre aralığı var.
    kmMin: '',
    kmMax: '',
    sicilEnAz: 0,
    yalnizOneCikan: false,
    // Referans sitelerde karşılığı olan zaman süzgeci: sahibinden
    // "Son 48 Saat / 1 Hafta / 1 Ay", arabam "Son 24 Saat / 48 Saat".
    // Bizde tek kademe yeterli: envanter küçük, daha ince kademeler hep
    // boş sonuç verirdi.
    yalnizYeni: false,
    // MARKA AĞACI — dört kademe (Marka → Seri → Model → Donanım).
    // Boş dize = "bu kademe seçilmedi".
    //
    // ⚠ SAKLANAN DEĞER NORMALİZE ANAHTAR, EKRAN ETİKETİ DEĞİL. 'BMW' ile
    // 'bmw' tek dal olmak zorunda; ham etiket saklansaydı "iki yazımdan
    // hangisi seçili" sorusu cevapsız kalırdı. Etiket her render'da ağacın
    // kendi listesinden okunuyor — tek kaynak. Normalize kuralı ve neden
    // `toLocaleLowerCase('tr')` OLMADIĞI `utils/markaAgaci.js`te yazılı.
    //
    // ⚠ NİYE `suzgec` İÇİNDE, AYRI STATE DEĞİL: ızgara tek çağrıdan
    // besleniyor — `suz(listings, suzgec, aramaSorgusu)`. Ağaç `suzgec`in
    // içinde olduğu an seçim AYNI render'da ızgarayı süzüyor, ek tel yok.
    // Ayrı state olsaydı `suz`a ikinci bir argüman geçirmek ve sekiz çağrı
    // yerini değiştirmek gerekirdi.
    marka: '',
    seri: '',
    model: '',
    donanim: '',
  });

  // Bulunulan kademenin ÇOCUKLARINI çeker. Açılışta yalnızca 49 marka
  // iniyor; seri/model/paket ancak tıklandıkça. 23.138 paket hiçbir zaman
  // topluca çekilmiyor.
  useEffect(() => {
    let iptal = false;
    const derinlik = agacYolu.length;
    const anahtar = agacYolu.map((dugum) => dugum.id).join('>');

    // En derin kademe (donanım seçili): altında çocuk yok, sorgu da yok.
    // Çözülmüş bir promise kullanılıyor ki bu dalda da `setState` yalnızca
    // asenkron geri çağrıda olsun — efekt gövdesi setState'siz kalıyor.
    const istek =
      derinlik >= KADEMELER.length ? Promise.resolve([])
        : derinlik === 0 ? fetchCatalogBrands()
          : derinlik === 1 ? fetchCatalogSeries(agacYolu[0].id)
            : derinlik === 2 ? fetchCatalogModels(agacYolu[1].id)
              : fetchCatalogPackages(agacYolu[2].id);

    istek.then((liste) => {
      // ⚠ `iptal`: kullanıcı yanıt gelmeden başka bir dala tıklarsa eski
      // isteğin sonucu yeni kademenin üstüne yazılırdı.
      if (!iptal) setAgacKademe({ anahtar, cocuklar: liste || [] });
    });

    return () => { iptal = true; };
  }, [agacYolu]);

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
        const gercek = result.data || [];

        // =================================================================
        // DEMO — GEÇİCİ, SİLİNMEK ÜZERE YAZILDI
        // =================================================================
        // Sahte kartlar GERÇEK araçlarla aynı listeye ekleniyor. Ürün
        // sahibinin kararı: vitrin, süzgeçler ve yeni bölümler ancak dolu
        // envanterle değerlendirilebiliyor ve bunu iki ayrı adreste
        // denemek iki kez iş demek.
        //
        // ⚠ VERİTABANINA HİÇBİR ŞEY YAZILMIYOR. Kayıtlar yalnızca bu
        // tarayıcı oturumunda, bellekte var.
        //
        // ⚠ GERÇEK KAYITLAR ÖNDE. Sıralamayı zaten `suz` yapıyor
        // (öne çıkanlar, sonra tarih) ama birleştirme sırası da gerçek
        // veriyi öne alıyor: demo bir gün silindiğinde ızgaranın ilk
        // kartları değişmesin.
        //
        // ⚠ `acilisZamani` DEĞİL `Date.now()`: `acilisZamani` bir state
        // değeri ve buradan okunması `loadLiveListings`i ona bağlardı
        // (lint "bayat kapanış" uyarısı verir). Bu fonksiyon render
        // sırasında değil `useEffect` içinden çalışıyor.
        //
        // SİLMEK İÇİN: bu bloğu ve `demoVitrin.js` dosyasını kaldır.
        // =================================================================
        const demolar = demoVitrinUret(DEMO_EN_FAZLA, Date.now());
        setListings([...gercek, ...demolar]);
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

  /**
   * Ağaçta bir kademe seçer.
   *
   * ⚠ ALTINDAKİ KADEMELER SIFIRLANIYOR ve bu bir DEĞİŞMEZ: marka değişince
   * eski seri yeni markaya ait olmayabilir, sonuç kesin boş çıkardı. Bu
   * sayede "marka boş ama seri dolu" durumu hiç oluşmuyor — `agacDerinligi`
   * (ilk boş kademeyi arıyor) tam buna dayanıyor.
   */
  /**
   * Kart tıklaması. Karnesi kapalı araçta SESSİZ KALMIYOR.
   *
   * ⚠ Eskiden bu kartlara boş bir işlev geçiliyordu: tıklıyordunuz, hiçbir
   * şey olmuyordu. Kullanıcı sitenin bozuk olduğunu düşünüyordu; artık
   * neden açılmadığı söyleniyor.
   */
  const kartTikla = (item) => {
    if (karneAcikMi(item)) {
      onSelectVehicle(item);
      return;
    }
    toast.bilgi('Bu aracın karnesi paylaşıma açık değil. Sahibi vitrine çıkarırsa görüntülenebilir.');
  };

  const agacSec = (derinlik, dugum) => {
    // Katalog gezinmesi: yol bu kademeye kadar kırpılıp yeni düğüm ekleniyor.
    setAgacYolu((y) => [...y.slice(0, derinlik), { id: dugum.id, ad: dugum.name }]);
    // Süzme ölçütü: katalogtan gelen AD normalize edilip yazılıyor. Araçtaki
    // metin de `agacUygun` içinde aynı işlemden geçiyor.
    setSuzgec((onceki) => {
      const yeni = { ...onceki };
      KADEMELER.forEach((k, i) => {
        if (i === derinlik) yeni[k.alan] = agacAnahtari(dugum.name);
        else if (i > derinlik) yeni[k.alan] = '';
      });
      return yeni;
    });
  };

  /** Kırıntıda `hedef` kademesine döner: o kademe ve altı boşalıyor. */
  const agacaGit = (hedef) => {
    setAgacYolu((y) => y.slice(0, hedef));
    setSuzgec((onceki) => {
      const yeni = { ...onceki };
      KADEMELER.forEach((k, i) => {
        if (i >= hedef) yeni[k.alan] = '';
      });
      return yeni;
    });
  };

  const suzgecleriSifirla = () => {
    setSearchQuery('');
    // Katalog gezinmesi de köke dönüyor; yalnızca `suzgec` temizlenseydi
    // ızgara sıfırlanır ama ağaç seçili dalda kalırdı.
    setAgacYolu([]);
    setSuzgec({
      sehir: 'Tümü', yakit: 'Tümü', vites: 'Tümü',
      yilMin: '', yilMax: '', kmMin: '', kmMax: '', sicilEnAz: 0, yalnizOneCikan: false,
      yalnizYeni: false,
      // ⚠ AĞAÇ DA SIFIRLANIYOR. Unutulsaydı "Süzgeçleri sıfırla" ızgarayı
      // seçili markada BIRAKIR ve `suzgecEtkin` true kalırdı: düğmeye
      // basılıyor, hiçbir şey olmuyor gibi görünürdü.
      marka: '', seri: '', model: '', donanim: '',
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
      // `package` EKLENDİ: marka ağacı donanımı birinci sınıf bir kademe
      // yaptı, dolayısıyla "X-PACK" yazan kullanıcıya boş dönmek artık
      // ağaçla tutarsızlık. Ağaç dört alanı kullanıyorsa arama da kullanmalı.
      return [i.brand, i.model, i.series, i.package, i.listing_title, i.city, i.pin_code]
        .some((alan) => kucuk(alan).includes(q));
    },
    sehir: (i, s) => s.sehir === 'Tümü' || i.city === s.sehir,
    yakit: (i, s) => s.yakit === 'Tümü' || i.fuel_type === s.yakit,
    vites: (i, s) => s.vites === 'Tümü' || i.transmission === s.vites,
    // MARKA AĞACI — dört kademe TEK yüklemde.
    //
    // ⚠ NİYE DÖRT AYRI YÜKLEM DEĞİL: `haric` tek bir yüklem adını atlıyor,
    // ağaç ise dört kademelik bir ZİNCİR. Dört ayrı adla "yalnızca markayı
    // uygula, seriyi uygulama" gibi bir ara durumu ifade etmenin yolu yok.
    // Sayım tarafı bu yüzden `haric` değil KIRPILMIŞ SÜZGEÇ kullanıyor
    // (aşağıda `secenekler`, `agaciKirp`).
    agac: agacUygun,
    yil: (i, s) => {
      const y = Number(i.year) || 0;
      if (s.yilMin && y < Number(s.yilMin)) return false;
      if (s.yilMax && y > Number(s.yilMax)) return false;
      return true;
    },
    km: (i, s) => {
      // ⚠ `km` 0 ya da boş olabiliyor. Aralık verilmişse kaydı ELEMEK yerine
      // dahil etmek yanlış olurdu; ama "0 km" de meşru bir değer (sıfır araç).
      // Bu yüzden yalnızca DEĞER YOKSA (null/undefined/boş) eleniyor.
      const ham = i.km;
      if (!s.kmMin && !s.kmMax) return true;
      if (ham === null || ham === undefined || ham === '') return false;
      const k = Number(ham);
      if (!Number.isFinite(k)) return false;
      if (s.kmMin && k < Number(s.kmMin)) return false;
      if (s.kmMax && k > Number(s.kmMax)) return false;
      return true;
    },
    sicil: (i, s) => (Number(i.trust_score) || 0) >= Number(s.sicilEnAz || 0),
    oneCikan: (i, s) => !s.yalnizOneCikan || i.is_featured === true,
    yeni: (i, s) => {
      if (!s.yalnizYeni) return true;
      const t = new Date(i.created_at || 0).getTime();
      if (!Number.isFinite(t) || t === 0) return false;
      return (s.__simdi - t) <= YENI_ESIGI_MS;
    },
  }), []);

  /**
   * Süzgeçleri uygular. `haric` verilen yüklem ATLANIR — faceted sayım için.
   * Sıralama: öne çıkanlar önce (ücreti ödenmiş görünürlük), sonra yeni olan.
   */
  const suz = useCallback((liste, s, q, haric) => {
    // Açılış zamanı yüklemlere süzgeç nesnesiyle taşınıyor: yüklemler saf
    // kalıyor, zamanı kendileri okumuyor.
    const sz = { ...s, __simdi: acilisZamani };
    const gecenler = liste.filter((i) =>
      Object.entries(YUKLEMLER).every(([ad, f]) => ad === haric || f(i, sz, q))
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
  }, [YUKLEMLER, acilisZamani]);

  const aramaSorgusu = kucuk(searchQuery).trim();

  /** Ekranda basılan liste. Artık TEK kaynak bu. */
  const sonuclar = useMemo(
    () => suz(listings, suzgec, aramaSorgusu),
    [suz, listings, suzgec, aramaSorgusu]
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
      yeniAdet: suz(listings, suzgec, aramaSorgusu, 'yeni')
        .filter((i) => {
          const t = new Date(i.created_at || 0).getTime();
          return Number.isFinite(t) && t !== 0 && (acilisZamani - t) <= YENI_ESIGI_MS;
        }).length,
      // Şehir/Yakıt/Vites gruplarındaki "Tümü" satırının sayısı. 'sehir'
      // hariç tutuluyor çünkü üç grubun da en geniş kümesi bu: kendi süzgeci
      // kaldırılmış hâl. (Eskiden burada 'marka' yazıyordu; düz marka
      // listesi kaldırılınca o ad bir yükleme karşılık gelmez olmuştu.)
      tumuAdet: suz(listings, suzgec, aramaSorgusu, 'sehir').length,
    };
  }, [suz, listings, suzgec, aramaSorgusu, acilisZamani]);

  // Ağacın ekrana gereken hâli. `secenekler` memo'sunda DEĞİL: artık
  // envanterden hesaplanan bir şey yok, katalog state'inden doğrudan türüyor.
  const agacDerinlik = agacYolu.length;
  // Elimizdeki çocuklar bulunulan yola ait değilse istek hâlâ yolda.
  const agacYoluAnahtari = agacYolu.map((dugum) => dugum.id).join('>');
  const agacHazir = agacKademe.anahtar === agacYoluAnahtari;
  const agacGorunum = {
    derinlik: agacDerinlik,
    // Eski kademenin çocuklarını yeni kırıntının altında göstermemek için
    // hazır değilken boş liste veriliyor.
    cocuklar: agacHazir ? agacKademe.cocuklar : [],
    yukleniyor: !agacHazir,
    kademeBasligi: agacDerinlik < KADEMELER.length ? KADEMELER[agacDerinlik].baslik : null,
    ozet: agacDerinlik ? agacYolu[agacDerinlik - 1].ad : null,
    // Kırıntı. KÖK DAİMA İLK HALKA: son halka `aria-current` taşıyan bir
    // `<span>` (düğme değil), dolayısıyla derinlik 1'de köke dönecek başka
    // bir kontrol kalmazdı.
    yol: agacDerinlik === 0 ? [] : [
      { hedef: 0, etiket: 'Tüm markalar' },
      ...agacYolu.map((dugum, i) => ({ hedef: i + 1, etiket: dugum.ad })),
    ],
  };

  /** Herhangi bir süzgeç etkin mi? "Sıfırla" ve boş durum metni için. */
  const suzgecEtkin = aramaSorgusu !== ''
    || suzgec.sehir !== 'Tümü'
    || suzgec.yakit !== 'Tümü' || suzgec.vites !== 'Tümü'
    || suzgec.yilMin !== '' || suzgec.yilMax !== ''
    || suzgec.kmMin !== '' || suzgec.kmMax !== ''
    || Number(suzgec.sicilEnAz) > 0 || suzgec.yalnizOneCikan || suzgec.yalnizYeni
    // Ağacın dört kademesi elle yazılıyor: dosyanın yerleşik üslubu bu ve
    // `agacSec`in değişmezi ileride kayarsa bu satır yine doğru kalır.
    || suzgec.marka !== '' || suzgec.seri !== ''
    || suzgec.model !== '' || suzgec.donanim !== '';

  /**
   * Izgarada çizilen kartlar.
   *
   * ⚠ ESKİDEN "12 GÖSTER, GERİSİNİ YERİNDE AÇ" İDİ. Ürün sahibi bunu
   * reddetti: anasayfa sınırsız uzayamaz. Artık sabit üst sınır var ve
   * fazlası `/vitrin` sayfasına gidiyor.
   */
  const gosterilenler = tamSayfa
    ? sonuclar.slice(0, sayfaAdet)
    : sonuclar.slice(0, ANASAYFA_KART_SINIRI);

  /**
   * "Sizin için seçtiklerimiz" kartları.
   *
   * ⚠ VİTRİNDE GÖSTERİLENLER HARİÇ. Aynı aracı iki blokta göstermek seçkiyi
   * değersizleştirir ve kullanıcıya listenin kısa olduğunu düşündürür.
   *
   * ⚠ SÜZGEÇTEN ETKİLENMİYOR (`listings`, `sonuclar` değil). Seçki bir
   * öneri; kullanıcı "Dizel" süzdüğünde önerilerin de dizele daralması,
   * bölümün amacı olan "bunlara da bakın" işini ortadan kaldırırdı.
   *
   * ⚠ Tohum `acilisZamani`: seçki sayfa açıkken sabit kalıyor (her
   * render'da zıplamıyor), yeni ziyarette değişiyor.
   */
  const seckiler = useMemo(() => {
    if (tamSayfa) return [];
    // ⚠ SÜZGEÇ ETKİNKEN SEÇKİ YOK. Bunu test paketi yakaladı ve haklıydı:
    // seçki bilerek süzgeçten bağımsız (öneri olması gerekiyor), ama o
    // zaman kullanıcı "Bu süzgeçlerle araç bulunamadı" yazısının hemen
    // ALTINDA 12 alakasız kart görüyordu — sonucun boş olduğu mesajını
    // doğrudan yalanlıyor. Aktif bir aramada seçki, sonuçlarla yarışıyor.
    // Bölüm gezinme yardımı; arama sırasında değil, varsayılan görünümde işe yarıyor.
    if (suzgecEtkin) return [];
    const gosterilen = new Set(gosterilenler.map((i) => i.listing_id || i.id));
    const havuz = listings.filter((i) => !gosterilen.has(i.listing_id || i.id));
    // Dördüncü argüman (gezinme geçmişi) BUGÜN BOŞ — bkz. `utils/secki.js`.
    return seckiUret(havuz, SECKI_KART_SINIRI, acilisZamani);
  }, [tamSayfa, suzgecEtkin, listings, gosterilenler, acilisZamani]);

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
          {/* `/vitrin` kendi sayfası ve kendi `h1`ine sahip olmalı: aynı
              başlığı iki rotada kullanmak hem SEO'da hem ekran okuyucuda
              "aynı sayfa" izlenimi verir. */}
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-100">
            {tamSayfa
              ? 'Vitrindeki Tüm Araçlar'
              : 'Aracın Geçmişini Bilin, Kararınızı Belgeyle Verin'}
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
            className="max-w-2xl mx-auto bg-white p-1 rounded-md border border-slate-700 shadow-lg flex items-center gap-2"
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
            <button type="submit" className="bg-[#0F172A] hover:bg-slate-800 text-white text-yardimci font-semibold px-5 min-h-[44px] rounded-md transition-colors shrink-0 cursor-pointer">
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
                SÜZGEÇ PANELİ — GRUP BAŞLIĞI MANTIĞI
                =================================================================
                Önceki hâlde tek bir "Süzgeçler" kart başlığı vardı ve altındaki
                her şey açıktı. Referans sitelerde böyle bir üst başlık YOK:
                yapıyı GRUP BAŞLIKLARI taşıyor ve gruplar katlanabiliyor
                (arabam.com'da 21 grup, başlıklar arası ~41 px — ölçüldü).

                ⚠ `h2` KALDIRILMADI, GÖRSEL OLARAK GİZLENDİ (`sr-only`). İki
                sebep: (1) `<aside>` bir gezinme bölgesi ve erişilebilir adı
                olmalı, (2) `25-anasayfa.spec.js` başlık sırasını denetliyor —
                h2 silinirse geride kalan h3'ler h1'den sonra atlama üretir.

                Açılış durumu: ilk iki grup açık (Marka ağacı + Sicil Puanı).
                Hepsi kapalı olsaydı kullanıcı hangi süzgeçlerin olduğunu
                görmeden başlardı; hepsi açık olsaydı düzeltmeye çalıştığımız
                uzunluk sorunu geri gelirdi. arabam'da da iki grup açık geliyor.
                ================================================================= */}
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-2xs">
              <h2 className="sr-only">Süzgeçler</h2>

              {/* HIZLI SÜZGEÇLER — akordiyon DIŞINDA, her zaman görünür.
                  Referans sitelerin ikisinde de kenar çubuğunun en üstünde
                  katlanmamış hâlde duruyor ("Acil Acil", "Son 48 Saat"). */}
              <div className="space-y-0.5 pb-3">
                <SuzgecAnahtari
                  etiket="Yalnızca öne çıkanlar"
                  adet={secenekler.oneCikanAdet}
                  acik={suzgec.yalnizOneCikan}
                  degistir={() => suzgecDegistir('yalnizOneCikan', !suzgec.yalnizOneCikan)}
                />
                <SuzgecAnahtari
                  etiket="Son 7 günde eklenen"
                  adet={secenekler.yeniAdet}
                  acik={suzgec.yalnizYeni}
                  degistir={() => suzgecDegistir('yalnizYeni', !suzgec.yalnizYeni)}
                />
              </div>

              {/* ============================================================
                  MARKA AĞACI — KADEMELİ (Marka › Seri › Model › Donanım)
                  ============================================================
                  ⚠ BU BÖLÜM DAHA ÖNCEKİ "marka listesi kaldırıldı" KARARINI
                  GERİ ALIYOR — ama o kararın gerekçesi DÜZ bir listeydi: ~50
                  marka, tek kademe, yer kaplayan ve daraltmayan. Ürün
                  sahibinin istediği bu değil: her adımda ekranda YALNIZCA BİR
                  kademe duruyor (2-10 satır) ve her tıklama ızgarayı ANINDA
                  daraltıyor. Düz liste geri gelmedi.

                  Akordiyon İÇİNDE ve açık geliyor. Her zaman görünür olsaydı
                  kırıntı + 256 px liste kalıcı yer tutar ve Sicil Puanı ekran
                  altına inerdi — düzeltilen sorunun aynısı.

                  Başlık SABİT "Marka", kademeyle DEĞİŞMİYOR: `aria-expanded`
                  taşıyan bir düğmenin adı kullanıcı tıkladıkça değişirse ekran
                  okuyucuda kontrolün kimliği kaybolur. Bulunulan kademe
                  gövdedeki kırıntı ve etiketle anlatılıyor.
                  ============================================================ */}
              <SuzgecAkordiyon baslik="Marka" baslangictaAcik ozet={agacGorunum.ozet}>
                <MarkaAgaci
                  yol={agacGorunum.yol}
                  kademeBasligi={agacGorunum.kademeBasligi}
                  cocuklar={agacGorunum.cocuklar}
                  derinlik={agacGorunum.derinlik}
                  yukleniyor={agacGorunum.yukleniyor}
                  git={agacaGit}
                  sec={agacSec}
                />
              </SuzgecAkordiyon>

              {/* SİCİL PUANI — ürünün ayırt edici alanı, o yüzden marka
                  ağacından hemen sonra ve açık geliyor. Sabit "%80+" çipi
                  kaldırılmıştı (veritabanındaki en yüksek puan 72; o çip daima
                  boş sonuç veriyordu); yerine sayılı bantlar. */}
              <SuzgecAkordiyon
                baslik="Sicil Puanı"
                baslangictaAcik
                ozet={Number(suzgec.sicilEnAz) > 0 ? `${suzgec.sicilEnAz}+` : null}
              >
                {secenekler.sicilBantlari.map(({ esik, adet }) => (
                  <SuzgecSatiri
                    key={esik}
                    etiket={esik === 0 ? 'Tümü' : `${esik} ve üzeri`}
                    adet={adet}
                    secili={Number(suzgec.sicilEnAz) === esik}
                    sec={() => suzgecDegistir('sicilEnAz', esik)}
                  />
                ))}
              </SuzgecAkordiyon>

              {/* ⚠ `baslangictaAcik` KALDIRILDI. Yukarıdaki gerekçe "ilk iki
                  grup açık" diyor; marka ağacı eklenince üçüncü açık grup
                  olurdu ve panel yine uzardı. Yorumun kendi kuralını ihlal
                  eden bir kod, o yorumu güvenilmez yapar. */}
              <SuzgecAkordiyon
                baslik="Model Yılı"
                ozet={[suzgec.yilMin, suzgec.yilMax].filter(Boolean).join('–') || null}
              >
                <AralikGirdisi
                  ad="model yılı"
                  enAz={suzgec.yilMin}
                  enCok={suzgec.yilMax}
                  degistir={(hangi, deger) => suzgecDegistir(hangi === 'enAz' ? 'yilMin' : 'yilMax', deger)}
                />
              </SuzgecAkordiyon>

              {/* KİLOMETRE — YENİ. `km` alanı RPC'den bugün de geliyordu ama
                  hiçbir yerde kullanılmıyordu; referans sitelerin ikisinde de
                  bu süzgeç var. */}
              <SuzgecAkordiyon
                baslik="Kilometre"
                ozet={[suzgec.kmMin, suzgec.kmMax].filter(Boolean).join('–') || null}
              >
                <AralikGirdisi
                  ad="kilometre"
                  birim="km"
                  enAz={suzgec.kmMin}
                  enCok={suzgec.kmMax}
                  degistir={(hangi, deger) => suzgecDegistir(hangi === 'enAz' ? 'kmMin' : 'kmMax', deger)}
                />
              </SuzgecAkordiyon>

              {/* ⚠ MARKA GRUBU KALDIRILDI — ÜRÜN SAHİBİNİN KARARI, VE
                  REFERANS SİTELER DE ONU DOĞRULUYOR.
                  arabam.com'da marka listesi süzgeç akordiyonunun İÇİNDE değil;
                  ayrı bir taksonomi listesi ve yalnızca kategori sayfasında
                  (~50 marka). İki sitenin de ANASAYFASINDA marka listesi yok.
                  Marka aramada kalıyor: kullanıcı yazarak süzebiliyor. */}

              {[
                { baslik: 'Şehir', secenekler: secenekler.sehirler, alan: 'sehir' },
                { baslik: 'Yakıt Tipi', secenekler: secenekler.yakitlar, alan: 'yakit' },
                { baslik: 'Vites Tipi', secenekler: secenekler.vitesler, alan: 'vites' },
              ]
                // Tek seçeneği olan bir süzgeç süzmüyor, yalnızca yer kaplıyor.
                // Projede yerleşik kural: veri yoksa bölüm hiç çizilmiyor.
                .filter((g) => (g.secenekler || []).length >= 2)
                .map((g) => (
                <SuzgecAkordiyon
                  key={g.alan}
                  baslik={g.baslik}
                  ozet={suzgec[g.alan] !== 'Tümü' ? suzgec[g.alan] : null}
                >
                  <SuzgecGrubu
                    secenekler={g.secenekler}
                    tumuAdet={secenekler.tumuAdet}
                    secili={suzgec[g.alan]}
                    sec={(deger) => suzgecDegistir(g.alan, deger)}
                  />
                </SuzgecAkordiyon>
              ))}

              {/* "Sıfırla" EN ALTTA ve yalnızca bir süzgeç etkinken. Üstte
                  olduğunda, hiç süzgeç uygulamamış kullanıcıya da sürekli
                  görünen ölü bir düğmeydi. */}
              {suzgecEtkin && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={suzgecleriSifirla}
                    className={dugme('ikincil', { tamGenislik: true })}
                  >
                    Süzgeçleri sıfırla
                  </button>
                </div>
              )}
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
                <SuzgecCipi
                  etiket={`Son 7 gün (${secenekler.yeniAdet})`}
                  secili={suzgec.yalnizYeni}
                  sec={() => suzgecDegistir('yalnizYeni', !suzgec.yalnizYeni)}
                />
                {/* AKTİF MARKA KIRILIMI — panel KAPALIYKEN tek görünen iz.
                    Panel kapanınca kullanıcı hangi markada olduğunu
                    göremiyordu: bölüm başlığı "Süzgeç sonuçları (N)" diyor
                    ama hangi süzgecin uygulandığını söylemiyor.
                    Tek tıkla ağacın tamamını temizliyor; burada `aria-pressed`
                    DOĞRU rol (basılı = seçim var, tekrar basmak kaldırıyor),
                    o yüzden `basili` geçilmiyor.
                    `ad` görünen metni İÇERİYOR (WCAG 2.5.3). */}
                {agacGorunum.ozet && (
                  <SuzgecCipi
                    etiket={agacGorunum.ozet}
                    secili
                    ad={`${agacGorunum.ozet} — marka kırılımını temizle`}
                    sec={() => agacaGit(0)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSuzgecAcik((a) => !a)}
                  aria-expanded={suzgecAcik}
                  className={`shrink-0 min-h-[44px] px-3.5 rounded-md text-yardimci font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ml-auto ${
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
                /* ⚠ MODAL DEĞİL, AÇILIR PANEL.
                   `role="dialog"` + `aria-modal` EKLENMEYECEK: `04-mobil`
                   paketi mobil çekmeceyi tam o seçiciyle buluyor (satır 112)
                   ve anasayfada ikinci bir eşleşme o testi kırar. Panelin
                   modal olması da gerekmiyor — sayfa akışını kesmiyor. */
                <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 motion-safe:animate-fadeIn">
                  {/* Masaüstüyle AYNI grup sırası ve aynı bileşenler.
                      İki ekranın süzgeç sırası ayrışırsa kullanıcı cihaz
                      değiştirdiğinde yeniden öğrenmek zorunda kalıyor. */}
                  {/* MARKA AĞACI — masaüstüyle AYNI bileşen, AYNI durum.
                      Tek fark `bicim="cip"`: dar ekranda satır listesi yerine
                      sarmalı çipler, `MobilGrup`un kalıbı. */}
                  <SuzgecAkordiyon baslik="Marka" baslangictaAcik ozet={agacGorunum.ozet}>
                    <MarkaAgaci
                      yol={agacGorunum.yol}
                      kademeBasligi={agacGorunum.kademeBasligi}
                      cocuklar={agacGorunum.cocuklar}
                      derinlik={agacGorunum.derinlik}
                      yukleniyor={agacGorunum.yukleniyor}
                      git={agacaGit}
                      sec={agacSec}
                      bicim="cip"
                    />
                  </SuzgecAkordiyon>

                  <SuzgecAkordiyon
                    baslik="Sicil Puanı"
                    baslangictaAcik
                    ozet={Number(suzgec.sicilEnAz) > 0 ? `${suzgec.sicilEnAz}+` : null}
                  >
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
                  </SuzgecAkordiyon>

                  <SuzgecAkordiyon
                    baslik="Model Yılı"
                    ozet={[suzgec.yilMin, suzgec.yilMax].filter(Boolean).join('–') || null}
                  >
                    <AralikGirdisi
                      ad="model yılı"
                      enAz={suzgec.yilMin}
                      enCok={suzgec.yilMax}
                      degistir={(hangi, deger) => suzgecDegistir(hangi === 'enAz' ? 'yilMin' : 'yilMax', deger)}
                    />
                  </SuzgecAkordiyon>

                  <SuzgecAkordiyon
                    baslik="Kilometre"
                    ozet={[suzgec.kmMin, suzgec.kmMax].filter(Boolean).join('–') || null}
                  >
                    <AralikGirdisi
                      ad="kilometre"
                      birim="km"
                      enAz={suzgec.kmMin}
                      enCok={suzgec.kmMax}
                      degistir={(hangi, deger) => suzgecDegistir(hangi === 'enAz' ? 'kmMin' : 'kmMax', deger)}
                    />
                  </SuzgecAkordiyon>

                  {[
                    { baslik: 'Şehir', secenekler: secenekler.sehirler, alan: 'sehir' },
                    { baslik: 'Yakıt Tipi', secenekler: secenekler.yakitlar, alan: 'yakit' },
                    { baslik: 'Vites Tipi', secenekler: secenekler.vitesler, alan: 'vites' },
                  ]
                    .filter((g) => (g.secenekler || []).length >= 2)
                    .map((g) => (
                      <SuzgecAkordiyon
                        key={g.alan}
                        baslik={g.baslik}
                        ozet={suzgec[g.alan] !== 'Tümü' ? suzgec[g.alan] : null}
                      >
                        <MobilGrup
                          secenekler={g.secenekler}
                          secili={suzgec[g.alan]}
                          sec={(deger) => suzgecDegistir(g.alan, deger)}
                        />
                      </SuzgecAkordiyon>
                    ))}

                  {suzgecEtkin && (
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={suzgecleriSifirla}
                        className={dugme('ikincil', { tamGenislik: true })}
                      >
                        Süzgeçleri sıfırla
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            
            {/* =====================================================================
                BÖLÜM SIRASI — SEKTÖR LİDERLERİYLE AYNI HİZADA
                =====================================================================
                Sıra bir tur boyunca vitrin en üstte olacak şekilde denendi
                (gerekçe: öne çıkarma ücreti alınıyor, görünürlük aşağı
                inmemeli). Ürün sahibi iki referans siteyi inceleyip geri
                aldı ve haklıydı:

                  · arabam.com — en üstte BEŞ hizmet kartı (Trink Sat, Arabam
                    Kaç Para?, Sıfır Km Araçlar, Bana Araç Öner, Garaj),
                    ardından "Vitrin" başlığı ve kart ızgarası.
                  · sahibinden.com — sol kenarda hizmet blokları (Oto360,
                    Emlak360), ardından "Anasayfa Vitrini".

                İkisinde de hizmet şeridi vitrinin ÜSTÜNDE. Kullanıcı bu
                düzene alışkın; aşinalık, bizim iç önceliğimizden ağır basıyor.

                Vitrinin görünürlüğü yine korunuyor: hizmet şeridi tek satır
                ve vitrin hemen altında, ilk ekranda kalıyor.

                Sıra: hizmetler -> vitrin -> nereden başlarsınız ->
                nasıl çalışır -> ücretli işlemler.
                ===================================================================== */}
            {/* `/vitrin` sayfasında GİZLİ: orası tek işe odaklı bir liste
                sayfası, platformun beş kapısını orada tekrar göstermek
                kullanıcıyı aradığı işten uzaklaştırırdı. */}
            {!tamSayfa && <h2 className="baslik-bolum text-slate-900">Hizmetler</h2>}

            <div className={`bg-white border border-slate-200 rounded-lg p-3 shadow-2xs select-none ${tamSayfa ? 'hidden' : ''}`}>
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

            {/* ==============================================================
                AYRILMIŞ BOŞLUK — İÇERİK BİLEREK YOK
                ==============================================================
                Burada üç slogan kutusu ve "Aracınızı vitrinde öne çıkarın"
                şeridi vardı; ürün sahibinin kararıyla ikisi de kaldırıldı.

                ⚠ BOŞLUK KAPATILMIYOR, VİTRİN YUKARI ÇEKİLMİYOR — bu da açık
                bir karar ("bu kısım boş kalacak, vitrin ilanlarını buraya
                kaydırma"). Blok silinip yerine hiçbir şey konmasaydı vitrin
                başlığı ~195 px yukarı kayar ve süzgeç panelinin hizasından
                çıkardı; oysa o hizalama korunmak isteniyor.

                ⚠ YALNIZCA GENİŞ EKRANDA (`hidden lg:block`). Hizalanacak iki
                sütun yalnızca `lg` ve üstünde yan yana; dar ekranda sütunlar
                alt alta diziliyor, orada bu boşluk hizalama değil sadece boş
                kaydırma olurdu.

                Yükseklik kaldırılan bloğun ölçülen yüksekliği (171 px).
                ============================================================== */}
            {/* `/vitrin`de yok: orada hizalanacak bir "Hizmetler" bloğu
                bulunmadığı için boşluğun bir işi kalmıyor. */}
            {!tamSayfa && <div className="hidden lg:block lg:h-[170px]" aria-hidden="true" />}

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
                  {/* ⚠ SAYAÇ KALDIRILDI — ürün sahibinin kararı: "sitemiz
                      çok büyüdüğünde yaparız, şuan göstermeyelim". Envanter
                      iki haneliyken sayı göstermek sitenin boyunu ilan
                      ediyordu. Geri geleceği yer burası. */}
                  {suzgecEtkin ? 'Süzgeç sonuçları' : 'Vitrindeki Araçlar'}
                </h2>

                {/* ⚠ ESKİDEN YERİNDE AÇIYORDU (`showAllVitrin`), ARTIK
                    SAYFA DEĞİŞTİRİYOR. Ürün sahibi anasayfanın sınırsız
                    uzamasını reddetti; sığmayanların adresi `/vitrin`.
                    `/vitrin`in kendisinde bu bağ anlamsız, o yüzden gizli. */}
                {!tamSayfa && sonuclar.length > ANASAYFA_KART_SINIRI && (
                  <button
                    type="button"
                    onClick={() => router.push('/vitrin')}
                    className={dugme('sessiz', { ek: 'shrink-0' })}
                  >
                    Tümünü göster
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
                <div className="py-16 flex flex-col items-center justify-center text-center gap-2 bg-white rounded-lg border border-dashed border-slate-200 p-6">
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
                /* ⚠ BU KONUMDA SÜSLÜ PARANTEZLİ JSX YORUMU KULLANILAMAZ.
                   Burası bir ternary'nin ifade dalı, JSX çocuğu değil. JSX
                   yorumu orada NESNE DEĞİŞMEZİ olarak ayrıştırılıyor ve derleme
                   "Expected '</', got 'ident'" ile düşüyor. Düz JS yorumu doğru.

                   (Bir de: blok yorumun İÇİNDE yorum kapatma dizisi yazmak
                   yorumu erken bitiriyor — o da ayrı bir derleme hatası verdi.)

                   ----------------------------------------------------------
                   IZGARA: SABİT SÜTUN SAYISI DEĞİL, `auto-fill`
                   ----------------------------------------------------------
                   (⚠ Bu blok yukarıdaki kuralın canlı örneği: buraya
                   süslü parantezli JSX yorumu yazıldı ve derleme yine
                   "Expected '</', got 'ident'" ile düştü. Düz JS yorumu.)

                   Kırılma noktalı hâl `grid-cols-2 sm:3 md:4 xl:5 2xl:6` idi
                   ve kart genişliği aralıklar arasında SAVRULUYORDU. Ölçüldü:

                     480px → 217px (2 sütun)      900px → 203px (4 sütun)
                     640px → 188px (3 sütun)     1180px → 197px (4 sütun)

                   Ürün sahibinin "kartlar enine çok geniş" tespiti tam bu:
                   `md` aralığı 768-1279 arasını tek bir 4 sütunla karşılıyor,
                   yani aralığın üst ucunda kartlar şişiyor.

                   `auto-fill` genişliği tarayıcıya bırakıyor: asgari 136px
                   veren kaç sütun sığıyorsa o kadar. Ölçülen yeni aralık
                   138-170px — her viewport'ta, tek bir kırılma noktası
                   yazmadan. 1180px'te 197 → 155px ve 4 yerine 5 sütun.
                   Referans yoğunluğu da yakalanıyor: 1280px'te 6 sütun
                   (arabam.com 6, sahibinden.com 7 kullanıyor).

                   ⚠ `auto-fit` DEĞİL. `auto-fit` boş track'leri çökertir:
                   vitrinde iki araç varken kartlar satırı doldurmak için
                   ~450px'e yayılırdı. `auto-fill` boş track'i korur.

                   `sizes` de güncellendi (kart bileşeninin içinde).

                   ----------------------------------------------------------
                   ⚠ `lg:min-h-[938px]` — PANEL BOYU SABİT
                   ----------------------------------------------------------
                   (Bu yorum da düz JS olmak zorunda: ternary dalına süslü
                   parantezli JSX yorumu yazıldı ve derleme yine düştü.
                   Üstelik ilk düzeltme denemesi İKİNCİ tuzağa düştü —
                   yukarıda anlatılan kapatma dizisi bu yorumun içinde
                   birebir yazılınca blok erken bitti. O yüzden burada
                   hiçbir yerde o iki karakter yan yana geçmiyor.)
                    Ürün sahibinin kararı: "az ilan varsa site boyu
                    kısalmamalı". Envanter azaldığında ya da bir süzgeç
                    sonucu daralttığında sayfa boyunun zıplaması, altındaki
                    her şeyin (seçki, "Nasıl çalışır", footer) yer
                    değiştirmesi demek.

                    938 px = 4 satır × 224 px kart + 3 × 14 px boşluk, yani
                    24 kartın 6 sütunda kapladığı yükseklik. `min-height`
                    olduğu için TABAN: dar ekranda 24 kart daha çok satıra
                    yayılınca kutu kendiliğinden büyüyor.

                   ⚠ Yalnızca `lg`: dar ekranda 938 px'lik boş bir kutu
                   hizalama değil, sadece boş kaydırma olurdu. */
                <div className="grid grid-cols-[repeat(auto-fill,minmax(136px,1fr))] gap-3.5 lg:min-h-[938px] content-start">
                  {gosterilenler.map((item, sira) => (
                    <ArabamStyleVitrinCard
                      key={item.kart_id || item.listing_id || item.id}
                      item={item}
                      sira={sira}
                      /* DEMO — GEÇİCİ. Demo kartların arkasında gerçek bir
                         sicil YOK: tıklanabilir olsalar var olmayan bir
                         karneye götürürlerdi ("ölü kapı"), favori ise
                         olmayan bir PIN'i veritabanına yazmaya çalışırdı. */
                      /* Favori PIN'e yazılıyor; PIN'i olmayan kartta kalp
                         hiç çizilmiyor (kart bileşeni `onFavori` yoksa
                         atlıyor). Olmayan bir PIN'i favorilemek sessiz bir
                         veri hatası olurdu. */
                      onSelectVehicle={kartTikla}
                      favorili={karneAcikMi(item) && favoriler.has(item.pin_code)}
                      onFavori={karneAcikMi(item) ? favoriTikla : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* `/vitrin` sayfasında sayfalama: sınırsız `map` bir gün
                binlerce DOM düğümü demek olurdu. Anasayfada bu düğme hiç
                çizilmiyor, orada sınır sabit (24) ve fazlası zaten buraya
                yönlendiriliyor. */}
            {tamSayfa && sonuclar.length > gosterilenler.length && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setSayfaAdet((n) => n + TAM_SAYFA_ADIM)}
                  className={dugme('ikincil')}
                >
                  Daha fazla göster ({sonuclar.length - gosterilenler.length} araç daha)
                </button>
              </div>
            )}

            {/* =====================================================================
                SİZİN İÇİN SEÇTİKLERİMİZ
                =====================================================================
                Vitrinin hemen altında, aynı kart düzeniyle ikinci bir blok.

                ⚠ İÇERİK KURALI GEÇİCİ. Ürün sahibinin planı: "ilk başta
                rastgele ama sonradan kullanıcının gezdiği araçlara göre".
                Bugün tohumlu rastgele seçim yapılıyor; kişiselleştirme
                kancası `utils/secki.js` içinde tek noktada duruyor ve sinyal
                bağlandığında yalnızca orası değişecek.

                ⚠ BAŞLIK `h2`: belge sırası h1 -> h2 -> h3 akıyor, "Vitrindeki
                Araçlar" da h2. İkisi kardeş bölüm, biri diğerinin alt başlığı
                değil.

                ⚠ Boşsa HİÇ ÇİZİLMİYOR. Envanter 24'ün altındayken seçilecek
                araç kalmıyor; boş bir başlık bırakmak "burada bir şey olmalıydı"
                izlenimi verirdi.
                ===================================================================== */}
            {!tamSayfa && !suzgecEtkin && seckiler.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline gap-3 pb-2 border-b border-slate-200 select-none mb-3">
                  <h2 className="baslik-bolum text-slate-900">
                    {/* Sayaç kaldırıldı — vitrin başlığıyla aynı gerekçe. */}
                    Sizin için seçtiklerimiz
                  </h2>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(136px,1fr))] gap-3.5 content-start">
                  {seckiler.map((item, sira) => (
                    <ArabamStyleVitrinCard
                      key={`secki-${item.kart_id || item.listing_id || item.id}`}
                      item={item}
                      /* `sira` 2'den başlıyor: `priority` yalnızca ilk iki
                         görsele veriliyor ve o hak vitrinin ilk satırına ait.
                         Buradaki kartlar ekranın çok altında, tembel yüklenmeli. */
                      sira={sira + 2}
                      onSelectVehicle={kartTikla}
                      favorili={karneAcikMi(item) && favoriler.has(item.pin_code)}
                      onFavori={karneAcikMi(item) ? favoriTikla : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

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
          </section>

        </div>
      </div>

      {/* =====================================================================
          NASIL ÇALIŞIR — ÜRÜNÜ İLK KEZ GÖRENE ANLATAN BÖLÜM
          =====================================================================
          Anasayfada ürünün ne olduğunu anlatan HİÇBİR ŞEY yoktu: bir h1, bir
          arama kutusu ve araç kartları. İlk kez gelen biri bu ürünün ne
          yaptığını öğrenemiyordu.

          ⚠ HİÇBİR DOĞRULAMA İDDİASI YOK. Bu ürün beyanları bağımsız olarak
          doğrulamıyor ve resmi belge bunu açıkça yazıyor. "AI onaylı",
          "blokzincir", "noter onaylı", "%100 doğrulanmış", "TÜVTÜRK ONAYLI"
          gibi ifadeler `16-uydurma-veri` tarafından yasaklı — haklı olarak.
          Metinler yalnızca sistemin GERÇEKTEN yaptığı işi anlatıyor.

          Sıra numarası süs değil: adımlar birbirini gerektiriyor.
          ===================================================================== */}
      {/* ⚠ BEYAZ PANELDEN ÇIKARILDI, FOOTER'A YASLANDI.
          Bölüm DOM sırasında zaten en sondaydı (altında yalnızca
          `(site)/layout.js:28`'deki Footer var) — "çok yukarıda duruyor"
          izlenimi vitrinde iki araç olmasındandı, sıradan değil.
          Yine de kart görünümü onu bir İÇERİK BÖLÜMÜ gibi gösteriyordu;
          artık üstten ince çizgiyle ayrılan sakin bir şerit, yani footer
          bölgesinin bir parçası gibi okunuyor. */}
      <div className={`border-t border-slate-200 mt-6 ${tamSayfa ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
          <div className="space-y-1">
            <h2 className="baslik-bolum text-slate-900">Nasıl çalışır</h2>
            <p className="metin-yardimci text-slate-500">
              Sicil aracın kendi kaydıdır; beyanlardan ve yüklenen belgelerden oluşur.
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none">
            {[
              {
                baslik: 'Aracınızı kaydedin',
                ozet: 'Plaka, kilometre ve poliçe tarihlerini girin. Kayıt tamamlandığında araca ait PIN kodu oluşur.',
              },
              {
                baslik: 'Geçmişi biriktirin',
                ozet: 'Her bakımı servis faturasıyla ekleyin. Sicil puanı, girdiğiniz beyanlar ve yüklediğiniz belgelerden hesaplanır.',
              },
              {
                baslik: 'PIN ile gösterin',
                ozet: 'Karneyi tek bağlantıyla paylaşın. Karşı taraf kaydı olduğu gibi görür.',
              },
            ].map((adim, i) => (
              <li key={adim.baslik} className="flex gap-3">
                <span
                  className="w-7 h-7 rounded-full bg-slate-900 text-white grid place-items-center shrink-0 etiket tabular-nums"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="space-y-1 min-w-0">
                  <h3 className="baslik-kart text-slate-900">{adim.baslik}</h3>
                  <p className="metin-yardimci text-slate-500 leading-relaxed">{adim.ozet}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* ⚠ SAYFADAKI TEK `birincil` DÜĞME — VE YERİ BURASI.
              "Nereden başlarsınız?" bölümü kaldırıldı çünkü iki kartı
              Hizmetler şeridindeki iki kartla AYNI rotalara gidiyordu
              (`/verify` ve `/garage`) — kullanıcıya aynı iki kapı iki kez
              gösteriliyordu.

              Çağrı artık ikna edildiği YERDE: üç adımı okuyup ürünün ne
              yaptığını anlayan kişinin bir sonraki hareketi bu.
              `dugme.js:28` "ekran başına tek birincil" diyor; sayfada başka
              birincil yok, o hak buraya ayrıldı. */}
          <div className="pt-1">
            <button type="button" onClick={onNavigateToGarage} className={dugme('birincil')}>
              Aracımı kaydet
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

// =========================================================================
// 🚀 ARABAM.COM PIXEL-PERFECT VİTRİN KARTI (ArabamStyleVitrinCard)
// =========================================================================
function ArabamStyleVitrinCard({ item, sira = 0, onSelectVehicle, favorili = false, onFavori }) {
  // Karnesi kapalı kart da TIKLANABİLİR: tıklayınca neden açılmadığını
  // söyleyen bir bilgi çıkıyor (`kartTikla`). O yüzden `aria-disabled` yok.
  const karneAcik = Boolean(item.pin_code);
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
      /* ⚠ "sicilini görüntüle" ifadesi KORUNUYOR: test paketi kartları tam
         o alt dizeyle buluyor (`25-anasayfa`, `18-vitrin-gorunurlugu`).
         Karnesi kapalı kartta ad bunu önceden söylüyor, böylece ekran
         okuyucu kullanıcısı tıklamadan önce ne olacağını biliyor. */
      aria-label={`${item.brand || ''} ${item.model || ''} ${item.year || ''} — ${karneAcik ? '' : 'karnesi kapalı, '}sicilini görüntüle`}
      className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-md overflow-hidden shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between select-none p-1 focus-visible:ring-offset-1"
    >
      {/* `h-28` (112 px) — eskiden `h-36` (144 px) idi. Kart 311 px'ten
          ~245 px'e inince vitrine belirgin şekilde daha çok araç sığıyor.
          Oran hâlâ 4:3'e yakın; araç fotoğrafı için doğru çerçeve. */}
      <div className="h-28 w-full bg-[#F1F5F9] rounded flex items-center justify-center overflow-hidden shrink-0 relative">
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
        {/* `sizes` SADELEŞTİ, çünkü ızgara artık `auto-fill minmax(136px,1fr)`.
            Eski hâl her kırılma noktası için ayrı bir dal yazıyordu (`18vw`,
            `170px`, `145px`) ve sütun sayısı her değiştiğinde elle güncellemek
            gerekiyordu — kaçırıldığı an tarayıcı yanlış boyutta görsel indirir.

            `auto-fill` ile kart genişliği artık BİR BANTTA: ölçülen 138-170px
            (480 → 1920 px arası yedi viewport). Üst sınır 170px olduğu için
            tek sabit ölçü doğru cevap; `sizes`in fazla tahmin etmesi güvenli
            (biraz büyük görsel iner), az tahmin etmesi bulanıklık üretir.

            400px altı ayrı: orada ızgara 2 sütuna düşüyor ve kart ~165px, yani
            viewport'un yarısı — `50vw` o aralığı doğru anlatıyor. */}
        <AracGorseli
          src={firstPhoto}
          alt={`${item.brand || ''} ${item.model || ''}`.trim()}
          priority={sira < 2}
          sizes="(max-width: 400px) 50vw, 170px"
        />
        {/* Not: görsel yokluğunda "GÖRSEL YOK" durumu artık `AracGorseli`
            içinde basılıyor — aynı metin, tek yerde. */}
      </div>
      
      <div className="pt-1.5 px-1 pb-0.5 flex-1 flex flex-col justify-between bg-white">
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
          <h3 className="metin-yardimci text-slate-700 leading-snug line-clamp-2 min-h-[30px]">
            {item.listing_title || `${item.brand} ${item.model} ${item.package || ''}`}
          </h3>
        </div>

        {/* Etiket "Güven Karne Skoru" -> "Sicil Puanı": 6 sütunda kart ~148 px
            genişlikte ve uzun etiket sayıyı alt satıra itiyordu (ölçüldü).
            Kısa ad hem sığıyor hem ürünün kendi diline daha yakın. */}
        <div className="mt-1.5 bg-slate-50 border border-slate-200/80 rounded px-2 py-0.5 flex items-center justify-between gap-1">
          <span className="text-etiket text-slate-600 shrink-0">Sicil Puanı</span>
          <span className="text-yardimci font-semibold text-indigo-600 tabular-nums shrink-0">{item.trust_score ?? 0}/100</span>
        </div>

        {/* ⚠ "Sicil karnesini gör" SATIRI KALDIRILDI.
            İki sebebi vardı ve ikisi de ölçülebilir:
            · Kartın KENDİSİ `role="button"` — o satır tıklanabilir bir çağrı
              gibi görünüyor ama ayrı bir hedefi yok. Kullanıcıya ikinci bir
              düğme varmış gibi geliyordu.
            · Yer kaplıyordu: kart 311 px yükseklikteydi; bu satır ve boşluğu
              ~28 px'ini alıyordu. Vitrine mümkün olduğunca çok araç sığmalı.

            ⚠ TUTAR HÂLÂ GÖSTERİLMİYOR — HUKUKİ. Ürüne ait herhangi bir fiyat,
            platformu satış sitesi konumuna sokuyor. Kartın vurgusu bedel değil
            SİCİL; onu da yukarıdaki sicil şeridi taşıyor. */}
      </div>
    </div>
  );
}