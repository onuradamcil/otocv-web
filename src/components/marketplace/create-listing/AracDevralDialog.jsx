// =========================================================================
// ARAÇ DEVRAL DİYALOĞU — ALICI TARAFI
//
// İki yol, çünkü satıcıya ulaşılıp ulaşılamamasına göre senaryo değişiyor:
//
//   KOD   — satıcı kodu verdi (yüz yüze ya da WhatsApp'tan)
//   TALEP — satıcıya ulaşılamıyor; talep gönderilir, satıcı onaylar
//
// -------------------------------------------------------------------------
// KOD YOLUNDA ÖN İZLEME ŞART
// -------------------------------------------------------------------------
// Kullanıcı kodu girip doğrudan "devral" demiyor. Önce NE DEVRALDIĞINI
// görüyor: marka/model/yıl, kaç bakım kaydı, kaçı belgeli, sicil puanı ve
// satıcının onayladığı rıza metni. Devir geri alınamaz bir işlem; gözü kapalı
// onaylatmak doğru olmazdı.
//
// -------------------------------------------------------------------------
// ⚠ ÖN İZLEME KABA KUVVET SAYACINI TÜKETİYOR
// -------------------------------------------------------------------------
// `devir_onizleme` bir kod oracle'ı ve `devir_tamamla` ile AYNI sayacı
// paylaşıyor (15 dakikada 10 hatalı deneme). Bu yüzden her tuş vuruşunda
// çağrılmıyor — yalnızca kullanıcı açıkça "Devam" dediğinde. Aksi halde
// kullanıcı kodu yazarken kendi sayacını tüketip kendini kilitlerdi.
// Kod biçimi istemcide önce doğrulanıyor; eksik/bozuk kod sunucuya hiç
// gitmiyor ve sayacı harcamıyor.
// =========================================================================

'use client';

import React, { useState } from 'react';
import Icon from '../../common/icons';
import {
  devirKoduNormalize,
  devirOnizleme,
  devirIstekOlustur,
} from '../../../services/devirService';

