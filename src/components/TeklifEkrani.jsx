// =========================================================================
// TEKLİF EKRANI (/insurance-offer)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Bu rota aylarca `ComingSoon` yer tutucusuydu — ama ÖLÜ DEĞİLDİ: anasayfa
// "Sigorta & Kasko · Teklif Al" kartı buraya bağlıydı ve kart
// "Canlı poliçe tekliflerini karşılaştırın" diye bir vaat veriyordu.
// Kullanıcı düğmeye basıyor ve "yapım aşamasında" görüyordu.
//
// Ürün kullanıcıya "kaskon bitiyor" demeyi biliyordu; SONRASINDA NE
// YAPACAĞINI söylemiyordu. Bu ekran o boşluğu dolduruyor.
//
// -------------------------------------------------------------------------
// ⚠ ANLAŞMALI ORTAK YOK — VE BU EKRAN BUNU SAKLAMIYOR
// -------------------------------------------------------------------------
// Sigorta ortağı henüz yok. Dolayısıyla burada:
//   · firma adı YOK
//   · prim/tutar YOK
//   · "en uygun teklif" iddiası YOK
//
// Bunları uydurmak, bu üründen temizlenen kusurun aynısı olurdu: karnede
// sabit yazılmış "Sedan / Benzin / Otomatik", araca bakmadan basılan
// "TÜVTÜRK ONAYLI" rozeti, artıran kodu olmayan favori sayacı.
//
// Onun yerine ekran ÜÇ GERÇEK ŞEY veriyor:
//   1. Durum      — hangi araç, hangi belge, ne zaman doluyor (gerçek veri)
//   2. Bugün      — Google Takvim hatırlatması, muayenede TÜVTÜRK randevusu
//                   (ikisi de bugün çalışıyor)
//   3. Talep      — ortak geldiğinde haber verilmesi için kayıt
//
// Bunun ikinci bir faydası var: sigorta şirketiyle komisyon pazarlığına
// ölçülmüş talep verisiyle oturulur.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from './common/icons';
import TrPlaka from './common/TrPlaka';
import GlobalStepLoader from './common/GlobalStepLoader';
import { ozetGetir } from '../services/ozetService';
import { formatTrDate, generateGoogleCalendarUrl } from '../utils/dateHelper';
import {
  aktifOrtaklar, teklifTalebiOlustur, talepVarMi, demoAcikMi, KAYNAKLAR, TURLER,
} from '../services/teklifService';
import { KAPSAM_ADI } from '../data/teklifOrtaklari';

/** Ekranda aynı anda gösterilen en fazla belge. */
const EN_FAZLA = 6;

/**
 * Tek belge kartı: durum + bugün yapılabilecekler + talep.
 *
 * Her kart kendi talep durumunu tutuyor. Tek bir üst state olsaydı bir
 * araca verilen "Talebiniz alındı" geri bildirimi diğer kartlarda da
 * görünürdü.
 */
