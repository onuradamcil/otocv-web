// =========================================================================
// OTO-CV TAŞIT BAKIM VE BEYAN SİCİLİ (OfficialReportView.jsx)
// İşlev: A4 döküman düzeni. Header içermez.
//
// BELGENİN İLKESİ — bu dosyada değişiklik yapacak olan okusun:
// Belgeye yalnızca ÜÇ kaynaktan veri girer ve her satır kaynağını yazar:
//   Hesaplandı          Oto.CV'nin kendi kayıtlarından türetilmiş bulgu
//   Araç sahibi beyanı  kullanıcının girdiği, doğrulanmamış bilgi
//   Belgeli             arkasında yüklenmiş fatura görseli olan kayıt
//
// Dördüncü kaynak yoktur. Tahmin, uydurma varsayılan ve sorgulanmamış kurum
// beyanı belgeye GİRMEZ. Bilgi yoksa yokluğu yazılır.
//
// Bu ilke sonradan konuldu, çünkü belge önceden şunları yapıyordu:
//   - hasarlı aracı "Kayıt Bulunmamaktadır (Temiz)" diye beyan ediyordu
//   - kilometre geriye giden araca "Kilometre Verisi Tutarlı" yazıyordu
//   - sorgulamadığı halde TÜVTÜRK, haciz/rehin ve UYAP sonucu basıyordu
//   - olmayan kolonlardan uydurma VIN ve motor numarası üretiyordu
//   - tarih yoksa "12/12/2029", renk yoksa "Metalik Siyah" yazıyordu
// =========================================================================

'use client';

import React from 'react';
import { tramerDurumu, tramerMetni, TRAMER_DURUM } from '../../utils/tramerHelper';
import { formatTrDate } from '../../utils/dateHelper';
import {
  kilometreTutarliligi, kilometreMetni, kayitSurekliligi,
  muayeneBeyanDurumu, beyanDegeri, KAYNAK,
} from '../../utils/karneHelper';

