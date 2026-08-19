// =========================================================================
// BAKIM PLANLAYICI (/maintenance-planner)
//
// -------------------------------------------------------------------------
// NİYE VAR — İKİNCİ ÖLÜ KAPI
// -------------------------------------------------------------------------
// Anasayfadaki "Bakım Takvimi · Randevu Al" kartı bu rotaya bağlıydı ve
// rota `ComingSoon` yer tutucusuydu. Yani sigorta kartıyla BİREBİR aynı
// kusur: kullanıcıya bir eylem vaat edip "yapım aşamasında" göstermek.
//
// Yer tutucunun kendi vaadi de şuydu: "Kilometre ve tarih bilgilerinize
// göre yaklaşan bakımlarınızı planlayan araç hazırlanıyor."
//
// -------------------------------------------------------------------------
// ⚠ BAKIM ARALIĞI UYDURULMUYOR — EKRANIN EN ÖNEMLİ KISITI
// -------------------------------------------------------------------------
// "Aracınızın bakım zamanı geldi" demek için bakım aralığını bilmek
// gerekiyor. O aralık üreticiye, motora, yakıt tipine ve kullanım
// biçimine göre değişiyor; bizde bu bilgi YOK.
//
// Uydurmak kolay olurdu — "her 15.000 km'de bir" diye sabit bir kural
// yazıp herkese uygulamak. Bu, bu üründen temizlenen kusurun aynısı
// olurdu: karnedeki sabit "Sedan/Benzin/Otomatik", araca bakmadan basılan
// "TÜVTÜRK ONAYLI".
//
// Bu yüzden ekran YALNIZCA bildiği üç şeyi söylüyor:
//   1. Aracın hiç bakım kaydı var mı
//   2. Son bakımın üstünden ne kadar geçti (gerçek tarih)
//   3. Kullanıcı sonraki bakım km'sini KENDİ girdiyse ne kadar kaldı
//
// Üçü de kullanıcının kendi verisi. Ekran hüküm vermiyor, durumu
// gösteriyor ve kararı kullanıcıya bırakıyor.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from './common/icons';
import TrPlaka from './common/TrPlaka';
import GlobalStepLoader from './common/GlobalStepLoader';
import { ozetGetir } from '../services/ozetService';
import { formatTrDate } from '../utils/dateHelper';
import { aktifOrtaklar, demoAcikMi } from '../services/teklifService';
import { KAPSAM_ADI } from '../data/teklifOrtaklari';

/** Binlik ayraçlı km. Sayılar hizalansın diye `tabular-nums` ölçekte var. */
const kmYaz = (n) => (typeof n === 'number' ? n.toLocaleString('tr-TR') : null);

/**
 * Bir aracın bakım durumu.
 *
 * ⚠ SIRALAMA DEĞİL DURUM. Kartlar "en acil" diye sıralanmıyor, çünkü
 * aciliyeti belirleyecek bakım aralığı elimizde yok. Kaydı hiç olmayanlar
 * öne alınıyor — o, aralık bilgisi gerektirmeyen tek nesnel ölçüt.
 */
