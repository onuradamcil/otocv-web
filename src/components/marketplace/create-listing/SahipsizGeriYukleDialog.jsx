// =========================================================================
// SAHİPSİZ ARAÇ — SİCİL GERİ YÜKLEME DİYALOĞU
//
// Hesabı kapatılan bir kullanıcının aracı silinmiyor: sahip bağı koparılıyor
// ve araç "sahipsiz havuza" düşüyor. Sicili duruyor, kimsenin garajında
// görünmüyor, karnesi PIN'le bile açılmıyor.
//
// -------------------------------------------------------------------------
// NEDEN İKİ KAPI VAR — ve neden ödeme tek başına yetmiyor
// -------------------------------------------------------------------------
// 1. RUHSAT + ELLE ONAY  → aracın gerçekten başvuranın olduğunu kanıtlar.
//    ELE GEÇİRMEYİ ENGELLEYEN KONTROL BUDUR. Plakalar sokakta görünür;
//    yalnızca plakayı bilmek bir aracın servis geçmişini ve önceki sahibinin
//    adı-adresi yazılı faturalarını almaya yetmemeli.
//
// 2. ÜCRET → hesabı kapatıp aracı ücretsiz geri alma oyununu bitirir.
//    Ödeme ele geçirmeyi ENGELLEMEZ, yalnızca FİYATLANDIRIR; bu yüzden
//    birinci kapının yerine geçemez. İkisi ayrı işler.
//
// Ücret ONAYDAN SONRA alınıyor: reddedilen başvuruda hiç para alınmadığı için
// iade, itiraz ve ters ibraz süreci hiç doğmuyor.
//
// -------------------------------------------------------------------------
// BU EKRAN NE VAAT ETMİYOR
// -------------------------------------------------------------------------
// Tahsilat altyapısı henüz kurulmadı. Bu yüzden ekran "ödeyin ve alın"
// DEMİYOR; başvurunun elle inceleneceğini ve onaylanırsa ödeme adımının
// bildirileceğini söylüyor. Olmayan bir adımı varmış gibi göstermek, bu
// projede kaldırılan sahte QR tarayıcısıyla aynı hata olurdu.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import Icon from '../../common/icons';
import { supabase } from '../../../lib/supabase';
import { sahipsizOnizleme, sahipsizTalepEt } from '../../../services/devirService';

const IZINLI_TURLER = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const EN_BUYUK_BAYT = 10 * 1024 * 1024;

/** Talep durumunun kullanıcıya gösterilecek hâli. Tek kaynak. */
const DURUM_METNI = {
  bekliyor: {
    baslik: 'Başvurunuz inceleniyor',
    metin: 'Yüklediğiniz ruhsat kontrol ediliyor. Onaylandığında bildirim '
      + 'alacaksınız ve ödeme adımı açılacak. Bu araç için yeni bir başvuru '
      + 'gönderemezsiniz.',
    renk: 'amber',
  },
  onaylandi: {
    baslik: 'Başvurunuz onaylandı',
    metin: 'Ruhsat doğrulandı. Sicili garajınıza almak için ödeme adımı '
      + 'kaldı; hazır olduğunda size bildirilecek.',
    renk: 'emerald',
  },
  reddedildi: {
    baslik: 'Başvurunuz onaylanmadı',
    metin: 'Yüklenen belge aracın size ait olduğunu doğrulamadı. Aynı araç '
      + 'için 7 gün sonra yeniden başvurabilirsiniz.',
    renk: 'rose',
  },
  iptal: {
    baslik: 'Başvurunuz iptal edildi',
    metin: 'Bu başvuru artık geçerli değil. Araç hâlâ sahipsizse yeniden '
      + 'başvurabilirsiniz.',
    renk: 'slate',
  },
};