export default function OfficialReportView({ vehicle, maintenanceRecords = [], isPublicView = false }) {
  // =========================================================================
  // 1. BLOK: SAF BULUT SÖZLEŞME VE BİLGİ HARİTALAMA GEÇİDİ
  // =========================================================================
  const score = vehicle?.trust_score ?? 0;
  
  // 🚀 SİBER ENTEGRASYON: Eski 4 haneli geçici fallback yok edildi, canlı bulut kodu mühürlendi!
  const pinCode = vehicle?.pin_code || 'CV-PENDING';
  
  // 🔒 KVKK: Resmi sicil belgesi ziyaretçiye de açık olduğu için plaka yalnızca
  // ruhsat sahibine gösterilir. Belgenin doğrulama işlevini PIN kodu üstlenir.
  //
  // Neden burada satır silinmiyor: bu bir resmi evrak düzeni. Eksik satır
  // belgeyi kusurlu gösterir, oysa sebebi yazan bir değer okuyucuyu bilgilendirir.
  // Künye tablolarında ise satır tamamen kaldırılıyor, çünkü orada yokluk nötrdür.
  const plateNumber = isPublicView
    ? 'KVKK kapsamında paylaşılmaz'
    : (vehicle?.plate_number || 'Tescilli Plaka');
  // VIN / MOTOR NO / RUHSAT SERİ NO SATIRLARI KALDIRILDI.
  //
  // Önceden şöyleydi:
  //   const vin            = vehicle?.vin            || 'WBA0M3T2MGM******';
  //   const engineNumber   = vehicle?.engine_number  || 'N20B20A******';
  //   const registrationNo = vehicle?.registration_no|| 'AA012345';
  //
  // Bu üç kolon veritabanında YOK. Yani yedek değer bir "yedek" değildi;
  // her araçta, her zaman basılan uydurma bir maskeydi ve gerçek veri
  // girmesinin bir yolu bile bulunmuyordu. Resmi görünen bir belgeye
  // olmayan bir şasi numarası yazmak, belgenin tamamının güvenilirliğini
  // düşürür. Alanlar toplanmaya başlandığında satırlar geri eklenir.
  const tramer = vehicle?.tramer_status || 'Beyan edilmemiş';

  // Hasar bulgusunun BELGE İÇİNDEKİ görsel durumu. Üç değerli olması şart:
  // beyan edilmemiş bir alanı "temiz" gibi yeşil basmak, belge adına
  // yapılmamış bir iddiada bulunmak olur.
  const tramerSatirDurumu =
    tramerDurumu(vehicle) === TRAMER_DURUM.VAR ? 'dikkat'
    : tramerDurumu(vehicle) === TRAMER_DURUM.YOK ? 'iyi'
    : 'bilinmiyor';
  const kmValue = vehicle?.km ?? 0;
  const formattedKm = kmValue.toLocaleString('tr-TR');
  
  // UYDURMA VARSAYILANLAR KALDIRILDI.
  //
  // Önceden veri yoksa belgeye teknik özellik UYDURULUYORDU:
  //   fuel_type    || 'Benzin / Hibrit'
  //   transmission || 'Otomatik vites'
  //   color        || 'Metalik Siyah'
  //   package      || 'Standart Donanım Paketi'
  //
  // Bu kuramsal bir sorun değil: canlı veride 06ONR97 plakalı aracın yakıt,
  // vites ve renk alanları BOŞ — o araç için belge üç uydurma özellik
  // basıyordu. Alıcı belgede "Benzin" görüp dizel bir araç satın alabilirdi.
  const brand = beyanDegeri(vehicle?.brand, 'Beyan edilmemiş');
  const model = beyanDegeri(vehicle?.model, 'Beyan edilmemiş');
  const packageStr = beyanDegeri(vehicle?.package, 'Donanım paketi beyan edilmemiş');
  const fuelType = beyanDegeri(vehicle?.fuel_type);
  const transmission = beyanDegeri(vehicle?.transmission);
  const color = beyanDegeri(vehicle?.color);
  // Araç sınıfı sabit 'M1 / D Segment' yazıyordu. Artık mevcut body_type
  // kolonuna bağlı; o kolon şu an tüm araçlarda boş, yani satır dürüstçe
  // "Beyan edilmemiş" gösterecek. Uydurma bir segment yazmaktan iyidir.
  const kasaTipi = beyanDegeri(vehicle?.body_type);

  // Muayene beyanı bakım kayıtlarına bağlı olmadığı için burada hesaplanabilir.
  // Kilometre ve süreklilik bulguları kayıtlara bağlı; onlar recordsSource
  // tanımlandıktan sonra, 2. blokta hesaplanıyor.
  const muayene = muayeneBeyanDurumu(vehicle);

  // =========================================================================
  // 2. BLOK: REAKTİF BİLANÇO MOTORU (TOTAL SERMİYE BÜTÇE DÖNGÜSÜ)
  // =========================================================================
  const recordsSource = maintenanceRecords.length > 0 
    ? maintenanceRecords 
    : (vehicle?.maintenance_records || []);

  const totalMaintenanceCost = recordsSource.reduce((sum, item) => {
    if (!item.cost) return sum;
    const cleanCost = typeof item.cost === 'string' 
      ? parseInt(item.cost.replace(/\./g, ''), 10) 
      : parseInt(item.cost, 10);
    return sum + (isNaN(cleanCost) ? 0 : cleanCost);
  }, 0);

  const formattedTotalCost = `₺${totalMaintenanceCost.toLocaleString('tr-TR')}`;

  // =========================================================================
  // OTO.CV'NİN KENDİ VERİSİNDEN HESAPLANAN BULGULAR
  //
  // Kaldırılan sabit metinlerin yerini bunlar alıyor. Fark şu: bu satırlar
  // dışarıdan hiçbir bilgi gerektirmiyor, tamamen Oto.CV'nin kendi
  // kayıtlarından türüyor ve her araçta farklı sonuç veriyor.
  //
  // Kilometre tutarlılığı canlı veride hemen iş gördü: 11ASD1231 plakalı
  // aracın kayıtlarında kilometre 151.877 km geriye gidiyor. Belge o araç
  // için "Kilometre Verisi Tutarlı" basıyordu.
  // =========================================================================
  const kmBulgu = kilometreTutarliligi(recordsSource);
  const surek = kayitSurekliligi(recordsSource);

  // Kilometre bulgusunun belgedeki görsel durumu. 'yetersiz' hâli YEŞİL
  // BASILMAZ: iki kayıt yoksa tutarlılık doğrulanmış değildir, sadece
  // doğrulanamamıştır. İkisini aynı renge boyamak, yapılmamış bir kontrolü
  // yapılmış göstermek olur.
  const kmSatirDurumu =
    kmBulgu.durum === 'tutarli' ? 'iyi'
    : kmBulgu.durum === 'tutarsiz' ? 'dikkat'
    : 'bilinmiyor';

  const rawImageUrls = vehicle?.image_url || vehicle?.image || '';
  const carPhoto = rawImageUrls
    ? rawImageUrls.split(',').map(url => url.trim()).find(url => url.startsWith('http'))
    : '';

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const currentDate = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // =========================================================================
  // 3. BLOK: INTERFACE ARAYÜZ KATMANI (A4 MATBUU EVRAK MİZANPAJI)
  // =========================================================================
  return (
    <div className="flex justify-center items-center py-2 bg-transparent select-none print:p-0 w-full">
      <div 
        id="official-report-print-zone" 
        className="w-full bg-[#FAFAF7] border border-[#E5DECE] rounded-xl p-10 relative shadow-xl shadow-slate-950/5 flex flex-col justify-between print:border-none print:shadow-none print:rounded-none print:p-0 print:bg-white min-h-[1000px]"
      >
        <CropMark position="top-0 left-0" vertical={true} horizontal={true} />
        <CropMark position="top-0 right-0" vertical={true} horizontal={false} />
        <CropMark position="bottom-0 left-0" vertical={false} horizontal={true} />
        <CropMark position="bottom-0 right-0" vertical={false} horizontal={false} />

        <div className="space-y-8 flex-1">
          {/* ANTET */}
          <div className="flex justify-between items-start border-b border-[#E5DECE] pb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-widest text-[#1E1B4B]">OTO.CV</h2>
              {/* "RESMİ SİCİL BELGESİ" ifadesi kaldırıldı: bu belge bir kurum tarafından
                  düzenlenmiyor, Oto.CV'nin tuttuğu bakım ve beyan sicili. "Resmi"
                  demek, belgeye taşımadığı bir yetki atfetmek olurdu. */}
              <p className="text-[10px] font-semibold text-[#4F46E5] tracking-widest uppercase">TAŞIT BAKIM VE BEYAN SİCİLİ</p>
              <p className="text-[9px] text-slate-400 font-medium font-mono">Belge Düzenleme Tarihi: {currentDate}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="bg-[#1E1B4B] px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12z" />
                </svg>
                <span className="text-[9px] text-white font-bold tracking-wider uppercase">PIN İLE DOĞRULANABİLİR</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Ref: {pinCode}</span>
            </div>
          </div>

          {/* KÜNYE VE KADRAN */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#F1EDE4]/20 p-6 rounded-xl border border-[#E5DECE]/50">
            <div className="md:col-span-8 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-[#4F46E5] tracking-wider uppercase">{vehicle?.year ? `${vehicle.year} ÜRETİM YILI` : 'ÜRETİM YILI BEYAN EDİLMEMİŞ'}</span>
                <h3 className="text-xl font-bold text-[#1E1B4B] tracking-tight mt-0.5">{brand} {model}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{packageStr}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 pt-2 text-xs border-t border-[#E5DECE]/40">
                {/* VIN, motor no ve ruhsat seri no satırları kaldırıldı —
                    kolonları yok, uydurma maske basıyorlardı. Yerine gerçek
                    veriden gelen iki satır eklendi: kayıt sayısı ve izleme
                    süresi. İkisi de Oto.CV'nin kendi bildiği şeyler. */}
                <DocStatRow label="Plaka Kaydı" value={plateNumber} />
                <DocStatRow label="Beyan Edilen Kilometre" value={`${formattedKm} km`} />
                <DocStatRow label="Kasa Tipi" value={kasaTipi} />
                <DocStatRow label="Sicildeki Bakım Kaydı" value={`${surek.kayit} kayıt`} />
                <DocStatRow label="İzleme Süresi" value={surek.sureMetni} />
                <DocStatRow label="Faturası Yüklenmiş Kayıt" value={
                  surek.kayit ? `${surek.faturali} / ${surek.kayit}  (%${surek.faturaliYuzde})` : 'Kayıt yok'
                } />
                <DocStatRow label="Belgelenmiş Servis Tutarı" value={formattedTotalCost} />
              </div>
            </div>
            <div className="md:col-span-4 flex flex-col items-center justify-center border-l-0 md:border-l border-[#E5DECE]/60 pl-0 md:pl-4">
              <div className="w-24 h-28 relative flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} stroke="#E2E8F0" strokeWidth="5" fill="transparent" className="opacity-70" />
                  <circle cx="50" cy="50" r={radius} stroke="url(#officialA4GaugeGradient)" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-500" />
                  <defs>
                    <linearGradient id="officialA4GaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[7px] font-bold text-slate-400 tracking-wider">VERİ GÜVENİ</span>
                  <span className="text-xl font-bold text-[#0F172A] leading-none my-0.5">{score}</span>
                  <span className="text-[8px] font-bold text-emerald-600">/ 100</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-1 tracking-wide uppercase">Doğruluk Katsayısı</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Etiketlerden "TESCİLLİ" kaldırıldı: bu değerler tescil kaydından
                değil, araç sahibinin beyanından geliyor. Uydurma varsayılanlar da
                kaldırıldı — 06ONR97 plakalı aracın üçü de boş ve artık dürüstçe
                "Beyan edilmemiş" gösteriliyor. */}
            <SpecRow label="YAKIT (BEYAN)" value={fuelType} />
            <SpecRow label="ŞANZIMAN (BEYAN)" value={transmission} />
            <SpecRow label="GÖVDE RENGİ (BEYAN)" value={color} />
            {/* isSuccess artık serbest metin karşılaştırmasıyla değil, tek
                kaynaktan belirleniyor. Önceden `!== 'Tramer Kaydı Var'`
                yazıyordu; veritabanında 'Tramer Var' yazan araçlar (10'un
                4'ü) bu yüzden hasarsız gibi yeşil basılıyordu. */}
            <SpecRow label="TRAMER (BEYAN)" value={tramer} durum={tramerSatirDurumu} />
          </div>

          {/* =====================================================================
              SİCİL BULGULARI
              Eski hâli: "MERKEZİ VERİ TABANI SORGULAMA SONUÇLARI" başlığı ve
              altında üç SABİT METİN — TÜVTÜRK muayenesi, haciz/rehin kontrolü
              ve Adalet Bakanlığı UYAP çalınma taraması. Hiçbiri sorgulanmıyordu,
              her araçta aynı çıkıyordu, Oto.CV o kurumlara erişemiyor.

              Ne kadar yanıltıcı olabildiğini canlı veri gösterdi: 11ASD1231
              plakalı aracın kilometresi kayıtlarda 151.877 km GERİYE gidiyor,
              ama belge o araç için "Kilometre Verisi Tutarlı" basıyordu.

              Yeni hâlinde her satır KAYNAĞINI taşıyor ve üç kaynak dışında
              veri girmiyor:
                Hesaplandı          → Oto.CV'nin kendi verisinden türetilmiş
                Araç sahibi beyanı  → kullanıcının girdiği, doğrulanmamış bilgi
                Belgeli             → arkasında fatura görseli olan kayıt

              Kaldırılan iki satır geri gelmeyecek: haciz/rehin ve UYAP sorgusu
              kurumsal e-Devlet entegrasyonu olmadan hiçbir zaman gerçek olamaz.
              ===================================================================== */}
          <div className="bg-[#F1EDE4]/40 border border-[#E5DECE] rounded-xl p-5 space-y-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-[10px] font-bold text-[#1E1B4B] tracking-widest uppercase">OTO.CV SİCİL BULGULARI</h4>
              <span className="text-[8.5px] text-slate-400 font-medium tracking-wide">
                Her satır kaynağını taşır · doğrulayan resmi merci yoktur
              </span>
            </div>
            <div className="space-y-3 text-xs">
              {/* HESAPLANDI — sabit metnin yerini alan gerçek bulgu */}
              <TableRow
                label="Kilometre Tutarlılığı"
                status={kilometreMetni(recordsSource)}
                durum={kmSatirDurumu}
                kaynak={KAYNAK.HESAP}
              />

              {/* ARAÇ SAHİBİ BEYANI — üç durumlu; beyan yoksa yeşil basılmaz */}
              <TableRow
                label="Geçmiş Hasar / Tramer Kaydı"
                status={tramerMetni(vehicle)}
                durum={tramerSatirDurumu}
                kaynak={KAYNAK.BEYAN}
              />
              <TableRow
                label="TÜVTÜRK Muayene Geçerliliği"
                status={muayene.metin}
                durum={muayene.durum}
                kaynak={KAYNAK.BEYAN}
              />

              {/* BELGELİ — fatura görseli yüklenmiş kayıtlar */}
              <TableRow
                label="Servis Faturası Yüklenmiş Kayıt"
                status={
                  surek.kayit === 0
                    ? 'Sicilde bakım kaydı yok'
                    : `${surek.faturali} / ${surek.kayit} kayıt belgeli (%${surek.faturaliYuzde})`
                }
                durum={
                  surek.kayit === 0 ? 'bilinmiyor'
                  : surek.faturaliYuzde >= 50 ? 'iyi'
                  : 'dikkat'
                }
                kaynak={KAYNAK.BELGE}
              />
              <TableRow
                label="Belgelenmiş Servis Tutarı"
                status={totalMaintenanceCost > 0 ? formattedTotalCost : 'Tutar girilmiş kayıt yok'}
                durum={totalMaintenanceCost > 0 ? 'iyi' : 'bilinmiyor'}
                kaynak={KAYNAK.BELGE}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* UYDURMA VARSAYILAN KALDIRILDI.
                Önceden tarih yoksa belgeye '12/12/2029' basılıyordu — yani
                RESMİ BELGEYE var olmayan bir poliçe tarihi yazılıyordu. Alıcı
                o tarihe güvenip aracın sigortalı olduğunu sanabilirdi. Tramer
                kusuruyla aynı sınıf: bilgi yokken iddia üretmek.

                Ayrıca .split(' ')[0] gereksiz kaldı: kolonlar artık 'date'
                tipinde, saat bileşeni taşımıyor. formatTrDate ISO'yu GG/AA/YYYY
                biçimine çeviriyor. */}
            <DateMatrixBox title="TRAFİK SİGORTASI (BEYAN)" date={formatTrDate(vehicle?.traffic_insurance_end_date, 'Beyan Edilmemiş')} />
            <DateMatrixBox title="KASKO POLİÇESİ (BEYAN)" date={formatTrDate(vehicle?.kasko_end_date, 'Opsiyonel / Belirtilmedi')} />
            <DateMatrixBox title="MUAYENE GEÇERLİLİK (BEYAN)" date={formatTrDate(vehicle?.inspection_end_date, 'Beyan Edilmemiş')} />
          </div>

          {/* YASAL ŞERH YENİDEN YAZILDI.
              Eski metin iki asılsız iddia taşıyordu:
                "...AutoID havuzundaki DOĞRULANMIŞ dökümüdür"  → doğrulayan yok
                "...E-DEVLET TESCİL SİCİLİNE şeffafça erişim"  → böyle bir erişim yok
              Yeni metin belgenin ne olduğunu ve ne OLMADIĞINI açıkça söylüyor.
              Bir belgenin sınırlarını yazması, güvenilirliğini düşürmez —
              arttırır; alıcı neye güvenebileceğini bilir. */}
          <div className="text-[10px] text-slate-400 font-medium leading-relaxed bg-white border border-gray-200/80 p-4 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-500 block">BELGENİN KAPSAMI VE SINIRLARI</span>
            <p className="m-0">
              Bu belge, araç sahibinin Oto.CV sistemine girdiği bakım kayıtlarının ve
              beyanlarının dökümüdür. <span className="font-semibold text-slate-600">“Beyan”</span> etiketli
              satırlar araç sahibi tarafından bildirilmiştir ve bağımsız olarak doğrulanmamıştır.
              <span className="font-semibold text-slate-600"> “Belgeli”</span> etiketli satırların arkasında
              sisteme yüklenmiş fatura görseli bulunur.
              <span className="font-semibold text-slate-600"> “Hesaplandı”</span> etiketli satırlar Oto.CV&apos;nin
              kendi kayıtlarından türetilmiştir.
            </p>
            <p className="m-0">
              Oto.CV bir eksper kuruluşu değildir; TÜVTÜRK, tramer, haciz/rehin ve
              adli kayıt sorgusu <span className="font-semibold text-slate-600">yapmamaktadır</span>.
              Bu belge söz konusu kurumların kayıtları yerine geçmez.
            </p>
            <p className="m-0">
              Belge üzerindeki PIN kodu ile kayıtların güncel hâli her zaman
              <span className="font-semibold text-indigo-600"> https://oto.cv</span> adresinden
              görüntülenebilir. Baskı ile sistem kaydı arasında fark olması durumunda
              sistem kaydı esas alınır.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-[#E5DECE] pt-5 mt-6">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">SİSTEM DOĞRULAMA KODU (PIN)</span>
            <p className="text-sm font-bold text-[#1E1B4B] tracking-widest font-mono">{pinCode}</p>
            <p className="text-[9px] text-slate-400 leading-normal font-medium max-w-[480px]">
              Alıcı adayları bu PIN kodunu oto.cv adresinde sorgulayarak sicilin güncel hâlini görebilir. Sicil, araç sahibinin girdiği bakım kayıtlarını ve beyanlarını içerir.
            </p>
          </div>
          {/* ⚠ SAHTE KAREKOD KALDIRILDI.
              Burada bir karekod GÖRÜNTÜSÜ vardı: sabit yazılmış, hiçbir veri
              kodlamayan dekoratif bir SVG. Belgenin iki ayrı yerinde de
              "karekodu taratarak" yazıyordu.

              Yani alıcı adayı belgeyi tarıyor, hiçbir şey olmuyor ve bunu
              kendi telefonunun sorunu sanıyor. Çalışmayan bir doğrulama
              aracı, hiç olmamasından kötüdür — güven veriyormuş gibi
              görünüp vermiyor.

              Gerçek karekod üretilirse (PIN'i kodlayan) buraya geri gelir;
              o zamana kadar PIN kodu tek ve çalışan yol. */}
        </div>
      </div>
    </div>
  );
}

function CropMark({ position, vertical, horizontal }) {
  return (
    <div className={`absolute w-3 h-3 pointer-events-none print:hidden ${position}`}>
      <div className={`absolute bg-amber-600/20 transition-colors ${vertical ? 'top-0 h-2.5 w-[1px]' : 'bottom-0 h-2.5 w-[1px]'} ${horizontal ? 'left-0' : 'right-0'}`} />
      <div className={`absolute bg-amber-600/20 transition-colors ${vertical ? 'top-0' : 'bottom-0'} ${horizontal ? 'left-0 w-2.5 h-[1px]' : 'right-0 w-2.5 h-[1px]'}`} />
    </div>
  );
}

function DocStatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-200/50 pb-1">
      <span className="text-slate-400 font-medium text-[11px] tracking-tight">{label}:</span>
      <span className="font-bold text-[#1E1B4B] font-mono text-[11px] truncate max-w-[170px] text-right">{value}</span>
    </div>
  );
}