function BakimKarti({ kayit, onKayitEkle }) {
  const kayitsiz = kayit.kayitSayisi === 0;

  return (
    <article className={`border rounded-lg p-5 space-y-4 ${
      kayitsiz ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <span className="flex items-center gap-3 shrink-0">
          <TrPlaka plaka={kayit.plaka} boyut="sm" />
          {kayitsiz && (
            <span className="etiket px-2 py-1 rounded-lg border bg-amber-100 border-amber-200 text-amber-800">
              Kayıt Yok
            </span>
          )}
        </span>
        {/* ⚠ ARAÇ ADI ARTIK GERÇEK BAŞLIK (h2), ÖNCEDEN `<span>` İDİ.
            Ölçüldü: bu ekranda başlık listesi 10 kez "BUGÜN
            YAPABİLECEKLERİNİZ" gösteriyor ve HİÇ araç adı içermiyordu —
            yani başlıkla içerik yer değiştirmişti. Ekran okuyucuyla
            başlıklar arasında gezen kullanıcı hangi kartta olduğunu
            anlayamıyordu.

            ⚠ SARMALAYICI DA `<span>`DAN `<div>`E ÇEVRİLDİ: `<span>` içine
            `<h2>` koymak geçersiz HTML (öbek öğe, satır içi öğenin
            içinde). İkisi de flex öğesi olduğu için GÖRSEL DEĞİŞİKLİK YOK.
            `block` sınıfı da düştü — `<h2>` zaten öbek. */}
        <div className="min-w-0 flex-1">
          <h2 className="baslik-kart text-slate-900">{kayit.arac || 'Araç'}</h2>
          {kmYaz(kayit.km) && (
            <span className="metin-yardimci text-slate-500 block">
              Güncel kilometre: {kmYaz(kayit.km)} km
            </span>
          )}
        </div>
      </div>

      {/* --- DURUM: yalnızca bilinenler --- */}
      <div className="border-t border-slate-100 pt-4 space-y-1.5">
        {kayitsiz ? (
          <p className="metin-govde text-amber-900">
            Bu araç için henüz bakım kaydı girilmemiş. Kayıt eklendikçe aracın
            sicil puanı yükseliyor ve geçmişi belgeleniyor.
          </p>
        ) : (
          <>
            <p className="metin-govde text-slate-700">
              Son bakım: <strong>{formatTrDate(kayit.sonTarih)}</strong>
              {kayit.gecenAy !== null && (
                <span className="text-slate-500">
                  {' '}· {kayit.gecenAy === 0 ? 'bu ay' : `${kayit.gecenAy} ay önce`}
                </span>
              )}
            </p>
            {kayit.sonServis && (
              <p className="metin-yardimci text-slate-500">
                {kayit.sonServis}
                {kmYaz(kayit.sonKm) && ` · ${kmYaz(kayit.sonKm)} km`}
              </p>
            )}
            <p className="metin-yardimci text-slate-500">
              Toplam {kayit.kayitSayisi} bakım kaydı
            </p>

            {/* ⚠ YALNIZCA KULLANICININ KENDİ BEYANI VARSA.
                `next_service_km` kayıt eklenirken kullanıcının girdiği değer;
                bizim hesabımız değil. Yoksa bu bölüm hiç çizilmiyor —
                boşluğu bir tahminle doldurmuyoruz. */}
            {kayit.kalanKm !== null && (
              <p className={`metin-govde pt-1 ${kayit.kalanKm <= 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                {kayit.kalanKm <= 0
                  ? `Beyan ettiğiniz sonraki bakım km'si (${kmYaz(kayit.hedefKm)} km) geçildi.`
                  : `Beyan ettiğiniz sonraki bakıma ${kmYaz(kayit.kalanKm)} km kaldı.`}
              </p>
            )}
          </>
        )}
      </div>

      {/* --- BUGÜN YAPABİLECEKLERİNİZ --- */}
      <div className="border-t border-slate-100 pt-4 space-y-2">
        <h3 className="etiket text-slate-500">BUGÜN YAPABİLECEKLERİNİZ</h3>
        <button
          type="button"
          onClick={onKayitEkle}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-md
            border border-slate-200 bg-white text-slate-700 hover:bg-slate-50
            metin-yardimci font-semibold transition-colors cursor-pointer"
        >
          <Icon name="anahtar" size="sm" />
          Bakım kaydı ekle
        </button>
      </div>
    </article>
  );
}