function BelgeKarti({ kayit, kaynak, demo }) {
  const [talepli, setTalepli] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    (async () => {
      const v = await talepVarMi(kayit.plaka, kayit.tur);
      if (!iptal) setTalepli(v);
    })();
    return () => { iptal = true; };
  }, [kayit.plaka, kayit.tur]);

  const ortaklar = aktifOrtaklar(kayit.tur, demo);
  const muayene = kayit.tur === 'muayene';

  const takvimUrl = generateGoogleCalendarUrl(
    `${kayit.arac} — ${kayit.belge}`,
    `Oto.CV hatırlatması: ${kayit.plaka} plakalı aracınızın ${kayit.belge.toLowerCase()} `
      + `süresi ${formatTrDate(kayit.tarih)} tarihinde doluyor.`,
    kayit.tarih
  );

  const talepEt = async () => {
    setGonderiliyor(true);
    setHata('');
    const sonuc = await teklifTalebiOlustur(kayit.plaka, kayit.tur, kaynak);
    setGonderiliyor(false);
    if (sonuc.basarili) setTalepli(true);
    else setHata(sonuc.hata);
  };

  return (
    <article className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
      {/* --- DURUM: hepsi gerçek veriden --- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <span className="flex items-center gap-3 shrink-0">
          <TrPlaka plaka={kayit.plaka} boyut="sm" />
          <span className={`etiket px-2 py-1 rounded-lg border shrink-0 ${kayit.durum.bgClass}`}>
            {kayit.durum.text}
          </span>
        </span>
        {/* ⚠ BELGE ADI ARTIK GERÇEK BAŞLIK (h2) — `BakimEkrani` ile aynı
            gerekçe: başlık listesinde yalnızca tekrar eden "BUGÜN
            YAPABİLECEKLERİNİZ" etiketleri görünüyordu, kartın kendi adı
            hiç görünmüyordu. Sarmalayıcı `<span>` → `<div>`, çünkü
            `<span>` içinde `<h2>` geçersiz HTML. Görsel değişiklik yok. */}
        <div className="min-w-0 flex-1">
          <h2 className="baslik-kart text-slate-900">{kayit.belge}</h2>
          <span className="metin-yardimci text-slate-500 block">
            {kayit.arac} · {formatTrDate(kayit.tarih)} tarihinde doluyor
          </span>
        </div>
      </div>

      {/* --- BUGÜN YAPABİLECEKLERİNİZ --- */}
      {/* Bu bölüm her zaman dolu, çünkü içindeki iki iş de BUGÜN çalışıyor.
          Ortak beklemeye gerek yok: kullanıcı en azından tarihi takvimine
          koyabiliyor ve muayeneyse randevusunu alabiliyor. */}
      <div className="border-t border-slate-100 pt-4 space-y-2">
        <h3 className="etiket text-slate-500">BUGÜN YAPABİLECEKLERİNİZ</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={takvimUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-md
              border border-slate-200 bg-white text-slate-700 hover:bg-slate-50
              metin-yardimci transition-colors"
          >
            <Icon name="takvim" size="sm" />
            Takvimime hatırlatma ekle
          </a>

          {muayene && (
            <a
              href="https://www.tuvturk.com.tr"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-md
                bg-slate-900 hover:bg-slate-800 text-white metin-yardimci transition-colors"
            >
              TÜVTÜRK randevusu al
            </a>
          )}
        </div>
      </div>

      {/* --- TEKLİF DURUMU --- */}
      <div className="border-t border-slate-100 pt-4 space-y-2">
        <div>
          <h3 className="etiket text-slate-500">
            {ortaklar.length > 0 ? 'BU ARAÇ İÇİN ÇALIŞTIĞIMIZ FİRMALAR' : 'TEKLİF DURUMU'}
          </h3>
          {/* Hangi araç, hangi belge — bölümün kendi başlığında tekrar
              söyleniyor. Kartın tepesinde de yazıyor ama kullanıcı buraya
              yukarıdan uzun bir kaydırmayla gelebiliyor ve "ben hangi araç
              için bakıyordum" sorusu doğuyor. */}
          {ortaklar.length > 0 && (
            <p className="metin-yardimci text-slate-500 mt-0.5">
              {kayit.arac} · {kayit.belge}
            </p>
          )}
        </div>

        {ortaklar.length > 0 ? (
          // ORTAK VARKEN ÇALIŞAN DAL.
          //
          // ⚠ Firma adı YALNIZCA katalogdan geliyor; bu dosyada sabit yazılı
          // hiçbir firma adı yok. Gerçek ortak `TEKLIF_ORTAKLARI`ye, örnek
          // ortak `ORNEK_ORTAKLAR`a yazılıyor — ekran ikisini ayırt etmiyor,
          // çünkü ayırt etmesi gereken şey KATALOG, ekran değil.
          //
          // ⚠ TUTAR BASILMIYOR. Ne prim, ne "şu kadardan başlayan". Ortak
          // gelse bile tutar göstermek ürünü satış sitesi konumuna sokuyor;
          // yönlendirme modeli seçilmesinin sebeplerinden biri de bu.
          <div className="space-y-3">
            <ul className="space-y-2">
              {ortaklar.map((o) => (
                <li key={o.kod}>
                  <a
                    href={o.yonlendirmeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-4 rounded-md
                      border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40
                      transition-colors group"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="baslik-kart text-slate-900">{o.ad}</span>
                        {/* Kapsam çipleri: firmanın HANGİ belgede çalıştığını
                            söylüyor. Bir sıralama ya da üstünlük iddiası
                            DEĞİL — öyle bir iddia için karşılaştırma verisi
                            gerekir ve bizde yok. */}
                        {o.kapsam.map((k) => (
                          <span key={k} className="etiket px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {KAPSAM_ADI[k] || k}
                          </span>
                        ))}
                      </span>
                      {o.not && <span className="metin-yardimci text-slate-600 block mt-1">{o.not}</span>}
                    </span>

                    <span className="inline-flex items-center gap-1.5 shrink-0 metin-yardimci
                      text-indigo-700 group-hover:text-indigo-800">
                      Teklif al
                      <Icon name="kure" size="sm" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            {/* ⚠ ROL BEYANI — EKRANDA DURMASI ŞART.
                Ürünün işi yönlendirme: kullanıcıya kendi aracına uygun
                firmaları göstermek. Sigorta aracılığı (acentelik/brokerlik)
                Türkiye'de SEDDK lisansına tabi ve bu ürün o işi yapmıyor.
                Kullanıcının nerede kiminle işlem yaptığını bilmesi hem
                dürüstlük hem de bu ayrımın korunması için gerekli.

                ⚠ "satış" KELİMESİ KULLANILMIYOR — yasaklı. "Acente değildir"
                zaten daha kesin bir ifade. */}
            <p className="metin-yardimci text-slate-500">
              Oto.CV bir sigorta acentesi değildir. Teklif ve poliçe işlemleri
              firmanın kendi sitesinde tamamlanır; bilgileriniz otomatik
              aktarılmaz.
            </p>
          </div>
        ) : talepli ? (
          <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-50 border border-emerald-200">
            <Icon name="onay" size="lg" className="text-emerald-700 shrink-0" />
            <p className="metin-govde text-emerald-900">
              Talebiniz alındı. Bu belge için anlaşmalı ortağımız olduğunda
              size bildirim göndereceğiz.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* ⚠ DÜRÜST BOŞLUK. Buraya temsili bir firma listesi koymak
                ekranı doldururdu ama kullanıcıya var olmayan bir hizmeti
                vaat ederdi. */}
            <p className="metin-govde text-slate-600">
              Anlaşmalı sigorta ortağımız henüz yok, bu yüzden burada teklif
              gösteremiyoruz. Hazır olduğunda size haber verelim mi?
            </p>
            <button
              type="button"
              onClick={talepEt}
              disabled={gonderiliyor}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-md
                bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed
                text-white metin-yardimci transition-colors cursor-pointer"
            >
              <Icon name="zil" size="sm" />
              {gonderiliyor ? 'Kaydediliyor...' : 'Hazır olunca haber verin'}
            </button>
            {hata && <p className="metin-yardimci text-rose-700">{hata}</p>}
          </div>
        )}
      </div>
    </article>
  );
}

export default function TeklifEkrani() {
  const router = useRouter();
  const sorgu = useSearchParams();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [oturumsuz, setOturumsuz] = useState(false);
  const [hata, setHata] = useState('');

  // Hangi kapıdan gelindiği. Geçersiz bir değer gelirse `panel` sayılıyor —
  // RPC zaten listeyi denetliyor, burada da denetlenerek talep sessizce
  // düşmüyor.
  const gelenKaynak = sorgu.get('kaynak');
  const kaynak = KAYNAKLAR.includes(gelenKaynak) ? gelenKaynak : 'panel';

  const istenenPlaka = (sorgu.get('plaka') || '').toUpperCase();
  const gelenTur = sorgu.get('tur');
  const istenenTur = TURLER.includes(gelenTur) ? gelenTur : null;

  // -------------------------------------------------------------------------
  // DEMO GÖRÜNÜMÜ — `?demo=1`
  //
  // Anlaşmalı ortak gelmeden ekranın DOLU hâli görülebilsin diye. İki kural
  // birlikte çalışıyor ve ikisi de zorunlu:
  //   1. Yalnızca adres çubuğunda `demo=1` varken açılıyor. Varsayılan
  //      davranış değişmiyor; gerçek kullanıcı bunu kazayla göremiyor.
  //   2. Açıkken ekranın en üstünde KALICI bir uyarı şeridi duruyor ve
  //      firma adları "Örnek" ile başlıyor.
  //
  // ⚠ Şeridi kapatılabilir yapmadım. Kapatılabilen bir demo uyarısı, ekran
  // görüntüsü alınırken kapatılır ve gerçek sanılır.
  //
  // ⚠ PARAMETRE TEK BAŞINA YETMİYORDU. Kullanıcı garajdaki çipten, panelden
  // ya da bildirimden geldiğinde `?demo=1` TAŞINMIYOR; yani demo tam da
  // denenmek istenen akışta hiç çalışmıyordu. Artık ortam değişkeni de
  // açabiliyor — bkz. `demoAcikMi`.
  // -------------------------------------------------------------------------
  const demo = demoAcikMi(sorgu.get('demo') === '1');

  useEffect(() => {
    let iptal = false;
    (async () => {
      const sonuc = await ozetGetir();
      if (iptal) return;
      if (!sonuc.basarili) {
        if ((sonuc.hata || '').includes('Oturum')) setOturumsuz(true);
        else setHata(sonuc.hata || 'Bilgileriniz yüklenemedi.');
      } else {
        setVeri(sonuc.veri);
      }
      setYukleniyor(false);
    })();
    return () => { iptal = true; };
  }, []);

  if (yukleniyor) {
    return (
      <GlobalStepLoader
        isLoading
        title="Belgeleriniz okunuyor"
        subtitle="Poliçe ve muayene tarihleriniz getiriliyor..."
      />
    );
  }

  if (oturumsuz) {
    return (
      <Cerceve>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center mx-auto">
            <Icon name="kalkan" size="xl" />
          </div>
          <h1 className="baslik-sayfa text-slate-900">Önce oturum açın</h1>
          <p className="metin-govde text-slate-600 max-w-md mx-auto">
            Poliçe ve muayene tarihleriniz hesabınıza bağlı. Oturum açtığınızda
            hangi belgenin ne zaman dolduğunu burada göreceksiniz.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700
              text-white font-semibold text-mini rounded-md transition-colors cursor-pointer"
          >
            Oturum aç
          </button>
        </div>
      </Cerceve>
    );
  }

  if (hata) {
    return (
      <Cerceve>
        <div className="bg-white border border-rose-200 rounded-lg shadow-sm p-6 text-center space-y-2">
          <h1 className="baslik-bolum text-slate-900">Ekran açılamadı</h1>
          <p className="metin-govde text-slate-600">{hata}</p>
        </div>
      </Cerceve>
    );
  }

  if (!veri || veri.aracSayisi === 0) {
    return (
      <Cerceve>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center mx-auto">
            <Icon name="arac" size="xl" />
          </div>
          <h1 className="baslik-sayfa text-slate-900">Henüz aracınız yok</h1>
          <p className="metin-govde text-slate-600 max-w-md mx-auto">
            Aracınızı kaydedip poliçe tarihlerini girdiğinizde, süresi
            yaklaşan belgeleriniz burada toplanacak.
          </p>
          <button
            type="button"
            onClick={() => router.push('/add-vehicle/step1')}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700
              text-white font-semibold text-mini rounded-md transition-colors cursor-pointer"
          >
            <Icon name="arti" size="sm" />
            Yeni Araç Kaydet
          </button>
        </div>
      </Cerceve>
    );
  }

  // -------------------------------------------------------------------------
  // HANGİ BELGELER GÖSTERİLECEK
  //
  // Adres bir araç ve belge işaret ediyorsa YALNIZCA o gösteriliyor:
  // kullanıcı garajdaki uyarıdan buraya "kaskom için" geldi, karşısına altı
  // satırlık liste çıkarsa niye geldiğini yeniden aramak zorunda kalır.
  //
  // İşaret yoksa önce kritikler; kritik yoksa tarihi en yakın olanlar.
  // Boş bir ekran göstermek yerine sıradaki işi gösteriyor.
  // -------------------------------------------------------------------------
  const hepsi = veri.tumTarihler || [];
  const istenen = (istenenPlaka && istenenTur)
    ? hepsi.filter((t) => t.plaka === istenenPlaka && t.tur === istenenTur)
    : [];

  const yedek = veri.kritikler.length > 0
    ? veri.kritikler
    : [...hepsi].sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

  const gosterilecek = (istenen.length > 0 ? istenen : yedek).slice(0, EN_FAZLA);
  const odakli = istenen.length > 0;

  return (
    <Cerceve>
      <div className="space-y-5">
        {demo && (
          <div
            role="status"
            className="flex items-start gap-3 p-4 rounded-md border border-amber-300 bg-amber-50"
          >
            <Icon name="uyari" size="lg" className="text-amber-700 shrink-0" />
            <div className="min-w-0">
              <p className="baslik-kart text-amber-900">ÖRNEK GÖRÜNÜM</p>
              <p className="metin-yardimci text-amber-800">
                Aşağıdaki sigorta firmaları gerçek değil, ekranın anlaşmalı ortak
                bağlandığındaki hâlini göstermek için konulmuş örneklerdir.
                Bağlantılar gerçek bir firmaya gitmez.
              </p>
            </div>
          </div>
        )}

        <div>
          <h1 className="baslik-sayfa text-slate-900">Sigorta ve Muayene Yenileme</h1>
          <p className="metin-govde text-slate-600 mt-1">
            {odakli
              ? 'Seçtiğiniz belge için durum ve yapabilecekleriniz.'
              : veri.kritikler.length > 0
                ? 'Süresi dolmuş ya da 30 günden az kalmış belgeleriniz.'
                : 'Süresi en yakında dolacak belgeleriniz.'}
          </p>
        </div>

        {odakli && (
          <button
            type="button"
            onClick={() => router.push('/insurance-offer')}
            className="inline-flex items-center gap-2 metin-yardimci
              text-indigo-700 hover:text-indigo-800 cursor-pointer"
          >
            <Icon name="geri" size="sm" />
            Tüm belgelerimi göster
          </button>
        )}

        {gosterilecek.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-md bg-emerald-50 border border-emerald-200">
            <Icon name="onay" size="lg" className="text-emerald-700 shrink-0" />
            <p className="metin-govde text-emerald-900">
              Takip edilen bir belge tarihi bulunmuyor. Araç kayıtlarınıza poliçe
              ve muayene tarihlerini girdiğinizde burada görünecek.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {gosterilecek.map((k) => (
              <BelgeKarti key={`${k.plaka}-${k.tur}`} kayit={k} kaynak={kaynak} demo={demo} />
            ))}
          </div>
        )}

        {/* ⚠ AÇIK SÖZLEŞME. Kullanıcı bir talep bırakırken bu bilginin
            ekranda olması gerekiyor: verisinin ne olacağını bilmeli.
            Seçilen model yönlendirme — üçüncü tarafa kişisel veri
            aktarılmıyor. */}
        <p className="metin-yardimci text-slate-500 border-t border-slate-200 pt-4">
          Talep bıraktığınızda yalnızca hangi aracınız için hangi belgeyi
          takip ettiğiniz kaydedilir. Ad, telefon ve e-posta bilgileriniz
          üçüncü taraflarla paylaşılmaz.
        </p>
      </div>
    </Cerceve>
  );
}

/** Sayfa çerçevesi — panel ve garaj ekranlarıyla aynı genişlik ve boşluk. */
function Cerceve({ children }) {
  return <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">{children}</div>;
}