// =========================================================================
// BELGE SATIRLARININ ÜÇ DURUMU
//
// Resmi araç geçmiş raporlarının (Carfax, AutoCheck, carVertical) ortak
// kuralı: BİLGİ YOKLUĞU olumlu bir bulgu gibi gösterilmez. Carfax veri
// bulunmayan alanı gri çizgiyle geçer, asla onay işaretiyle.
//
// Bizde ise durum İKİLİ idi: "temiz değilse amber, değilse yeşil". Bu
// yüzden "Sorgulanamadı (Beyan Yok)" satırı YEŞİL ONAY TİKİYLE basılıyordu.
// Yeşil tik bir iddiadır; beyan edilmemiş bir alan için o iddiayı belge
// adına yapmak, düzelttiğimiz "hasarlıya temiz demek" hatasının daha
// yumuşak hâli.
//
// Üç durum, üç ayrı görsel dil:
//   'iyi'        yeşil + onay tiki      -> beyan edilmiş olumlu bulgu
//   'dikkat'     amber + uyarı işareti  -> beyan edilmiş, dikkat gerektiren
//   'bilinmiyor' gri + bilgi işareti    -> BEYAN YOK. iddia yok.
//   undefined    eski davranış (sabit metinli satırlar için)
// =========================================================================

const SATIR_DURUM = {
  iyi:        { renk: 'text-emerald-600', ikon: 'text-emerald-500', kenar: 'border-[#E5DECE]/50' },
  dikkat:     { renk: 'text-amber-600',   ikon: 'text-amber-500',   kenar: 'border-amber-200' },
  bilinmiyor: { renk: 'text-slate-400',   ikon: 'text-slate-300',   kenar: 'border-slate-200' },
};