export default function SahipsizGeriYukleDialog({ plaka, onClose }) {
  const [onizleme, setOnizleme] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [dosya, setDosya] = useState(null);
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState('');
  const [gonderildi, setGonderildi] = useState(false);

  // Async iş efektin İÇİNDE: useCallback sınırının arkasındaki await'i
  // linter göremiyor ve senkron setState uyarısı veriyor. useSicil'de
  // kurulan kalıbın aynısı.
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

  const dosyaSec = (e) => {
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
    if (f.size > EN_BUYUK_BAYT) {
      setHata('Dosya 10 MB’dan büyük olamaz.');
      setDosya(null);
      return;
    }
    setDosya(f);
  };

  const gonder = async () => {
    setHata('');
    if (!dosya) { setHata('Devam etmek için ruhsat yüklemeniz gerekiyor.'); return; }

    setIslemde(true);

    const { data: oturum } = await supabase.auth.getUser();
    const kullanici = oturum?.user;
    if (!kullanici) {
      setIslemde(false);
      setHata('Bu işlem için oturum açmanız gerekiyor.');
      return;
    }

    // Klasör adı kullanıcı kimliği: kova politikası buna bakıyor
    // (belge_yukle_kendi_klasoru). Dosya adı tahmin edilemez olmalı —
    // plakadan türetilen bir ad, başkasının belgesini denemeye davetiye.
    const uzanti = (dosya.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    const yol = `${kullanici.id}/ruhsat_${crypto.randomUUID()}.${uzanti}`;

    const { error: yuklemeHatasi } = await supabase.storage
      .from('belgeler')
      .upload(yol, dosya, { contentType: dosya.type, upsert: false });

    if (yuklemeHatasi) {
      console.error('Ruhsat yüklenemedi:', yuklemeHatasi.message);
      setIslemde(false);
      setHata('Belge yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }

    const r = await sahipsizTalepEt(plaka, yol);
    setIslemde(false);

    if (!r.basarili) { setHata(r.hata); return; }
    setGonderildi(true);
  };

  const kutu = 'bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 relative border border-slate-100';
  const mevcutTalep = onizleme?.talebim;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 animate-fadeIn font-sans antialiased">
      <div className={kutu}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Pencereyi kapat"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors w-11 h-11 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
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
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Başvurunuz alındı</h3>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              Ruhsatınız kontrol edilecek. Onaylandığında bildirim alacaksınız ve
              sicili garajınıza almak için ödeme adımı açılacak.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Tamam
            </button>
          </div>
        ) : mevcutTalep && DURUM_METNI[mevcutTalep.durum] ? (
          /* ---------- ZATEN BİR BAŞVURU VAR ---------- */
          <div className="space-y-4 pt-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight text-center">
              {DURUM_METNI[mevcutTalep.durum].baslik}
            </h3>
            <p className="text-sm text-slate-500 font-normal leading-relaxed text-center">
              {DURUM_METNI[mevcutTalep.durum].metin}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Kapat
            </button>
          </div>
        ) : (
          /* ---------- ÖZET + RUHSAT YÜKLEME ---------- */
          <div className="space-y-5">
            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Icon name="kalkan" size="md" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Bu aracın sicili sistemde kayıtlı
              </h3>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">
                Aracın kayıtlı sahibi hesabını kapatmış. Servis geçmişi silinmedi —
                aracın sicili duruyor ve size aktarılabilir.
              </p>
            </div>

            {/* Sayılar GERÇEK: sicil_getir/sahipsiz_onizleme veritabanından
                sayıyor. Tahmini ya da yuvarlanmış bir değer gösterilmiyor. */}
            {onizleme && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <p className="text-sm font-black text-slate-900">
                  {onizleme.yil} {onizleme.marka} {onizleme.model}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Bakım kaydı', onizleme.kayit],
                    ['Belgeli', onizleme.faturali],
                    ['Sicil puanı', onizleme.sicil_puani],
                  ].map(([etiket, deger]) => (
                    <div key={etiket} className="bg-white border border-slate-200 rounded-lg py-2">
                      <div className="text-lg font-black text-slate-900 tabular-nums">{deger}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{etiket}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-amber-950">Sicili almak için iki adım var</p>
              <p className="text-amber-900/80 font-medium leading-relaxed">
                Önce aracın size ait olduğunu ruhsatla belgelemeniz gerekiyor;
                başvurunuz elle kontrol ediliyor. Onaylandıktan sonra devir
                ücretini ödeyerek sicili garajınıza alırsınız. Onaylanmayan
                başvurudan ücret alınmaz.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="ruhsat-dosya" className="block text-xs font-bold text-slate-700">
                Araç ruhsatı <span className="text-rose-600">*</span>
              </label>
              <input
                id="ruhsat-dosya"
                type="file"
                accept={IZINLI_TURLER.join(',')}
                onChange={dosyaSec}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                JPG, PNG, WEBP, HEIC ya da PDF · en fazla 10 MB. Belgeniz özel
                alanda saklanır, yalnızca inceleme için görüntülenir.
              </p>
            </div>

            {hata && (
              <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">
                {hata}
              </p>
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
                onClick={gonder}
                disabled={islemde || !dosya}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {islemde ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
