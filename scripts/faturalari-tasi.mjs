// =========================================================================
// FATURA DOSYALARINI ÖZEL BUCKET'A TAŞI
//
// Kullanım:
//   node scripts/faturalari-tasi.mjs              DENEME (hiçbir şeye dokunmaz)
//   node scripts/faturalari-tasi.mjs --uygula     gerçekten taşır
//
// -------------------------------------------------------------------------
// NE YAPAR
// -------------------------------------------------------------------------
// `maintenance_records.invoice_url` alanındaki her public URL için:
//   1. Dosyayı public bucket'tan (vehicle-images) indirir
//   2. Özel bucket'a (vehicle-invoices) YENİ şemayla yükler:
//        <user_id>/<plaka>/<dosya adı>
//   3. `invoice_path` alanını o yola yazar
//   4. Public bucket'taki kopyayı siler — yoksa iş yarım kalır, eski URL
//      çalışmaya devam eder ve açık kapanmaz
//
// `invoice_url` alanı BİLEREK silinmez. Doğrulama bitene kadar geri dönüş
// yolu açık kalsın; kolonun düşürülmesi ayrı bir migration.
//
// -------------------------------------------------------------------------
// ELE ALINAN İKİ VERİ KUSURU
// -------------------------------------------------------------------------
// Canlı veride bulundu:
//
//   · Bir kaydın `vehicle_plate` alanı NULL ve fatura yolu
//     ".../vehicle-images/undefined/invoice_...png" — klasör adı harfiyen
//     "undefined". Sihirbaz, plaka tanımsızken fatura yüklemiş.
//     Bu kayıt hiçbir araca bağlı değil, dolayısıyla sahibi de belirsiz.
//     TAŞINMAZ; raporlanır ve kararı kullanıcıya bırakılır. Sahibi
//     bilinmeyen bir dosyayı bir kullanıcının klasörüne koymak, yanlış
//     kişiye erişim vermek olurdu.
//
//   · Dosya adı önekleri tutarsız: `invoice_` ve `history_invoice_`.
//     İkisi de taşınır; ad korunur, yalnızca klasör değişir.
//
// -------------------------------------------------------------------------
// NEDEN ANON ANAHTAR YETERLİ
// -------------------------------------------------------------------------
// Betik araç sahibinin hesabıyla oturum açıyor. Yükleme, yeni storage
// politikasından geçiyor: `<user_id>/...` klasörü kendi kimliği olduğu için
// izin var. Yani betiğin çalışması aynı zamanda politikanın DOĞRU
// kurulduğunun kanıtı. Servis anahtarı gerekmiyor — gerekmemesi iyi, çünkü
// servis anahtarı politikaları atlar ve hatayı gizlerdi.
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const UYGULA = process.argv.includes('--uygula');
const ESKI_BUCKET = 'vehicle-images';
const YENI_BUCKET = 'vehicle-invoices';

const env = fs.readFileSync('.env.local', 'utf8');
const oku = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();