// durum verilmezse nötr (yakıt, şanzıman, renk gibi bilgi satırları).
// Önceden değer metniyle karşılaştırma yapılıyordu
// (value === 'Hasarsız / Değişensiz / Orijinal'); metnin bir harfi
// değişince renk sessizce yanlışa dönüyordu.
function SpecRow({ label, value, durum }) {
  const s = SATIR_DURUM[durum];
  return (
    <div className={`border rounded-xl p-3 flex flex-col justify-center shadow-sm select-none bg-white ${s ? s.kenar : 'border-[#E5DECE]/50'}`}>
      <span className="text-slate-400 text-[9px] font-bold tracking-wider block leading-none">{label}</span>
      <span className={`text-xs font-bold truncate block mt-1 ${s ? s.renk : 'text-[#1E1B4B]'}`}>{value}</span>
    </div>
  );
}

// kaynak: satırdaki bilginin NEREDEN geldiğini belgede açıkça yazar.
// Bu, belgenin en önemli tasarım kararı. Önceden hiçbir satır kaynağını
// söylemiyordu, dolayısıyla kullanıcı beyanı ile kurum sorgusu aynı görünüyordu
// — sabit metinlerin inandırıcı olmasının sebebi de buydu.
function TableRow({ label, status, durum, kaynak }) {
  const cozulen = durum ?? 'iyi';
  const s = SATIR_DURUM[cozulen] || SATIR_DURUM.iyi;

  return (
    <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 border-b border-gray-300/10 pb-1">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-slate-600 font-medium tracking-tight">{label}</span>
        {kaynak && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 border border-slate-300/70 rounded px-1 py-px whitespace-nowrap shrink-0">
            {kaynak}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <DurumIkonu durum={cozulen} className={s.ikon} />
        <span className={`font-bold ${cozulen === 'iyi' ? 'text-[#1E1B4B]' : s.renk}`}>{status}</span>
      </div>
    </div>
  );
}

// Her durumun KENDİ işareti var. Aynı tiki boyayıp geçmek yetmez: belge
// gri tonlu yazdırıldığında ya da renk körü bir okuyucuda renk kaybolur,
// biçim kalır. Bu yüzden ayrım renge değil ŞEKLE de bindirildi.
function DurumIkonu({ durum, className }) {
  if (durum === 'dikkat') {
    return (
      <svg className={`w-3.5 h-3.5 shrink-0 ${className}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.517-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    );
  }
  if (durum === 'bilinmiyor') {
    return (
      <svg className={`w-3.5 h-3.5 shrink-0 ${className}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className={`w-3.5 h-3.5 shrink-0 ${className}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function DateMatrixBox({ title, date }) {
  return (
    <div className="flex-1 bg-white border border-gray-200/60 rounded-xl p-3 text-center shadow-sm select-none">
      <span className="text-slate-400 text-[8px] font-bold block tracking-wider leading-none">{title}</span>
      <span className="text-xs font-bold text-[#0F172A] font-mono block mt-1.5 tracking-wider">{date}</span>
    </div>
  );
}