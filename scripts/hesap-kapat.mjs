// =========================================================================
// HESAP KAPAT · KVKK SİLME TALEBİ
//
// Kullanım:
//   node scripts/hesap-kapat.mjs <user_id>                    DENEME (dokunmaz)
//   node scripts/hesap-kapat.mjs <user_id> --uygula           uygular
//   node scripts/hesap-kapat.mjs <user_id> --uygula --faturalari-sil
//
// Gereken ortam değişkeni:
//   SUPABASE_SERVICE_ROLE_KEY   Supabase panel > Project Settings > API
//
// ⚠ SERVICE ROLE ANAHTARI RLS'İ TAMAMEN BAYPAS EDER.
//   Yalnızca yerel ortam değişkeni olarak verilir. ASLA `NEXT_PUBLIC_*`
//   altına, ASLA depoya, ASLA tarayıcıya girmez. Bu betik de onu yalnızca
//   process.env'den okur — dosyadan okumaz ki yanlışlıkla commit edilecek
//   bir yere yazılmasın.
//
// -------------------------------------------------------------------------
// NE YAPAR — ve ne YAPMAZ
// -------------------------------------------------------------------------
// Araç kaydı ve servis geçmişi SİLİNMEZ. Sahip bağı koparılır: araçlar
// "sahipsiz havuza" düşer, sahiplik geçmişi anonimleşir. Kişisel veri olan
// profil, bildirimler ve ilanlar auth.users satırıyla birlikte gider.
//
// Gerekçe: KVKK m.7 "silme, yok etme VEYA ANONİM HALE GETİRME" diyor.
// Anonimleştirme kanunun kendi saydığı eşdeğer bir yol. Araç kaydında
// kişisel olan şey kişiyle araç arasındaki bağdır; bağ koparıldığında kalan
// veri arabaya aittir.
//
// -------------------------------------------------------------------------
// ⚠ SIRA TUZAĞI — bu betiğin var olma sebebi
// -------------------------------------------------------------------------
//   1) hesap_kapat()             anonimleştirme + KVKK kaydı
//   2) fatura_belgelerini_sil()  YALNIZCA --faturalari-sil verilirse
//   3) Storage'tan dosyaları sil
//   4) auth.users satırını sil   profiles/notifications/listings cascade
//
// ÖNCE auth.users silinirse `maintenance_records.yukleyen_user_id` SET NULL
// olur ve HANGİ FATURANIN KİME AİT OLDUĞU KAYBOLUR — 2. adım artık hiçbir
// şey bulamaz. Aynı sınıf hata bu projede bir kez yapıldı: storage
// politikaları dosyalar taşınmadan önce uygulanınca 8 dosya okunamaz hâle
// gelmişti.
//
// -------------------------------------------------------------------------
// FATURALAR VARSAYILAN OLARAK SİLİNMEZ
// -------------------------------------------------------------------------
// Ürün kararı: servis belgeleri araç sicilinin parçası, araçla kalır. Bunun
// tutulabilmesi için KVKK aydınlatma metninde bu açıkça yazılı olmalı.
// Kullanıcı AÇIKÇA belgelerinin silinmesini isterse `--faturalari-sil`
// kullanılır; o zaman sicil puanının belgelenme bileşeni düşer ve bu DOĞRU
// davranıştır — olmayan belgeyi varmış gibi saymak karneyi yalancı yapar.
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const UYGULA = process.argv.includes('--uygula');
const FATURALARI_SIL = process.argv.includes('--faturalari-sil');
const KULLANICI = process.argv.find((a) => /^[0-9a-f-]{36}$/i.test(a));

if (!KULLANICI) {
  console.error('Kullanım: node scripts/hesap-kapat.mjs <user_id> [--uygula] [--faturalari-sil]');
  process.exit(1);
}

const servisAnahtari = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!servisAnahtari) {
  console.error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil.');
  console.error('Supabase panel > Project Settings > API > service_role');
  console.error('Ortam değişkeni olarak verin; dosyaya yazmayın.');
  process.exit(1);
}

const env = fs.readFileSync('.env.local', 'utf8');
const oku = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();

