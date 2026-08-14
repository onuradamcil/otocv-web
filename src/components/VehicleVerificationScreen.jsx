// =========================================================================
// OTO-CV MODÜL 4: PREMIUM SORGULAMA VE DOĞRULAMA GEÇİDİ (VehicleVerificationScreen.jsx)
// İşlev: E-devlet/Noter ciddiyetinde CANLI SUPABASE PIN ve simüle QR tarama motoru,
//        blokzincir kanıt matrisi ve 2. kullanıcı (public) rol dağıtım köprüsü.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // 🚀 CANLI BAĞLANTI: Merkezi bulut kalkanı davet edildi
import Icon from './common/icons';
import { pinNormalize } from '../utils/pinUretici';

export default function VehicleVerificationScreen({ onVehicleFound, initialPin = '', initialError = '' }) {
  // =========================================================================
  // 1. BLOK: PORTAL İÇİ REAKTİF DURUM KONTROLLERİ VE HAFIZA ODASI
  // =========================================================================
  const [verifyTab, setVerifyTab] = useState('pin'); // 'pin' | 'qr'
  const [searchPin, setSearchPin] = useState(initialPin);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [loading, setLoading] = useState(false); // Canlı sorgu için siber yükleme zırhı
  const [searchError, setSearchError] = useState(initialError); // Bulunamadı / hata geri bildirimi

  // =========================================================================
  // 2. BLOK: ARKA PLAN RADAR VE CANLI VERİTABANI SORGULAMA MOTORU
  // =========================================================================
  
  // Standart PIN Arama Form Tetikleyicisi
  const handlePinSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchPin.trim()) return;

    // GİRDİ NORMALLEŞTİRME. Boşluk/tire temizler, harfleri büyütür ve
    // alfabe dışı karakteri REDDEDER (boş metin döner).
    const cleanPin = pinNormalize(searchPin);

    if (!cleanPin) {
      setSearchError('PIN biçimi geçersiz. Kod yalnızca harf ve rakam içerir; örnek: CV-4TKMB-9XQ2R');
      return;
    }

    setSearchError('');
    setLoading(true);

    try {
      // `vehicles` TABLOSU DEĞİL, sicil_getir() FONKSİYONU.
      //
      // Tablo artık sahibine özel. Eskiden `select('*').ilike(...)` idi ve
      // iki kusuru vardı: (1) oturum açmamış herkes tablonun tamamını
      // okuyabiliyordu, (2) `ilike` desen karakterlerini yorumluyordu —
      // `CV-%` bütün araçlarla eşleşiyor ve ilk satır dönüyordu.
      //
      // Fonksiyon tek PIN kabul ediyor, girdiyi kendi içinde de doğruluyor
      // ve ziyaretçiye plakayı vermiyor.
      const { data: sicil, error } = await supabase.rpc('sicil_getir', { p_pin: cleanPin });

      if (error) throw error;

      // Hız sınırı: "bulunamadı" mesajı göstermek yalan olurdu.
      if (sicil?.hata === 'cok_fazla_deneme') {
        const dk = Math.ceil((sicil.yeniden_dene_saniye || 600) / 60);
        setSearchError(
          `Kısa süre içinde çok fazla sorgu yapıldı. Yaklaşık ${dk} dakika sonra tekrar deneyin.`
        );
        return;
      }

      if (sicil?.arac) {
        // Rol fonksiyondan geliyor: sahibi kendi aracını sahip olarak açar.
        onVehicleFound(sicil.arac, sicil.arac.sahip_mi ? 'owner' : 'public');
        return;
      }

      setSearchError('Bu PIN koduna ait aktif bir araç kaydı bulunamadı. Kodu kontrol edip tekrar deneyin.');
    } catch (err) {
      console.error('Sorgulama hatası:', err);
      setSearchError('Sorgulama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };


  // =========================================================================
  // QR TARAMA — HENÜZ GERÇEK DEĞİL, ARTIK ÖYLE DAVRANMIYOR
  //
  // Önceki hâli "simülasyon" adı altında şunu yapıyordu:
  //
  //   supabase.from('vehicles').select('*').order('created_at', desc).limit(1)
  //
  // Yani veritabanına EN SON EKLENEN aracı çekip kullanıcıya "QR okundu"
  // diye gösteriyordu. İki sorun:
  //   · Gösterilen araç kullanıcının taradığı araç değil, bir YABANCININ
  //     aracıydı. Ekranda "tescilli araç bulundu" yazıyordu — doğrudan
  //     yanlış beyan.
  //   · Tablo artık sahibine özel olduğu için sorgu zaten boş dönecekti.
  //
  // Gerçek QR okuma bir kamera kütüphanesi gerektiriyor. O gelene kadar
  // düğme dürüstçe "hazır değil" diyor. Var olmayan bir özelliği varmış
  // gibi göstermek, olmadığını söylemekten kötü.
  // =========================================================================
  const triggerQrScannerSimulation = async () => {
    setSearchError('QR ile okuma henüz hazır değil. Şimdilik PIN kodunu elle girebilirsiniz.');
    setVerifyTab('pin');
  };

  // =========================================================================
  // 3. BLOK: PORTAL GÖRSEL ARAYÜZ MİZANPAJI (UX RENDER KATMANI)
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fadeIn space-y-8 select-none">
      
      {/* BAŞLIK VE KÜNYE ALANI */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black tracking-wider uppercase">
          <Icon name="kalkan" size="sm" />
          GÜVENLİ SİCİL SORGULAMA
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Oto-Karne Doğrula</h1>
        <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
          Araç sahibi tarafından paylaşılan benzersiz PIN kodunu girerek ya da tescilli QR barkodunu okutarak bağımsız, doğrulanmış geçmiş raporuna anında ulaşın.
        </p>
      </div>

      {/* SEGMENTED CONTROL SEKMELERİ */}
      <div className="flex justify-center">
        <div className="p-1 bg-slate-100/80 border border-gray-200/50 rounded-2xl flex items-center gap-1 w-full max-w-[380px]">
          <button 
            type="button"
            onClick={() => setVerifyTab('pin')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              verifyTab === 'pin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            PIN Kodu Sorgula
          </button>
          <button 
            type="button"
            onClick={() => setVerifyTab('qr')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              verifyTab === 'qr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.625v1.5m0 3v1.5m-3-3h1.5m-1.5 3h1.5" /></svg>
            QR Kod Tarat
          </button>
        </div>
      </div>

      {/* İKİLİ KOLON YERLEŞİM DÜZENİ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SOL TARAF: FORM VE VİZÖR ALANI */}
        <div className="lg:col-span-7 bg-white border border-gray-200/80 rounded-3xl p-6 md:p-8 shadow-sm min-h-[420px] flex flex-col justify-between">
          {verifyTab === 'pin' ? (
            <div className="space-y-6 animate-fadeIn flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900">Dijital PIN Sorgulama</h2>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Ruhsat sahibinin size ilettiği benzersiz OTO.CV kodunu girin. Bu kod, aracın kilometresini, kaza geçmişini ve servis kayıtlarını tesciller.
                </p>
              </div>

              {/* FORM ETİKETİ EKLENDİ.
                  Önceden <form> yoktu; kullanıcı PIN'i yazıp Enter'a bastığında
                  HİÇBİR ŞEY olmuyordu. Sitenin çekirdek sorgu ekranında en doğal
                  hareket çalışmıyordu. Tarayıcı Enter'ı ancak form içindeki bir
                  submit butonuna iletir. */}
              <form
                onSubmit={(e) => { e.preventDefault(); handlePinSearch(); }}
                className="space-y-6"
              >
              <div className="relative">
                <input 
                  type="text"
                  value={searchPin}
                  // 14: `CV-XXXXX-XXXXX`. Eskiden 9 idi ve yeni biçim PIN'i
                  // SESSİZCE KESİYORDU — kullanıcı doğru kodu yazsa bile
                  // araç bulunamıyordu. Eski 6 haneli PIN'ler de sığıyor.
                  maxLength={14}
                  disabled={loading}
                  onChange={(e) => { setSearchPin(e.target.value); if (searchError) setSearchError(''); }}
                  placeholder="ÖRN: CV-4TKMB-9XQ2R"
                  className="w-full py-5 px-6 bg-slate-50 border-2 border-gray-200 focus:border-indigo-500 rounded-2xl text-center font-mono text-xl font-bold tracking-widest text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all shadow-inner uppercase"
                />
              </div>

              {searchError && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 flex gap-2.5 items-start">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 mt-1.5" />
                  <p className="text-[11px] font-semibold text-rose-700 leading-relaxed">{searchError}</p>
                </div>
              )}


              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#4F46E5] hover:bg-indigo-700 active:scale-98 text-white py-4 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all mt-4"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.642z" /></svg>
                    Araç Sicilini Sorgula
                  </>
                )}
              </button>
              </form>
            </div>
          ) : (
            <div className="space-y-5 animate-fadeIn flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900">Akıllı Barkod & QR Tarama</h2>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Sistemimizdeki resmi belgede basılı olan QR kodunu cihaz kameranız ile taratın. Kimlik eşleşmesi yapılıp rapor otomatik getirilir.
                </p>
              </div>

              <div className="w-full h-56 bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center text-center shadow-inner group">
                {isQrScanning ? (
                  <>
                    <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_#10b981] absolute top-0 left-0 animate-scannerLine z-20" />
                    <div className="absolute inset-0 bg-emerald-950/20 animate-pulse z-10" />
                    <div className="w-16 h-16 border-2 border-dashed border-emerald-400 rounded-xl flex items-center justify-center text-emerald-400 animate-spin text-xs font-black z-30">QR</div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-widest mt-3 animate-pulse z-30">LAZER RADAR TARANIYOR...</span>
                  </>
                ) : (
                  <>
                    <div className="w-28 h-28 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-600 relative select-none">
                      <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                    </div>
                    <span className="text-slate-500 text-[10px] font-bold mt-3 tracking-tight">Aracın OTO.CV sertifikasını taratın</span>
                  </>
                )}
              </div>

              <button 
                type="button"
                onClick={triggerQrScannerSimulation}
                disabled={isQrScanning || loading}
                className={`w-full py-4 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
                  isQrScanning 
                    ? 'bg-emerald-500 text-white cursor-wait shadow-emerald-500/10' 
                    : 'bg-[#4F46E5] hover:bg-indigo-700 text-white active:scale-98 shadow-indigo-600/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /></svg>
                {isQrScanning ? 'Kamera Merceği Hizalanıyor...' : 'Kamerayı Başlat ve Tara'}
              </button>
            </div>
          )}
        </div>

        {/* SAĞ TARAF: BLOKZİNCİR KANIT ROZETLERİ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0B1329] border border-slate-800 p-6 rounded-3xl text-white space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex gap-3 items-start relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286z" /></svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black tracking-wide text-slate-100">Değiştirilemez Blokzincir Sicili</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  OTO.CV aracılığıyla oluşturulan tescil belgeleri, noter onaylı beyanlar ve ekspertiz kayıtları kriptografik imzalarla korunur, geriye dönük asla değiştirilemez.
                </p>
              </div>
            </div>
            <div className="w-full h-px bg-white/5" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 block text-center bg-white/5 py-1.5 rounded-lg border border-white/5">%100 DOĞRULANMIŞ VERİ ALTYAPISI</span>
          </div>

          <div className="bg-white border border-gray-200/80 p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zM11.25 15.75l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zM12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>
              <h4 className="text-xs font-black text-slate-900 tracking-wider uppercase">SORGULAMA NE SAĞLAR?</h4>
            </div>
            <ul className="space-y-3.5 text-[11px] md:text-xs font-semibold text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0 mt-1.5" />
                <div><span className="text-slate-900 font-black">Kilometre Sahtekarlığı Engeli:</span> Periyodik servis faturaları ile km uyumu doğrulanır.</div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0 mt-1.5" />
                <div><span className="text-slate-900 font-black">Hasar (Tramer) Şeffaflığı:</span> Sigorta ve kasko poliçe süreleri ve tescilli hasar durumu gösterilir.</div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0 mt-1.5" />
                <div><span className="text-slate-900 font-black">Blokzincir Güvenliği:</span> Araç sahibinin kendi rızasıyla sisteme aktardığı tescilli resmi evraklar listelenir.</div>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}