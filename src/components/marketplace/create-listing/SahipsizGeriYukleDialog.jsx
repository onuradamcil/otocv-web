// =========================================================================
// SAHİPSİZ ARAÇ — SİCİL GERİ YÜKLEME DİYALOĞU
//
// Hesabı kapatılan bir kullanıcının aracı silinmiyor: sahip bağı koparılıyor
// ve araç "sahipsiz havuza" düşüyor. Sicili duruyor, kimsenin garajında
// görünmüyor, karnesi PIN'le bile açılmıyor.
//
// -------------------------------------------------------------------------
// İKİ YOL — ve neden ikisi de var
// -------------------------------------------------------------------------
// İlk tasarımda tek yol vardı: ruhsat yükle, biri elle incelesin. Ölçeklemiyor
// — binlerce devirde her birini insan onaylayamaz.
//
// Ama otomatik onayın gerçek riski ödeme değil VERİ: plakayı bilen biri ödeyip
// bir yabancının aracını devralırsa, eski sahibin adı-adresi yazılı fatura
// görselleri de eline geçer. Beyan ve bekleme süresi bunu engellemez, çünkü
// doğrulayacak bir gerçeğimiz yok (şasi, ruhsat seri no, resmî kayıt: hiçbiri
// elimizde değil).
//
// Çözüm zararı onayı zorlaştırarak değil VERİYİ AYIRARAK kaldırmak:
//
//   HIZLI    beyan + ödeme + 7 gün  ->  bakım kayıtları AÇIK, belgeler KAPALI
//   BELGELİ  ruhsat + elle inceleme ->  ikisi de açık
//
// Kötüye kullanılan hızlı yolda ele geçen şey arabaya ait veri oluyor.
// Kişisel veri isteyen ruhsatını gösteriyor ve o yolu seçenlerin sayısı doğal
// olarak küçük kalıyor — insan gücü de orada harcanıyor.
//
// -------------------------------------------------------------------------
// ÖDEME BEKLEME SÜRESİNDEN SONRA ALINIYOR
// -------------------------------------------------------------------------
// Başvuru ücretsiz açılıyor; ödeme 7 gün dolduktan sonra, devralma anında.
// Parayı bir hafta tutup sonra teslim etmek yanlış olurdu.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import useModalErisim from '../../../hooks/useModalErisim';
import Icon from '../../common/icons';
import PaywallDialog from '../../common/PaywallDialog';
import { supabase } from '../../../lib/supabase';
import { gorselSikistir, SIKISTIRMA, IZINLI_BELGE_TURLERI } from '../../../utils/gorselSikistir';
import {
  BEYAN_METNI,
  sahipsizOnizleme,
  sahipsizTalepEt,
  sahipsizOtomatikTamamla,
} from '../../../services/devirService';

// Liste artık burada ELLE YAZILMIYOR. Aynı beş tür `belgeler`,
// `vehicle-invoices` kovalarında ve iki fatura girdisinde de geçerli; ayrı
// yerlerde tutulduğunda birini güncelleyip diğerini unutmak kaçınılmaz.
const IZINLI_TURLER = IZINLI_BELGE_TURLERI;
const EN_BUYUK_BAYT = 10 * 1024 * 1024;

/** Kalan gün sayısı. Geçmişse 0. */
function kalanGun(tarih) {
  if (!tarih) return 0;
  const fark = new Date(tarih).getTime() - Date.now();
  return Math.max(0, Math.ceil(fark / 86_400_000));
}