const sb = createClient(oku('NEXT_PUBLIC_SUPABASE_URL'), oku('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

const { data: oturum, error: girisHata } = await sb.auth.signInWithPassword({
  email: process.env.E,
  password: process.env.P,
});
if (girisHata) {
  console.error('Oturum açılamadı:', girisHata.message);
  process.exit(1);
}
const kullaniciId = oturum.user.id;
console.log(`Oturum: ${oturum.user.email}  (${kullaniciId})\n`);

// Plaka -> sahip eşlemesi. Dosya yolundaki user_id buradan geliyor.
const { data: araclar } = await sb.from('vehicles').select('plate_number, user_id');
const sahip = new Map((araclar || []).map((v) => [v.plate_number, v.user_id]));

const { data: kayitlar, error: kayitHata } = await sb
  .from('maintenance_records')
  .select('id, vehicle_plate, invoice_url, invoice_path')
  .not('invoice_url', 'is', null);

if (kayitHata) {
  console.error('Kayıtlar okunamadı:', kayitHata.message);
  process.exit(1);
}

/** Public URL'den bucket içi yolu çıkarır. */
function eskiYol(url) {
  const im = `/object/public/${ESKI_BUCKET}/`;
  const i = url.indexOf(im);
  return i < 0 ? null : decodeURIComponent(url.slice(i + im.length));
}

const rapor = { tasindi: [], atlandi: [], hata: [] };

for (const k of kayitlar) {
  const etiket = `#${k.id} ${k.vehicle_plate ?? '(plaka YOK)'}`;

  if (k.invoice_path) {
    rapor.atlandi.push(`${etiket} — invoice_path zaten dolu`);
    continue;
  }

  const yol = eskiYol(k.invoice_url);
  if (!yol) {
    rapor.atlandi.push(`${etiket} — URL tanınmadı: ${k.invoice_url.slice(0, 70)}`);
    continue;
  }

  // Sahibi belirlenemeyen kayıt taşınmaz.
  const sahibi = k.vehicle_plate ? sahip.get(k.vehicle_plate) : null;
  if (!sahibi) {
    rapor.atlandi.push(
      `${etiket} — SAHİBİ BELİRSİZ, taşınmadı. Yol: ${yol}  ` +
      `(bu kayıt hiçbir araca bağlı değil; dosyayı bir kullanıcının klasörüne ` +
      `koymak yanlış kişiye erişim vermek olurdu)`
    );
    continue;
  }
  if (sahibi !== kullaniciId) {
    rapor.atlandi.push(`${etiket} — başka kullanıcıya ait (${sahibi.slice(0, 8)}...), bu oturumla taşınamaz`);
    continue;
  }

  const dosyaAdi = yol.split('/').pop();
  const yeniYol = `${sahibi}/${k.vehicle_plate}/${dosyaAdi}`;

  if (!UYGULA) {
    rapor.tasindi.push(`${etiket}\n      ${yol}\n   -> ${yeniYol}`);
    continue;
  }

  try {
    const { data: dosya, error: indirHata } = await sb.storage.from(ESKI_BUCKET).download(yol);
    if (indirHata) throw new Error(`indirme: ${indirHata.message}`);

    const { error: yuklemeHata } = await sb.storage
      .from(YENI_BUCKET)
      .upload(yeniYol, dosya, { upsert: true, contentType: dosya.type || 'image/jpeg' });
    if (yuklemeHata) throw new Error(`yükleme: ${yuklemeHata.message}`);

    const { error: guncelleHata } = await sb
      .from('maintenance_records')
      .update({ invoice_path: yeniYol })
      .eq('id', k.id);
    if (guncelleHata) throw new Error(`kolon güncelleme: ${guncelleHata.message}`);

    // Public kopyayı sil. Bu adım atlanırsa eski URL çalışmaya devam eder
    // ve açık kapanmaz.
    const { error: silHata } = await sb.storage.from(ESKI_BUCKET).remove([yol]);
    if (silHata) throw new Error(`public kopya silinemedi: ${silHata.message}`);

    rapor.tasindi.push(`${etiket} -> ${yeniYol}`);
  } catch (e) {
    rapor.hata.push(`${etiket} — ${e.message}`);
  }
}

console.log(`${UYGULA ? '=== UYGULANDI ===' : '=== DENEME (hiçbir şey değişmedi) ==='}\n`);
console.log(`TAŞIN${UYGULA ? 'DI' : 'ACAK'} (${rapor.tasindi.length}):`);
rapor.tasindi.forEach((x) => console.log(`  ${x}`));
console.log(`\nATLANDI (${rapor.atlandi.length}):`);
rapor.atlandi.forEach((x) => console.log(`  ${x}`));
if (rapor.hata.length) {
  console.log(`\nHATA (${rapor.hata.length}):`);
  rapor.hata.forEach((x) => console.log(`  ${x}`));
}
if (!UYGULA) console.log('\nGerçekten taşımak için: --uygula');
process.exit(rapor.hata.length ? 1 : 0);