export default function AracDevralDialog({
  plaka,
  onClose,
  onDevralindi,
  // -----------------------------------------------------------------------
  // KOD YOLUYLA DOĞRUDAN AÇILMA
  //
  // Kullanıcı devir kodunu /devir sayfasında girdiğinde diyalog artık yol
  // seçme ekranından değil, doğrudan kod adımından açılıyor. Kodu bir kez
  // yazıp burada ikinci kez yazmak zorunda kalmak anlamsızdı.
  //
  // `plaka` bu yolda GEREKMİYOR: `devir_onizleme(kod)` aracı kodun
  // kendisinden çözüyor. Plaka yalnızca TALEP yolunda kullanılıyor.
  // -----------------------------------------------------------------------
  baslangicYolu = null,
  baslangicKodu = '',
}) {
  const [yol, setYol] = useState(baslangicYolu);  // null | 'kod' | 'talep'
  const [kodGirdi, setKodGirdi] = useState(baslangicKodu);
  const [mesaj, setMesaj] = useState('');
  const [onizleme, setOnizleme] = useState(null);
  const [sonuc, setSonuc] = useState(null);      // {yeni_pin} | {talep:true}
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState('');

  const normalKod = devirKoduNormalize(kodGirdi);

  const onizlemeAl = async () => {
    setHata('');
    if (!normalKod) {
      // Sunucuya gitmiyor: biçimi bozuk kod kaba kuvvet sayacını harcamamalı.
      setHata('Devir kodu 8 karakter olmalı. Örnek: DV-4G8W-K2GS');
      return;
    }
    setIslemde(true);
    const r = await devirOnizleme(normalKod);
    setIslemde(false);
    if (!r.basarili) { setHata(r.hata); return; }
    setOnizleme(r.veri);
  };

  /**
   * ⚠ ARTIK ARACI DEVRALMIYOR, TALEP AÇIYOR.
   *
   * Eskiden bu düğme aracı ANINDA devralıyordu: araç sahibinin ikinci bir
   * onayı yoktu ve devir ücreti alınmıyordu. Artık üç adım var —
   * istek, araç sahibinin onayı, ücret — ve bu düğme yalnızca ilkini
   * yapıyor. `devir_tamamla` istemciye tamamen kapatıldı ki adımlar
   * atlanamasın.
   */
  const talepGonder = async () => {
    setIslemde(true);
    setHata('');
    const r = await devirIstekOlustur(normalKod);
    setIslemde(false);
    if (!r.basarili) { setHata(r.hata); return; }
    setSonuc({ talep: true, zatenVar: r.veri?.zaten_var === true });
  };

  const kutu = 'bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 relative border border-slate-100';

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 animate-fadeIn font-sans antialiased">
      <div className={kutu}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Pencereyi kapat"
          className="absolute top-5 right-5 w-11 h-11 -m-3 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <Icon name="kapat" size="md" />
        </button>

        {/* ---- SONUÇ EKRANLARI ---- */}
        {sonuc?.talep ? (
          /* TALEP İLETİLDİ EKRANI.
             Eskiden burada "Araç sizin oldu" yazıyordu çünkü devir anında
             tamamlanıyordu. Artık araç GEÇMEDİ; kullanıcıya ne olduğunu ve
             sırada ne olduğunu olduğu gibi söylüyoruz. Beklentiyi yanlış
             kurmak, sonraki adımı "çalışmıyor" gibi gösterirdi. */
          <div className="text-center space-y-4 pt-1">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
              <Icon name="onay" size="lg" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {sonuc.zatenVar ? 'Talebiniz zaten iletilmişti' : 'Talebiniz iletildi'}
              </h3>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">
                Araç sahibinin onayı bekleniyor. Onaylandığında bildirim alacak ve
                devir ücretini ödeyerek işlemi tamamlayabileceksiniz.
              </p>
            </div>
            <ol className="text-left bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              {[
                ['1', 'Talebiniz araç sahibine iletildi', true],
                ['2', 'Araç sahibi onaylıyor', false],
                ['3', 'Devir ücretini ödüyorsunuz (2 gün içinde)', false],
                ['4', 'Araç garajınıza geçiyor', false],
              ].map(([no, metin, tamam]) => (
                <li key={no} className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-black shrink-0 ${
                    tamam ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>{no}</span>
                  <span className={`text-[12px] leading-relaxed ${tamam ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                    {metin}
                  </span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Anladım
            </button>
          </div>
        ) : sonuc?.yeni_pin ? (
          <div className="text-center space-y-4 pt-1">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
              <Icon name="onay" size="lg" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Araç sizin oldu</h3>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">
                Bakım kayıtları ve belgeler araçla birlikte devredildi. Araç artık garajınızda.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Yeni sicil kodu
              </p>
              <p className="text-lg font-black font-mono tracking-widest text-slate-900 select-all">
                {sonuc.yeni_pin}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Aracın eski kodu güvenlik için geçersiz kılındı. Sicili paylaşmak için bu
                yeni kodu kullanın.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDevralindi?.(sonuc)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Garajıma Git
            </button>
          </div>
        ) : sonuc?.talep ? (
          <div className="text-center space-y-4 pt-1">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
              <Icon name="onay" size="lg" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Talebiniz gönderildi</h3>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">
                Araç sahibine bildirim gitti. Onayladığında araç garajınıza geçecek ve size
                bildirim göndereceğiz.
              </p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
              Araç sahibi onaylamadan hiçbir şey değişmez. Ulaşabiliyorsanız ondan bir devir
              kodu istemek en hızlı yol.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Kapat
            </button>
          </div>
        ) : (
          <>
            {/* ---- BAŞLIK ---- */}
            <div className="flex flex-col items-center text-center space-y-3 pt-1">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
                <Icon name="anahtar" size="lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {onizleme ? 'Devralacağınız sicil' : 'Bu aracı devral'}
                </h3>
                <p className="text-sm text-slate-500 font-normal leading-relaxed">
                  {onizleme
                    ? 'Onayladığınızda bu araç ve tüm sicili size geçecek. Bu işlem geri alınamaz.'
                    : 'Bu araç başka bir kullanıcının garajında kayıtlı. Satın aldıysanız sicili devralabilirsiniz.'}
                </p>
              </div>
            </div>

            {hata && (
              <div role="alert" className="bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold rounded-xl p-3 flex items-start gap-2">
                <Icon name="uyari" size="sm" className="shrink-0 mt-0.5" />
                <span>{hata}</span>
              </div>
            )}

            {/* ---- ÖN İZLEME ---- */}
            {onizleme ? (
              <div className="space-y-4">
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-black text-slate-900">
                      {[onizleme.marka, onizleme.model].filter(Boolean).join(' ')}
                      {onizleme.yil ? ` · ${onizleme.yil}` : ''}
                    </p>
                    <span className="font-mono font-black text-xs text-slate-700 shrink-0">
                      {onizleme.plaka}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Bakım kaydı', onizleme.kayit],
                      ['Belgeli', onizleme.faturali],
                      ['Sicil puanı', `${onizleme.sicil_puani}/100`],
                    ].map(([etiket, deger]) => (
                      <div key={etiket} className="bg-white border border-slate-200 rounded-lg py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{etiket}</p>
                        <p className="text-sm font-black font-mono text-slate-900 tabular-nums">{deger}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Araç sahibinin onayladığı metin devralana da gösteriliyor:
                    neyin devredildiği iki taraf için de aynı cümleyle yazılı
                    olsun.

                    ⚠ BAŞLIK "Satıcının onayı" İDİ. İki ayrı kusur vardı:
                    "satıcı" bu üründe yasaklı kelime, ve dil testi bu
                    diyaloğa hiç ulaşmıyor çünkü ancak geçerli kod girilince
                    açılıyor. */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon name="kalkan" size="sm" className="text-slate-500" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Araç sahibinin onayı
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{onizleme.riza_metni}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setOnizleme(null); setHata(''); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    onClick={talepGonder}
                    disabled={islemde}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {islemde ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Devralınıyor...
                      </>
                    ) : 'Onayla ve Devral'}
                  </button>
                </div>
              </div>
            ) : yol === 'kod' ? (
              /* ---- KOD GİRİŞİ ---- */
              <form onSubmit={(e) => { e.preventDefault(); onizlemeAl(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="devir-kodu" className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Aracı devreden kişiden aldığınız devir kodu
                  </label>
                  <input
                    id="devir-kodu"
                    type="text"
                    value={kodGirdi}
                    onChange={(e) => { setKodGirdi(e.target.value); if (hata) setHata(''); }}
                    placeholder="ÖRN: DV-4G8W-K2GS"
                    maxLength={13}
                    autoComplete="off"
                    className="w-full py-4 px-5 bg-slate-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl text-center font-mono font-black text-lg tracking-widest uppercase text-slate-900 outline-none transition-colors placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm placeholder:font-bold"
                  />
                  <p className="text-[11px] text-slate-500">
                    Kod 48 saat geçerlidir ve yalnızca bir kez kullanılabilir.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setYol(null); setHata(''); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Geri
                  </button>
                  <button
                    type="submit"
                    disabled={islemde}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {islemde ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Kontrol ediliyor...
                      </>
                    ) : 'Devam'}
                  </button>
                </div>
              </form>
            /* TALEP DALI KALDIRILDI: yola ulaşan düğme yok ve
               `devir_talep_et` yetkisi veritabanında geri alındı.
               Ulaşılamayan koda dokunulmuş gibi görünmesin diye silindi. */
            ) : (
              /* ---- YOL SEÇİMİ ---- */
              <div className="space-y-3">
                <div className="bg-slate-100/80 p-4 sm:p-5 rounded-xl flex items-center justify-center">
                  <div className="inline-flex items-center bg-white border-2 border-slate-900 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-[#003399] text-white px-3 py-2 flex items-center justify-center font-mono font-black text-xs">
                      TR
                    </div>
                    <div className="px-5 py-2 font-mono font-black text-lg sm:text-xl text-slate-900 uppercase tracking-widest select-all">
                      {plaka}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setYol('kod')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icon name="pinKod" size="sm" />
                  Devir kodum var
                </button>
                {/* "Kodum yok, sahibinden talep et" KALDIRILDI.
                    Plakayı bilen herkesin araç sahibine bildirim
                    göndermesine izin veriyordu ve plakalar sokakta
                    görünüyor. Üstelik yol zaten işlemiyordu: karar
                    fonksiyonu sahibin AKTİF onayını istiyor, yani
                    "ulaşamadığınız" satıcı talebi de onaylayamıyordu.
                    `devir_talep_et` yetkisi veritabanında da geri alındı;
                    çalışmayan bir düğme bırakmamak için arayüzden de
                    kalktı. */}
                <p className="text-[11px] text-slate-500 leading-relaxed text-center pt-1">
                  Devir kodunu, aracı devreden kişi OTO.CV garajından üretip size verir.
                  Sicil yalnızca onun onayıyla geçer.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