export default function SahipsizGeriYukleDialog({ plaka, onClose, onDevralindi }) {
  const [onizleme, setOnizleme] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yol, setYol] = useState(null);            // null | 'otomatik' | 'belgeli'
  const [beyanOnayi, setBeyanOnayi] = useState(false);
  const [dosya, setDosya] = useState(null);
  // Ruhsat sıkıştırılırken geçen süre gerçek; kullanıcı dosyanın alınmadığını
  // sanmasın diye ayrı bir durum tutuluyor.
  const [hazirlaniyor, setHazirlaniyor] = useState(false);
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState('');
  const [gonderildi, setGonderildi] = useState(null); // {yol}
  const [paywallAcik, setPaywallAcik] = useState(false);

  // Async iş efektin İÇİNDE: useCallback sınırının arkasındaki await'i linter
  // göremiyor ve senkron setState uyarısı veriyor. useSicil'deki kalıp.
  useEffect(() => {
    let iptal = false;

    (async () => {
      const r = await sahipsizOnizleme(plaka);
      if (iptal) return;
      if (!r.basarili) setHata(r.hata);
      else setOnizleme(r.veri);
      setYukleniyor(false);
    })();

    return () => { iptal = true; };
  }, [plaka]);

  const yenile = async () => {
    const r = await sahipsizOnizleme(plaka);
    if (r.basarili) setOnizleme(r.veri);
  };

  const dosyaSec = async (e) => {
    setHata('');
    const f = e.target.files?.[0];
    if (!f) { setDosya(null); return; }

    // Sunucu da denetliyor (kova sınırları), ama kullanıcı 10 MB'lık dosyayı
    // yükledikten SONRA reddedilmemeli.
    if (!IZINLI_TURLER.includes(f.type)) {
      setHata('Yalnızca JPG, PNG, WEBP, HEIC ya da PDF yükleyebilirsiniz.');
      setDosya(null);
      return;
    }

    // ⚠ SIKIŞTIRMA BOYUT DENETİMİNDEN ÖNCE.
    //
    // Sıra önemli: ruhsat fotoğrafı telefonda rahatlıkla 10 MB'ı geçiyor ve
    // eskiden kullanıcı burada duvara çarpıyordu — üstelik yapabileceği hiçbir
    // şey yoktu, "küçültün" diyen bir araç sunmuyorduk. Küçültme önce
    // yapılınca dosya sınırın altına iniyor ve başvuru tamamlanıyor.
    //
    // Denetim KALDIRILMIYOR: sıkıştırılamayan dosyalar (HEIC, PDF) hâlâ
    // buradan geçiyor ve onlar için sınır geçerli.
    //
    // BELGE profili kullanılıyor (2400 px) — ruhsattaki yazı okunabilir kalmalı.
    setHazirlaniyor(true);
    let secilen = f;
    try {
      const { dosya: hazir } = await gorselSikistir(f, SIKISTIRMA.belge);
      secilen = hazir;
    } finally {
      setHazirlaniyor(false);
    }

    if (secilen.size > EN_BUYUK_BAYT) {
      setHata('Dosya 10 MB’dan büyük olamaz.');
      setDosya(null);
      return;
    }
    setDosya(secilen);
  };

  /** Ruhsatı özel kovaya yükler, yolunu döndürür. */
  const ruhsatYukle = async () => {
    const { data: oturum } = await supabase.auth.getUser();
    const kullanici = oturum?.user;
    if (!kullanici) throw new Error('oturum_yok');

    // Klasör adı kullanıcı kimliği: kova politikası buna bakıyor. Dosya adı
    // tahmin edilemez olmalı — plakadan türetilen bir ad, başkasının
    // belgesini denemeye davetiye olurdu.
    const uzanti = (dosya.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    const yolAdi = `${kullanici.id}/ruhsat_${crypto.randomUUID()}.${uzanti}`;

    const { error } = await supabase.storage
      .from('belgeler')
      .upload(yolAdi, dosya, { contentType: dosya.type, upsert: false });

    if (error) throw error;
    return yolAdi;
  };

  const basvuruGonder = async () => {
    setHata('');
    setIslemde(true);

    try {
      if (yol === 'otomatik') {
        if (!beyanOnayi) { setHata('Devam etmek için beyanı onaylamanız gerekiyor.'); return; }
        const r = await sahipsizTalepEt(plaka, 'otomatik');
        if (!r.basarili) { setHata(r.hata); return; }
        setGonderildi({ yol: 'otomatik' });
      } else {
        if (!dosya) { setHata('Devam etmek için ruhsat yüklemeniz gerekiyor.'); return; }
        const ruhsatYolu = await ruhsatYukle();
        const r = await sahipsizTalepEt(plaka, 'belgeli', { ruhsatYolu });
        if (!r.basarili) { setHata(r.hata); return; }
        setGonderildi({ yol: 'belgeli' });
      }
    } catch (e) {
      console.error('Başvuru gönderilemedi:', e?.message);
      setHata('Belge yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setIslemde(false);
    }
  };

  /** Bekleme süresi dolmuş otomatik başvuruyu ödeme sonrası tamamlar. */
  const devralmayiTamamla = async () => {
    setIslemde(true);
    setHata('');
    const r = await sahipsizOtomatikTamamla(onizleme.talebim.id);
    setIslemde(false);

    if (!r.basarili) { setHata(r.hata); return; }
    onDevralindi?.(r.veri);
  };

  const talep = onizleme?.talebim;
  const kutu = 'bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 relative border border-slate-100 max-h-[90vh] overflow-y-auto';
  const panelRef = useModalErisim(onClose);


  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 animate-fadeIn font-sans antialiased"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Sahipsiz araç geri yükleme penceresi"
    >
      <div className={kutu}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Pencereyi kapat"
          className="absolute top-5 right-5 text-slate-500 hover:text-slate-600 transition-colors w-11 h-11 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <Icon name="kapat" size="md" />
        </button>

        {yukleniyor ? (
          <p className="text-sm text-slate-500 font-medium py-8 text-center">Araç bilgileri getiriliyor…</p>

        ) : gonderildi ? (
          /* ---------- BAŞVURU GÖNDERİLDİ ---------- */
          <div className="space-y-4 text-center pt-1">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Icon name="onay" size="md" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Başvurunuz alındı</h3>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              {gonderildi.yol === 'otomatik'
                ? 'Yedi günlük bekleme süresi başladı. Süre dolduğunda bu ekrandan ödemeyi yapıp sicili garajınıza alabilirsiniz.'
                : 'Ruhsatınız kontrol edilecek. Onaylandığında bildirim alacaksınız.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Tamam
            </button>
          </div>

        ) : talep && talep.durum === 'bekliyor' ? (
          /* ---------- BEKLEYEN BAŞVURU ---------- */
          <div className="space-y-4 pt-1">
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight text-center">
              {talep.yol === 'otomatik' ? 'Bekleme süreniz sürüyor' : 'Başvurunuz inceleniyor'}
            </h3>

            {talep.yol === 'otomatik' ? (
              talep.bekleme_bitti ? (
                <>
                  <p className="text-sm text-slate-500 font-normal leading-relaxed text-center">
                    Bekleme süresi doldu. Ödemeyi tamamladığınızda araç ve geçmiş
                    servis kayıtları garajınıza eklenecek.
                  </p>
                  <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-xl text-xs">
                    <p className="font-bold text-amber-950">Fatura belgeleri kapalı gelecek</p>
                    <p className="text-amber-900/80 font-medium leading-relaxed">
                      Belgeler önceki sahibin kişisel bilgilerini taşıyabilir. Bakım
                      kayıtlarının tamamı açılır; belgeleri açmak için sonradan
                      ruhsatınızı doğrulatabilirsiniz (ek ücret yok).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaywallAcik(true)}
                    disabled={islemde}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:bg-slate-300 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
                  >
                    {islemde ? 'İşleniyor…' : 'Ödemeyi Tamamla ve Devral'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                    <p className="text-3xl font-semibold text-slate-900 tabular-nums leading-none">
                      {kalanGun(talep.tamamlanabilir_at)}
                    </p>
                    <p className="text-yardimci text-slate-500 font-bold uppercase tracking-wide mt-1">
                      gün kaldı
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed text-center">
                    Hızlı yolda yedi günlük bir bekleme süresi var. Süre dolduğunda
                    buradan devralmayı tamamlayabilirsiniz. Şu ana kadar hiçbir
                    ücret alınmadı.
                  </p>
                </>
              )
            ) : (
              <p className="text-sm text-slate-500 font-normal leading-relaxed text-center">
                Yüklediğiniz ruhsat kontrol ediliyor. Onaylandığında bildirim
                alacaksınız ve bakım kayıtları ile fatura belgelerinin tamamı
                garajınıza aktarılacak.
              </p>
            )}

            {hata && (
              <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">{hata}</p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Kapat
            </button>
          </div>

        ) : (
          /* ---------- ÖZET + YOL SEÇİMİ ---------- */
          <div className="space-y-5">
            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Icon name="kalkan" size="md" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-snug">
                Bu aracın sicili sistemde kayıtlı
              </h3>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">
                Aracın kayıtlı sahibi hesabını kapatmış. Servis geçmişi silinmedi —
                aracın sicili duruyor ve size aktarılabilir.
              </p>
            </div>

            {/* Sayılar GERÇEK: veritabanından sayılıyor, tahmin değil. */}
            {onizleme && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <p className="text-sm font-semibold text-slate-900">
                  {onizleme.yil} {onizleme.marka} {onizleme.model}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Bakım kaydı', onizleme.kayit],
                    ['Belgeli', onizleme.faturali],
                    ['Sicil puanı', onizleme.sicil_puani],
                  ].map(([etiket, deger]) => (
                    <div key={etiket} className="bg-white border border-slate-200 rounded-lg py-2">
                      <div className="text-lg font-semibold text-slate-900 tabular-nums">{deger}</div>
                      <div className="text-etiket text-slate-500 font-bold uppercase tracking-wide">{etiket}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YOL SEÇİMİ. Farkı gizlemiyoruz: hızlı yolda belgelerin
                gelmeyeceği seçim anında yazıyor, sonradan sürpriz olmuyor. */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Nasıl devralmak istersiniz?</p>

              {[
                {
                  kod: 'otomatik',
                  baslik: 'Hızlı',
                  ozet: '7 gün bekleme · belge gerekmez',
                  artilar: 'Tüm bakım kayıtları gelir',
                  eksiler: 'Fatura görselleri kapalı kalır',
                },
                {
                  kod: 'belgeli',
                  baslik: 'Ruhsatlı',
                  ozet: 'Ruhsat yüklenir · elle incelenir',
                  artilar: 'Bakım kayıtları ve fatura belgeleri gelir',
                  eksiler: 'İnceleme süresi gerekir',
                },
              ].map((s) => (
                <button
                  key={s.kod}
                  type="button"
                  onClick={() => { setYol(s.kod); setHata(''); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    yol === s.kod
                      ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-400/25'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{s.baslik}</span>
                    <span className="text-yardimci text-slate-500 font-bold">{s.ozet}</span>
                  </div>
                  <p className="text-yardimci text-emerald-700 font-medium mt-1.5">+ {s.artilar}</p>
                  <p className="text-yardimci text-slate-500 font-medium">− {s.eksiler}</p>
                </button>
              ))}
            </div>

            {yol === 'otomatik' && (
              <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beyanOnayi}
                  onChange={(e) => { setBeyanOnayi(e.target.checked); setHata(''); }}
                  className="mt-0.5 w-4 h-4 accent-indigo-600 shrink-0 cursor-pointer"
                />
                {/* Beyan metni TAM görünüyor: hukuki dayanağı bu ve gizlenirse
                    dayanak zayıflar. Metin veritabanında aynen saklanıyor. */}
                <span className="text-yardimci text-slate-600 font-medium leading-relaxed">
                  {BEYAN_METNI}
                </span>
              </label>
            )}

            {yol === 'belgeli' && (
              <div className="space-y-2">
                <label htmlFor="ruhsat-dosya" className="block text-xs font-bold text-slate-700">
                  Araç ruhsatı <span className="text-rose-600">*</span>
                </label>
                <input
                  id="ruhsat-dosya"
                  type="file"
                  accept={IZINLI_TURLER.join(',')}
                  onChange={dosyaSec}
                  disabled={hazirlaniyor}
                  aria-busy={hazirlaniyor || undefined}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                />
                <p className="text-yardimci text-slate-500 leading-relaxed" aria-live="polite">
                  {hazirlaniyor
                    ? 'Belge hazırlanıyor…'
                    : 'JPG, PNG, WEBP, HEIC ya da PDF · en fazla 10 MB. Belgeniz özel alanda saklanır, yalnızca inceleme için görüntülenir.'}
                </p>
              </div>
            )}

            {hata && (
              <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">{hata}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={basvuruGonder}
                disabled={islemde || !yol}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {islemde ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
              </button>
            </div>

            <p className="text-yardimci text-slate-500 leading-relaxed text-center">
              Başvuru ücretsizdir. Ödeme, devralma anında alınır.
            </p>
          </div>
        )}
      </div>

      {/* Ödeme yalnızca bekleme süresi dolduktan sonra. Parayı bir hafta
          tutup sonra teslim etmek yanlış olurdu. */}
      {paywallAcik && (
        <PaywallDialog
          urunKodu="sicil_geri_yukleme"
          onKapat={() => setPaywallAcik(false)}
          onSatinAl={async () => {
            setPaywallAcik(false);
            await devralmayiTamamla();
            await yenile();
          }}
        />
      )}
    </div>
  );
}
