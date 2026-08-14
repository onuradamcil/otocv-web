// =========================================================================
// ARAÇ DEVİR ((site)/devir)
//
// -------------------------------------------------------------------------
// NEDEN AYRI BİR SAYFA
// -------------------------------------------------------------------------
// Devretme garajdaki araç kartından yapılabiliyordu. Ama DEVRALMA'nın hiçbir
// bağımsız girişi yoktu: tek yol, ilan sihirbazına girip aracın plakasını
// yazmak ve "bu araç zaten kayıtlı" modalını beklemekti. Yani aracı satın
// almış biri, sicili devralmak için önce ilan vermeye başlamak zorundaydı.
//
// Üst menüdeki "Karne Sorgula" bağlantısı buraya devredildi: karne sorgulama
// anasayfadaki "Künye Sorgula" kartında ve footer'da zaten duruyordu, menüdeki
// üçüncü kopya yer kaplıyordu. Devrin ise hiç girişi yoktu.
//
// -------------------------------------------------------------------------
// SAYFA YENİ MANTIK KURMUYOR
// -------------------------------------------------------------------------
// Üç diyalog da mevcut: AracDevretDialog (satıcı), AracDevralDialog (kod ve
// talep yolu), SahipsizGeriYukleDialog (sahibi hesabını kapatmış araç).
// Burası yalnızca doğru diyaloğa yönlendiriyor. Devir mantığını ikinci kez
// yazmak, iki yerde kayması demekti.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Icon from '@/components/common/icons';
import AracDevretDialog from '@/components/garage/AracDevretDialog';
import AracDevralDialog from '@/components/marketplace/create-listing/AracDevralDialog';
import SahipsizGeriYukleDialog from '@/components/marketplace/create-listing/SahipsizGeriYukleDialog';
import { plakaDurumu, devirOnizleme, devirKoduNormalize } from '@/services/devirService';

/** Plakayı okunur biçime sokar: 34ABC123 -> 34 ABC 123 */
function plakaBicimle(plaka) {
  return (plaka || '')
    .replace(/\s+/g, '')
    .replace(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/, '$1 $2 $3');
}

