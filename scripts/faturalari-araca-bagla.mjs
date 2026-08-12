// =========================================================================
// FATURA DOSYALARINI ARACA BAĞLA · DEVİR FAZ 1.5
//
// Kullanım:
//   node scripts/faturalari-araca-bagla.mjs              DENEME (dokunmaz)
//   node scripts/faturalari-araca-bagla.mjs --uygula     gerçekten taşır
//
// -------------------------------------------------------------------------
// NİYE
// -------------------------------------------------------------------------
// Fatura dosyaları `<user_id>/<plaka>/<dosya>` yolunda ve storage politikası
// `klasör = benim kimliğim` diye bakıyordu. Araç devri uçtan uca test
// edildiğinde şu KANITLANDI:
//
//   devir sonrası, alıcı  ->  kayıtta invoice_path DOLU
//                        ->  dosyayı AÇAMIYOR
//
// Çünkü dosya hâlâ satıcının klasöründe. Devir yarım kalıyordu: kayıt geçiyor,
// belge geçmiyor.
//
// -------------------------------------------------------------------------
// YENİ YOL: <storage_key>/<dosya>
// -------------------------------------------------------------------------
// `storage_key`, `vehicles` tablosuna eklenen kimlik taşımayan bir uuid.
// Plaka DEĞİL, iki sebeple:
//   1. Plaka kişisel veri ve imzalı URL'nin içinde görünüyor.
//   2. Plaka değişirse (şehir değişimi vb.) yol kırılır. uuid dayanıklı.
//
// Politika artık "bu klasör, benim sahip olduğum bir aracın storage_key'i mi"
// diye bakıyor. Sahiplik kontrolünü `vehicles` tablosunun kendi RLS'i yapıyor:
// aracı görebiliyorsam sahibiyim. Devir `vehicles.user_id`'yi güncellediği
// için erişim kendiliğinden yeni sahibe geçiyor — SONRAKİ DEVİRLERDE HİÇBİR
// DOSYA TAŞINMIYOR. Bu betik yalnızca bir kez, mevcut dosyalar için.
//
// -------------------------------------------------------------------------
// SIRA ÖNEMLİ: ÖNCE YÜKLE, SONRA KOLONU GÜNCELLE, EN SON SİL
// -------------------------------------------------------------------------
// Yükleme başarısız olursa hiçbir şey değişmemiş olur. Kolon güncellenip
// silme başarısız olursa dosya iki yerde durur — zararsız. Ters sırada
// yapılsaydı yarıda kalan bir koşum kaydı dosyasız bırakabilirdi.
//
// Eski dosya SİLİNİYOR: kalırsa satıcının klasöründe erişilebilir bir kopya
// kalır ve devirde "belge satıcıda kalmasın" ilkesi bozulur.
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const UYGULA = process.argv.includes('--uygula');
const BUCKET = 'vehicle-invoices';

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
console.log(`Oturum: ${oturum.user.email}\n`);

// Araç -> storage_key eşlemesi. RLS sayesinde yalnızca kendi araçları geliyor;
// başka kullanıcının dosyasına dokunmak zaten mümkün değil.
const { data: araclar, error: aracHata } = await sb
  .from('vehicles')
  .select('plate_number, storage_key');
if (aracHata) {
  console.error('Araçlar okunamadı:', aracHata.message);
  process.exit(1);
}
const anahtar = new Map((araclar || []).map((v) => [v.plate_number, v.storage_key]));

const { data: kayitlar, error: kayitHata } = await sb
  .from('maintenance_records')
  .select('id, vehicle_plate, invoice_path')
  .not('invoice_path', 'is', null);
if (kayitHata) {
  console.error('Kayıtlar okunamadı:', kayitHata.message);
  process.exit(1);
}

const rapor = { tasindi: [], atlandi: [], hata: [] };

for (const k of kayitlar) {
  const etiket = `#${k.id} ${k.vehicle_plate}`;
  const dosyaAdi = k.invoice_path.split('/').pop();
  const sk = anahtar.get(k.vehicle_plate);

  if (!sk) {
    rapor.atlandi.push(`${etiket} — aracın storage_key'i okunamadı (başka kullanıcıya ait olabilir)`);
    continue;
  }

  const yeniYol = `${sk}/${dosyaAdi}`;

  if (k.invoice_path === yeniYol) {
    rapor.atlandi.push(`${etiket} — zaten yeni yolda`);
    continue;
  }

  if (!UYGULA) {
    rapor.tasindi.push(`${etiket}\n      ${k.invoice_path}\n   -> ${yeniYol}`);
    continue;
  }

  try {
    // 1) İNDİR
    const { data: dosya, error: indirHata } = await sb.storage.from(BUCKET).download(k.invoice_path);
    if (indirHata) throw new Error(`indirme: ${indirHata.message}`);

    // 2) YÜKLE (yeni yol)
    const { error: yuklemeHata } = await sb.storage
      .from(BUCKET)
      .upload(yeniYol, dosya, { upsert: true, contentType: dosya.type || 'image/jpeg' });
    if (yuklemeHata) throw new Error(`yükleme: ${yuklemeHata.message}`);

    // 3) KOLONU GÜNCELLE
    const { error: guncelleHata } = await sb
      .from('maintenance_records')
      .update({ invoice_path: yeniYol })
      .eq('id', k.id);
    if (guncelleHata) throw new Error(`kolon güncelleme: ${guncelleHata.message}`);

    // 4) ESKİ DOSYAYI SİL — en son. Kalırsa satıcının klasöründe erişilebilir
    // bir kopya kalır ve devirde belge satıcıda durmaya devam eder.
    const { error: silHata } = await sb.storage.from(BUCKET).remove([k.invoice_path]);
    if (silHata) throw new Error(`eski dosya silinemedi: ${silHata.message}`);

    rapor.tasindi.push(`${etiket} -> ${yeniYol}`);
  } catch (e) {
    rapor.hata.push(`${etiket} — ${e.message}`);
  }
}

console.log(`${UYGULA ? '=== UYGULANDI ===' : '=== DENEME (hiçbir şey değişmedi) ==='}\n`);
console.log(`TAŞIN${UYGULA ? 'DI' : 'ACAK'} (${rapor.tasindi.length}):`);
rapor.tasindi.forEach((x) => console.log(`  ${x}`));
if (rapor.atlandi.length) {
  console.log(`\nATLANDI (${rapor.atlandi.length}):`);
  rapor.atlandi.forEach((x) => console.log(`  ${x}`));
}
if (rapor.hata.length) {
  console.log(`\nHATA (${rapor.hata.length}):`);
  rapor.hata.forEach((x) => console.log(`  ${x}`));
}
if (!UYGULA) console.log('\nGerçekten taşımak için: --uygula');
process.exit(rapor.hata.length ? 1 : 0);