export default function BakimEkrani() {
  const router = useRouter();
  const sorgu = useSearchParams();
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [oturumsuz, setOturumsuz] = useState(false);
  const [hata, setHata] = useState('');

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
        title="Bakım geçmişiniz okunuyor"
        subtitle="Araç ve servis kayıtlarınız getiriliyor..."
      />
    );
  }

  if (oturumsuz) {
    return (
      <Cerceve>
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center mx-auto">
            <Icon name="anahtar" size="xl" />
          </div>
          <h1 className="baslik-sayfa text-slate-900">Önce oturum açın</h1>
          <p className="metin-govde text-slate-600 max-w-md mx-auto">
            Bakım geçmişiniz hesabınıza bağlı. Oturum açtığınızda hangi aracın
            ne zaman bakıma girdiğini burada göreceksiniz.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700
              text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
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
        <div className="bg-white border border-rose-200 rounded-lg p-6 text-center space-y-2">
          <h1 className="baslik-bolum text-slate-900">Ekran açılamadı</h1>
          <p className="metin-govde text-slate-600">{hata}</p>
        </div>
      </Cerceve>
    );
  }

  if (!veri || veri.aracSayisi === 0) {
    return (
      <Cerceve>
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center mx-auto">
            <Icon name="arac" size="xl" />
          </div>
          <h1 className="baslik-sayfa text-slate-900">Henüz aracınız yok</h1>
          <p className="metin-govde text-slate-600 max-w-md mx-auto">
            Aracınızı kaydettiğinizde bakım geçmişi ve servis kayıtları burada
            toplanacak.
          </p>
          <button
            type="button"
            onClick={() => router.push('/add-vehicle/step1')}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700
              text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
          >
            <Icon name="arti" size="sm" />
            Yeni Araç Kaydet
          </button>
        </div>
      </Cerceve>
    );
  }

  // Kaydı OLMAYANLAR önde. Bu, bakım aralığı bilgisi gerektirmeyen tek
  // nesnel ölçüt — gerisi için sıralama yapmak tahmin olurdu.
  const detay = [...(veri.bakim.detay || [])].sort((a, b) => {
    if ((a.kayitSayisi === 0) !== (b.kayitSayisi === 0)) return a.kayitSayisi === 0 ? -1 : 1;
    if (!a.sonTarih || !b.sonTarih) return 0;
    return new Date(a.sonTarih) - new Date(b.sonTarih);
  });

  const servisOrtaklari = aktifOrtaklar('bakim', demo);

  return (
    <Cerceve>
      <div className="space-y-5">
        {demo && (
          <div role="status" className="flex items-start gap-3 p-4 rounded-md border border-amber-300 bg-amber-50">
            <Icon name="uyari" size="lg" className="text-amber-700 shrink-0" />
            <div className="min-w-0">
              <p className="baslik-kart text-amber-900">ÖRNEK GÖRÜNÜM</p>
              <p className="metin-yardimci text-amber-800">
                Aşağıdaki servis firmaları gerçek değil, ekranın anlaşmalı ortak
                bağlandığındaki hâlini göstermek için konulmuş örneklerdir.
                Bağlantılar gerçek bir firmaya gitmez.
              </p>
            </div>
          </div>
        )}

        <div>
          <h1 className="baslik-sayfa text-slate-900">Bakım Takvimi</h1>
          <p className="metin-govde text-slate-600 mt-1">
            {veri.bakim.kayitsizArac > 0
              ? `${veri.aracSayisi} aracınızın bakım geçmişi. ${veri.bakim.kayitsizArac} aracın hiç kaydı yok.`
              : `${veri.aracSayisi} aracınızın bakım geçmişi.`}
          </p>
        </div>

        {/* ⚠ EKRANIN SINIRINI SÖYLÜYOR.
            Kullanıcı "bakım takvimi" başlığını görüp "bana ne zaman bakım
            gerektiğini söyleyecek" bekleyebilir. Söyleyemiyoruz ve bunu
            saklamak yerine yazıyoruz. Vaat edilip yapılmayan şey, hiç
            vaat edilmemiş olandan kötüdür. */}
        <div className="flex items-start gap-3 p-4 rounded-md bg-slate-50 border border-slate-200">
          <Icon name="bilgi" size="lg" className="text-slate-500 shrink-0" />
          <p className="metin-yardimci text-slate-600">
            Bakım aralığı aracın markasına, motoruna ve kullanımına göre
            değişiyor. Bu ekran sizin adınıza bir bakım zamanı belirlemiyor;
            girdiğiniz kayıtları ve kendi beyan ettiğiniz sonraki bakım
            kilometresini gösteriyor.
          </p>
        </div>

        <div className="space-y-4">
          {detay.map((k) => (
            <BakimKarti
              key={k.plaka}
              kayit={k}
              onKayitEkle={() => router.push(k.pin ? `/garage/${k.pin}/duzenle` : '/garage')}
            />
          ))}
        </div>

        {/* --- SERVİS ORTAKLARI --- */}
        {servisOrtaklari.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="baslik-bolum text-slate-900">Çalıştığımız servisler</h2>
            <ul className="space-y-2">
              {servisOrtaklari.map((o) => (
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
                        {o.kapsam.map((k) => (
                          <span key={k} className="etiket px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {KAPSAM_ADI[k] || k}
                          </span>
                        ))}
                      </span>
                      {o.not && <span className="metin-yardimci text-slate-600 block mt-1">{o.not}</span>}
                    </span>
                    <span className="inline-flex items-center gap-1.5 shrink-0 metin-yardimci font-semibold
                      text-indigo-700 group-hover:text-indigo-800">
                      Randevu al
                      <Icon name="kure" size="sm" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="metin-yardimci text-slate-500">
              Randevu ve ödeme işlemleri servisin kendi sitesinde tamamlanır;
              bilgileriniz otomatik aktarılmaz.
            </p>
          </section>
        )}
      </div>
    </Cerceve>
  );
}

/** Sayfa çerçevesi — panel ve teklif ekranlarıyla aynı genişlik ve boşluk. */
function Cerceve({ children }) {
  return <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">{children}</div>;
}