export default function DevirPage() {
  const router = useRouter();

  const [kullanici, setKullanici] = useState(null);
  const [araclar, setAraclar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Satıcı tarafı
  const [devredilecek, setDevredilecek] = useState(null);
  const [aracFiltresi, setAracFiltresi] = useState('');

  // Alıcı tarafı
  const [plakaGirdi, setPlakaGirdi] = useState('');
  const [aranıyor, setAraniyor] = useState(false);
  const [aramaHatasi, setAramaHatasi] = useState('');
  const [sahipsizPlaka, setSahipsizPlaka] = useState(null);

  // -----------------------------------------------------------------------
  // DEVİR KODU DOĞRUDAN GİRİLEBİLİYOR
  //
  // Bulunan mantık hatası: satıcı devir kodu üretiyordu ama alıcı tarafında
  // yalnızca PLAKA girilebilen bir form vardı. Elindeki kodu yazacak yer
  // yoktu; kullanıcı önce plakayı yazmak, sonra açılan diyalogda "Devir
  // kodum var" seçeneğini bulmak zorundaydı. Kod, kendisi bir kimlik
  // belgesiyken ikinci bir kimliğin (plakanın) arkasına saklanmıştı.
  //
  // `devir_onizleme(kod)` aracı zaten kodun kendisinden çözüyor — plakaya
  // hiç ihtiyaç yok. Eksik olan tek şey giriş alanıydı.
  // -----------------------------------------------------------------------
  const [kodGirdi, setKodGirdi] = useState('');
  const [kodAraniyor, setKodAraniyor] = useState(false);
  const [kodHatasi, setKodHatasi] = useState('');
  const [kodPlaka, setKodPlaka] = useState(null);   // kod çözülünce plaka
  const [gecerliKod, setGecerliKod] = useState('');

  useEffect(() => {
    let iptal = false;

    (async () => {
      const { data: oturum } = await supabase.auth.getUser();
      if (iptal) return;

      const u = oturum?.user ?? null;
      setKullanici(u);

      if (u) {
        // RLS gereği yalnızca kendi araçları geliyor.
        const { data } = await supabase
          .from('vehicles')
          .select('plate_number, brand, model, year, image_url')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false });
        if (!iptal) setAraclar(data || []);
      }

      if (!iptal) setYukleniyor(false);
    })();

    return () => { iptal = true; };
  }, []);

  /**
   * Alıcı plaka yazdığında hangi diyaloğun açılacağını `plaka_durumu`
   * belirliyor. İstemci tahmin etmiyor: "kayıtlı mı, benim mi, sahipsiz mi"
   * kararı sunucuda veriliyor.
   */
  /**
   * Devir kodunu çözer ve devralma diyaloğunu doğrudan kod adımında açar.
   *
   * Kod istemcide ÖNCE normalleştiriliyor: `devirKoduNormalize` karışan
   * karakterleri katlıyor (I/L -> 1, O -> 0) ve alfabe dışı karakteri
   * reddediyor. Böylece elle yazarken yapılan tipik hata sunucuya hiç
   * gitmiyor ve boşuna bir deneme sayılmıyor — devir kodunda kaba kuvvet
   * sayacı var.
   */
  const kodulAra = async (e) => {
    e.preventDefault();
    setKodHatasi('');

    const normal = devirKoduNormalize(kodGirdi);
    if (!normal) {
      setKodHatasi('Devir kodu 8 karakter olmalı. Örnek: DV-A4B7-C2D9');
      return;
    }

    setKodAraniyor(true);
    const r = await devirOnizleme(normal);
    setKodAraniyor(false);

    if (!r.basarili) {
      setKodHatasi(r.hata || 'Bu kod geçerli değil ya da süresi dolmuş.');
      return;
    }

    setGecerliKod(normal);
    setKodPlaka(r.veri?.plaka || '');
  };

  const plakayiAra = async (e) => {
    e.preventDefault();
    setAramaHatasi('');

    const temiz = plakaGirdi.replace(/\s+/g, '').toUpperCase();
    if (temiz.length < 5) {
      setAramaHatasi('Geçerli bir plaka yazın.');
      return;
    }

    setAraniyor(true);
    const durum = await plakaDurumu(temiz);
    setAraniyor(false);

    if (!durum.basarili) { setAramaHatasi(durum.hata); return; }

    if (!durum.veri.kayitli) {
      // Kayıtlı değilse devralınacak bir sicil yok. Kullanıcıyı boş bir
      // diyaloğa sokmak yerine ne yapması gerektiğini söylüyoruz.
      setAramaHatasi('Bu plakaya kayıtlı bir araç yok. Aracı ilk kez kaydediyorsanız "Yeni Araç Kaydet" adımından ilerleyin.');
      return;
    }
    if (durum.veri.benim_mi) {
      setAramaHatasi('Bu araç zaten sizin garajınızda.');
      return;
    }
    if (durum.veri.sahipsiz) {
      setSahipsizPlaka(temiz);
      return;
    }

    // -----------------------------------------------------------------------
    // BAŞKASININ ARACI — BURADA BİTİYOR, SAHİBE HİÇBİR ŞEY GİTMİYOR.
    //
    // Eskiden bu satır `AracDevralDialog`'u açıyor ve kullanıcı oradan araç
    // sahibine "devir talebi" gönderebiliyordu. Talep yolu kaldırıldı; iki
    // sebeple:
    //
    // 1. TACİZ KANALIYDI. Plakalar sokakta görünüyor. Bir plakayı
    //    fotoğraflayan herkes, aracın sahibine bildirim gönderebiliyordu.
    //    Devir kodu ise gerçek bir kanıt: kodu bilen kişi satıcıyla temas
    //    kurmuş demektir.
    //
    // 2. ZATEN İŞLEMİYORDU. Yolun ekrandaki gerekçesi "satıcıya
    //    ulaşamıyorsanız" idi. Ama `devir_talep_karari` araç sahibinin
    //    AKTİF ONAYINI ve rıza metnini istiyor — ulaşılamayan satıcı talebi
    //    de onaylayamaz. Yol, var olma sebebini kendi kendine çürütüyordu.
    //    Satıcı ulaşılabilir olduğunda ise zaten devir kodu üretebiliyor.
    //
    // Yani yol, çalışmayan bir işlev karşılığında çalışan bir taciz kanalı
    // açıyordu. Kullanıcı artık ne yapması gerektiğini öğreniyor, sahibi
    // ise hiçbir şey görmüyor.
    // -----------------------------------------------------------------------
    setAramaHatasi(
      'Bu araç başka bir kullanıcının garajında. Devralmak için aracı devreden ' +
      'kişiden devir kodu isteyin — kodu yukarıdaki alana girip devralabilirsiniz.'
    );
  };

  // Süzme hem plakada hem marka/modelde çalışıyor: kullanıcı aracını
  // "34 ABC" diye de "BMW" diye de arayabilir. Plakadaki boşluklar
  // temizleniyor ki "34ABC" da eşleşsin.
  const filtre = aracFiltresi.trim().toLocaleUpperCase('tr-TR');
  const suzulmusAraclar = !filtre
    ? araclar
    : araclar.filter((a) => {
        const plaka = (a.plate_number || '').replace(/\s+/g, '').toUpperCase();
        const ad = `${a.brand || ''} ${a.model || ''}`.toLocaleUpperCase('tr-TR');
        return plaka.includes(filtre.replace(/\s+/g, '')) || ad.includes(filtre);
      });

  const kart = 'bg-white border border-slate-200 rounded-2xl p-6 space-y-4';

  if (yukleniyor) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-sm text-slate-500 font-medium text-center py-16">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Araç Devir</h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Aracınızı sattığınızda sicili yeni sahibine aktarın; satın aldığınız
          aracın sicilini de buradan devralın. Bakım geçmişi, sicil puanı ve
          belgeler araçla birlikte geçer.
        </p>
      </div>

      {!kullanici ? (
        <div className={kart}>
          <p className="text-sm text-slate-600 font-medium">
            Devir işlemleri için oturum açmanız gerekiyor.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              Hesap Aç
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ---------------- SATICI TARAFI ---------------- */}
          <section className={kart}>
            <div className="space-y-1">
              <h2 className="text-sm font-black text-slate-900">Aracımı devretmek istiyorum</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Aracı seçin, devir kodu üretin ve alıcıya verin. Alıcı kodu
                girdiğinde araç ve sicili ona geçer.
              </p>
            </div>

            {/* Filo sahibinde liste uzuyor: 6'dan fazla araçta arama alanı
                açılıyor ve liste kapaklanıyor. Onlarca araçla sayfa metrelerce
                uzasaydı sağdaki devralma bölümü ekranın dışında kalırdı. */}
            {araclar.length > 6 && (
              <input
                type="text"
                value={aracFiltresi}
                onChange={(e) => setAracFiltresi(e.target.value)}
                placeholder="Plaka ya da model ara…"
                aria-label="Araçlarım içinde ara"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-all"
              />
            )}

            {araclar.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-xl p-4">
                Garajınızda devredilebilecek araç yok.
              </p>
            ) : suzulmusAraclar.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-xl p-4">
                Aramanıza uyan araç yok.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                {suzulmusAraclar.map((a) => (
                  <li key={a.plate_number}>
                    <button
                      type="button"
                      onClick={() => setDevredilecek(a)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left cursor-pointer"
                    >
                      <div className="inline-flex items-center bg-white border-2 border-slate-900 rounded overflow-hidden shrink-0 h-7">
                        <div className="bg-[#003399] text-white px-1.5 h-full flex items-center font-mono font-black text-[9px] border-r border-slate-900">
                          TR
                        </div>
                        <div className="px-2 font-mono font-black text-[11px] text-slate-900 uppercase tracking-wider">
                          {plakaBicimle(a.plate_number)}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate min-w-0">
                        {a.brand} {a.model}
                      </span>
                      {/* Satır içi SVG: ikon kütüphanesinde sağ ok yok ve
                          registry kuralı "kullanılmayan ikon eklenmez" diyor
                          (tek nesne, tree-shake edilmiyor). Header'daki
                          chevron'lar da aynı şekilde satır içi. */}
                      <svg className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-auto" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------------- ALICI TARAFI ---------------- */}
          <section className={kart}>
            <div className="space-y-1">
              <h2 className="text-sm font-black text-slate-900">Aracı devralacağım</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Elinizde devir kodu varsa doğrudan girin. Kod, sicilin
                yalnızca satıcının onayıyla geçtiğinin kanıtı.
              </p>
            </div>

            {/* -------- 1. YOL: DEVİR KODU --------
                Kod, aracı tek başına tanımlıyor: `devir_onizleme(kod)` plakayı
                kodun kendisinden çözüyor. Eskiden bu alan HİÇ YOKTU — satıcı
                kod üretiyordu ama alıcının onu yazacağı bir yer yoktu.
                Kullanıcı önce plakayı yazmak, sonra açılan diyalogda "Devir
                kodum var" seçeneğini bulmak zorundaydı. */}
            <form onSubmit={kodulAra} className="space-y-3 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
              <label htmlFor="devir-kodu" className="block text-xs font-bold text-slate-700">
                Devir kodum var
              </label>
              <input
                id="devir-kodu"
                type="text"
                value={kodGirdi}
                onChange={(e) => { setKodGirdi(e.target.value.toUpperCase()); setKodHatasi(''); }}
                placeholder="DV-A4B7-C2D9"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3.5 py-3 border border-slate-200 bg-white rounded-xl text-sm font-mono font-black tracking-widest text-slate-900 uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-all"
              />

              {kodHatasi && (
                <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3 leading-relaxed">
                  {kodHatasi}
                </p>
              )}

              <button
                type="submit"
                disabled={kodAraniyor || !kodGirdi.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:bg-slate-300 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
              >
                {kodAraniyor ? 'Kod kontrol ediliyor…' : 'Kodu Kullan'}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">veya</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={plakayiAra} className="space-y-3">
              <div>
                <label htmlFor="devir-plaka" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kodum yok — aracın durumunu sorgula
                </label>
                {/* Bu alan araç sahibine HİÇBİR ŞEY GÖNDERMİYOR; yalnızca
                    ne yapılması gerektiğini söylüyor. Talep yolu, plakayı
                    bilen herkesin araç sahibine bildirim göndermesine izin
                    verdiği için kaldırıldı. */}
                {/* NOT: Bu, Step 1/Step 2 sihirbazındaki plaka bileşeni DEĞİL.
                    Onlara dokunulmuyor; bu bağımsız ve sade bir alan. */}
                <input
                  id="devir-plaka"
                  type="text"
                  value={plakaGirdi}
                  onChange={(e) => { setPlakaGirdi(e.target.value.toUpperCase()); setAramaHatasi(''); }}
                  placeholder="34 ABC 123"
                  autoComplete="off"
                  className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-sm font-mono font-black tracking-wider text-slate-900 uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-all"
                />
              </div>

              {aramaHatasi && (
                <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3 leading-relaxed">
                  {aramaHatasi}
                </p>
              )}

              <button
                type="submit"
                disabled={aranıyor}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:bg-slate-300 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
              >
                {aranıyor ? 'Kontrol ediliyor…' : 'Devam'}
              </button>
            </form>

            {/* Üç yolun ne olduğu ÖNCEDEN yazıyor: kullanıcı plakayı
                yazmadan hangi durumda ne olacağını görüyor. */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              {[
                ['Devir kodunuz varsa', 'Aracı devreden kişiden aldığınız kodu girip sicili devralırsınız.'],
                ['Kodunuz yoksa', 'Aracı devreden kişiden istemeniz gerekiyor; sicil yalnızca onun onayıyla geçer.'],
                ['Devreden hesabını kapatmışsa', 'Plakayla sicili geri yükleme yoluna yönlendirilirsiniz.'],
              ].map(([baslik, aciklama]) => (
                <div key={baslik} className="flex items-start gap-2">
                  <span className="text-slate-300 shrink-0 mt-0.5"><Icon name="onay" size="xs" strokeWidth={3} /></span>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    <span className="font-bold text-slate-600">{baslik}:</span> {aciklama}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Karne sorgulama menüden kalktı; buradan erişilebilir kalıyor. */}
      <div className="border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={() => router.push('/verify')}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          Devir yapmadan önce aracın karnesini görmek ister misiniz? PIN ile sorgulayın →
        </button>
      </div>

      {/* ---------------- DİYALOGLAR ---------------- */}
      {devredilecek && (
        <AracDevretDialog
          vehicle={devredilecek}
          onClose={() => setDevredilecek(null)}
          onSuccess={() => setDevredilecek(null)}
        />
      )}

      {/* KOD YOLU: diyalog doğrudan kod adımında ve kod dolu açılıyor.
          Kullanıcı kodu iki kez yazmıyor. */}
      {kodPlaka !== null && (
        <AracDevralDialog
          plaka={kodPlaka}
          baslangicYolu="kod"
          baslangicKodu={gecerliKod}
          onClose={() => { setKodPlaka(null); setGecerliKod(''); }}
          onDevralindi={() => { setKodPlaka(null); setGecerliKod(''); setKodGirdi(''); router.push('/garage'); }}
        />
      )}

      {sahipsizPlaka && (
        <SahipsizGeriYukleDialog
          plaka={sahipsizPlaka}
          onClose={() => setSahipsizPlaka(null)}
          onDevralindi={() => { setSahipsizPlaka(null); router.push('/garage'); }}
        />
      )}
    </div>
  );
}