const sb = createClient(oku('NEXT_PUBLIC_SUPABASE_URL'), servisAnahtari, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const baslik = (m) => console.log(`\n${'='.repeat(66)}\n${m}\n${'='.repeat(66)}`);

// -------------------------------------------------------------------------
// 0 · ÖNCE OKU, SONRA YAZ. Kuru koşum da bu bölümü çalıştırıyor; kullanıcı
//     neyin etkileneceğini uygulamadan ÖNCE görüyor.
// -------------------------------------------------------------------------
baslik(`HESAP KAPATMA · ${KULLANICI}`);

const { data: hedefKullanici, error: kullaniciHata } =
  await sb.auth.admin.getUserById(KULLANICI);
if (kullaniciHata || !hedefKullanici?.user) {
  console.error('Kullanıcı bulunamadı:', kullaniciHata?.message || 'kayıt yok');
  process.exit(1);
}
console.log(`E-posta      : ${hedefKullanici.user.email}`);
console.log(`Kayıt tarihi : ${hedefKullanici.user.created_at}`);

const { data: araclar } = await sb
  .from('vehicles')
  .select('plate_number, brand, model, trust_score')
  .eq('user_id', KULLANICI);

const plakalar = (araclar || []).map((a) => a.plate_number);

const { count: bakimSayisi } = plakalar.length
  ? await sb.from('maintenance_records').select('id', { count: 'exact', head: true })
      .in('vehicle_plate', plakalar)
  : { count: 0 };

const { data: faturalar } = await sb
  .from('maintenance_records')
  .select('id, invoice_path')
  .eq('yukleyen_user_id', KULLANICI)
  .not('invoice_path', 'is', null);

const { count: ilanSayisi } = await sb
  .from('listings').select('id', { count: 'exact', head: true }).eq('user_id', KULLANICI);

console.log(`\nSAHİPSİZ HAVUZA DÜŞECEK (silinmeyecek):`);
for (const a of araclar || []) {
  console.log(`  · ${a.plate_number.padEnd(12)} ${a.brand} ${a.model} — sicil puanı ${a.trust_score}`);
}
if (!araclar?.length) console.log('  (araç yok)');

console.log(`\nKORUNACAK  : ${bakimSayisi || 0} bakım kaydı, ${(faturalar || []).length} fatura dosyası`);
console.log(`SİLİNECEK  : profil, bildirimler, ${ilanSayisi || 0} ilan`);
if (FATURALARI_SIL) {
  console.log(`\n⚠ --faturalari-sil VERİLDİ: ${(faturalar || []).length} fatura dosyası da silinecek.`);
  console.log(`  Etkilenen araçların sicil puanı düşecek (belgelenme bileşeni).`);
}

if (!UYGULA) {
  baslik('KURU KOŞUM — hiçbir şey değiştirilmedi');
  console.log('Uygulamak için: --uygula');
  process.exit(0);
}

// -------------------------------------------------------------------------
// 1 · ANONİMLEŞTİRME. Tetikleyici gerisini yapıyor: sahipsizlik damgası,
//     PIN yenileme, sahiplik satırının kapanması, ilan ve taleplerin iptali.
// -------------------------------------------------------------------------
baslik('1/4 · Anonimleştirme');

const { data: kapatmaSonucu, error: kapatmaHatasi } = await sb.rpc('hesap_kapat', {
  p_user_id: KULLANICI,
  p_not: `KVKK talebi · ${hedefKullanici.user.email}`,
});
if (kapatmaHatasi) {
  console.error('hesap_kapat başarısız:', kapatmaHatasi.message);
  process.exit(1);
}
if (kapatmaSonucu?.hata) {
  console.error('hesap_kapat reddetti:', kapatmaSonucu.hata);
  process.exit(1);
}
console.log(`Sahipsiz kalan araç   : ${kapatmaSonucu.sahipsiz_kalan_arac}`);
console.log(`Anonimleşen sahiplik  : ${kapatmaSonucu.anonimlesen_sahiplik}`);
console.log(`Yerinde duran fatura  : ${kapatmaSonucu.duran_fatura}`);

// -------------------------------------------------------------------------
// 2-3 · FATURA DOSYALARI. Yalnızca açık talep varsa.
//       SQL fonksiyonu yolları döndürüp kolonu boşaltıyor; baytları burada
//       siliyoruz. storage.objects satırını SQL'den silmek dosyayı yörüngede
//       bırakırdı — bayt geri kazanılmaz, yalnızca erişilemez olur.
// -------------------------------------------------------------------------
if (FATURALARI_SIL) {
  baslik('2/4 · Fatura belgeleri siliniyor');

  const { data: silmeSonucu, error: silmeHatasi } =
    await sb.rpc('fatura_belgelerini_sil', { p_user_id: KULLANICI });
  if (silmeHatasi) {
    console.error('fatura_belgelerini_sil başarısız:', silmeHatasi.message);
    process.exit(1);
  }

  const yollar = silmeSonucu?.yollar || [];
  console.log(`Kolon boşaltıldı: ${yollar.length} kayıt`);

  if (yollar.length) {
    const { data: silinen, error: depoHatasi } = await sb.storage
      .from('vehicle-invoices').remove(yollar);

    // HATA YUTULMUYOR. Bu projede bir kez "error null geldi, iş bitti"
    // sanılıp 0 satır etkilenen bir temizlik başarılı raporlanmıştı.
    if (depoHatasi) {
      console.error('Storage silme hatası:', depoHatasi.message);
      console.error('Kolonlar boşaldı ama dosyalar duruyor — elle temizlenmeli:');
      yollar.forEach((y) => console.error(`  ${y}`));
    } else {
      console.log(`Storage'tan silinen dosya: ${silinen?.length ?? 0}/${yollar.length}`);
      if ((silinen?.length ?? 0) !== yollar.length) {
        console.error('⚠ Sayılar tutmuyor — bazı dosyalar silinmemiş olabilir.');
      }
    }
  }
} else {
  baslik('2/4 · Fatura belgeleri KORUNUYOR');
  console.log('Belgeler araç siciliyle kalıyor (--faturalari-sil verilmedi).');
}

// -------------------------------------------------------------------------
// 4 · AUTH KULLANICISI. En son. Buradan sonra kişisel veri cascade ile
//     gidiyor: profiles, notifications, listings, vehicle_drafts.
// -------------------------------------------------------------------------
baslik('4/4 · auth.users satırı siliniyor');

const { error: authHatasi } = await sb.auth.admin.deleteUser(KULLANICI);
if (authHatasi) {
  console.error('Kullanıcı silinemedi:', authHatasi.message);
  console.error('Anonimleştirme YAPILDI ama hesap duruyor. Tekrar çalıştırmak güvenli.');
  process.exit(1);
}
console.log('Silindi.');

// -------------------------------------------------------------------------
// DOĞRULAMA. "Hata yoksa olmuştur" varsayımı bu projede bir kez yanlış
// çıktı; sonucu okuyoruz.
// -------------------------------------------------------------------------
baslik('DOĞRULAMA');

const { count: kalanArac } = await sb
  .from('vehicles').select('plate_number', { count: 'exact', head: true })
  .eq('user_id', KULLANICI);

const { count: yasayanBakim } = plakalar.length
  ? await sb.from('maintenance_records').select('id', { count: 'exact', head: true })
      .in('vehicle_plate', plakalar)
  : { count: 0 };

const { count: sahipsizArac } = plakalar.length
  ? await sb.from('vehicles').select('plate_number', { count: 'exact', head: true })
      .in('plate_number', plakalar).not('sahipsiz_kaldi_at', 'is', null)
  : { count: 0 };

const { count: kalanProfil } = await sb
  .from('profiles').select('id', { count: 'exact', head: true }).eq('id', KULLANICI);

const satir = (etiket, deger, beklenen) =>
  console.log(`${deger === beklenen ? 'TAMAM' : 'SORUN'}  ${etiket.padEnd(34)} ${deger} (beklenen ${beklenen})`);

satir('Kullanıcıya bağlı kalan araç', kalanArac ?? 0, 0);
satir('Sahipsiz havuzdaki araç', sahipsizArac ?? 0, plakalar.length);
satir('Yaşayan bakım kaydı', yasayanBakim ?? 0, bakimSayisi ?? 0);
satir('Kalan profil', kalanProfil ?? 0, 0);

console.log('\nAraç kayıtları ve servis geçmişi korundu; kişisel veri silindi.');
