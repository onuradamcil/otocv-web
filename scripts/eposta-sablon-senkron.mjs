// =========================================================================
// E-POSTA ŞABLONLARINI SUPABASE İLE EŞİTLE
//
// -------------------------------------------------------------------------
// NİYE VAR — PANELDEN YAPIŞTIRMAK GÜVENİLİR DEĞİL
// -------------------------------------------------------------------------
// Şablonlar panele elle yapıştırılıyordu ve 22.08.2026'da bu üç ayrı kez
// yanlış sonuç verdi:
//
//   · Şablon yapıştırıldı ama `Save changes` düğmesine basılmadı. Önizleme
//     EDİTÖRDEKİ hâli gösterdiği için her şey doğru görünüyordu; giden
//     e-posta ise bir önceki sürümdü. Bunu anlamak üç tur sürdü.
//   · `parola-degisti` şablonunun sunucudaki hâli 8487 karakterdi, depodaki
//     güncel sürüm 5194. Aradaki fark: otomatik bağlantı onarımı sunucuda
//     hiç yoktu ve kimse fark etmemişti.
//   · Şablonda "6 haneli kod" yazıyordu; panelde `mailer_otp_length = 8`.
//     Uydurulmuş bir sayı, doğrulama ekranını çalışmaz hâle getiriyordu.
//
// Bu betik depoyu TEK KAYNAK yapıyor: `docs/eposta-sablonlari/*.SADE.html`
// ne diyorsa Supabase o olur.
//
// -------------------------------------------------------------------------
// ⚠ YALNIZCA FARKLI OLANI YAZIYOR
// -------------------------------------------------------------------------
// Her şablonu her koşumda yeniden yazmak gereksiz istek ve gereksiz risk.
// Önce okunuyor, özet karşılaştırılıyor, yalnızca farklı olanlar
// gönderiliyor. Yazdıktan sonra TEKRAR OKUNUP doğrulanıyor — "gönderdim"
// ile "yazıldı" aynı şey değil.
//
// -------------------------------------------------------------------------
// ⚠ KONU SATIRLARINA DOKUNMUYOR
// -------------------------------------------------------------------------
// Konular panelde elle yazıldı ve depoda karşılıkları yok. Buradan yazmaya
// kalkmak, olmayan bir kaynaktan boş değer basmak olurdu.
//
// -------------------------------------------------------------------------
// KULLANIM
// -------------------------------------------------------------------------
//   node scripts/eposta-sablon-senkron.mjs           # yalnızca karşılaştır
//   node scripts/eposta-sablon-senkron.mjs --yaz     # farklı olanları yaz
//
// `.env.local` içinde gerekli:
//   SUPABASE_ACCESS_TOKEN=sbp_...
//
// ⚠ Bu anahtar HESAP genelindedir — tüm projeleri kapsar, `service_role`dan
// daha güçlüdür. İş bitince iptal edin:
//   https://supabase.com/dashboard/account/tokens
// =========================================================================

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const YAZ = process.argv.includes('--yaz');
const PROJE = 'zjfxwvmcouuyrebltmwz';
const TABAN = `https://api.supabase.com/v1/projects/${PROJE}/config/auth`;

/** Supabase anahtarı  →  depodaki dosya adı (uzantısız) */
const ESLESME = [
  ['mailer_templates_confirmation_content', 'hesap-dogrula'],
  ['mailer_templates_email_change_content', 'eposta-degisimi-onayla'],
  ['mailer_templates_email_changed_notification_content', 'eposta-degisti'],
  ['mailer_templates_password_changed_notification_content', 'parola-degisti'],
  ['mailer_templates_recovery_content', 'parola-sifirla'],
];

function anahtar() {
  const m = readFileSync('.env.local', 'utf8').match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
  const v = m ? m[1].trim() : '';
  if (!v) {
    console.error('\n❌ .env.local içinde SUPABASE_ACCESS_TOKEN yok.');
    console.error('   https://supabase.com/dashboard/account/tokens → Generate new token\n');
    process.exit(1);
  }
  return v;
}

/**
 * Karşılaştırma özeti.
 * ⚠ Satır sonu normalize ediliyor: Windows'ta dosyalar CRLF, sunucudaki
 * içerik LF. Ham karşılaştırma her dosyayı "farklı" gösterirdi.
 */
const ozet = (s) => createHash('sha256')
  .update(String(s ?? '').replace(/\r\n/g, '\n').trim())
  .digest('hex')
  .slice(0, 10);

const TOKEN = anahtar();
const baslik = { Authorization: `Bearer ${TOKEN}` };

async function yapilandirmaOku() {
  const r = await fetch(TABAN, { headers: baslik });
  if (!r.ok) {
    console.error(`\n❌ Okunamadı: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}\n`);
    process.exit(1);
  }
  return r.json();
}

const c = await yapilandirmaOku();

console.log(`\n${YAZ ? '🔴 YAZMA KİPİ' : '🔵 KARŞILAŞTIRMA — hiçbir şey yazılmayacak'}\n`);

const gonderilecek = {};
for (const [alan, ad] of ESLESME) {
  const yerel = readFileSync(`docs/eposta-sablonlari/${ad}.SADE.html`, 'utf8');
  if (ozet(c[alan]) === ozet(yerel)) {
    console.log(`  ⏭  ${ad.padEnd(24)} zaten güncel`);
    continue;
  }
  gonderilecek[alan] = yerel;
  const suan = String(c[alan] ?? '').length;
  console.log(`  ${YAZ ? '↑' : '·'}  ${ad.padEnd(24)} ${suan} → ${yerel.length} karakter`);
}

if (Object.keys(gonderilecek).length === 0) {
  console.log('\n✅ Hepsi güncel.\n');
  process.exit(0);
}

if (!YAZ) {
  console.log('\nYazmak için: node scripts/eposta-sablon-senkron.mjs --yaz\n');
  process.exit(0);
}

const r = await fetch(TABAN, {
  method: 'PATCH',
  headers: { ...baslik, 'Content-Type': 'application/json' },
  body: JSON.stringify(gonderilecek),
});

if (!r.ok) {
  console.error(`\n❌ Yazılamadı: HTTP ${r.status} — ${(await r.text()).slice(0, 300)}\n`);
  process.exit(1);
}

// ⚠ "Gönderdim" yeterli değil — sunucudan GERİ OKUYUP doğruluyoruz.
const sonra = await yapilandirmaOku();
let hata = 0;
console.log('\nYAZILDIKTAN SONRA DOĞRULAMA');
for (const [alan, ad] of ESLESME) {
  const yerel = readFileSync(`docs/eposta-sablonlari/${ad}.SADE.html`, 'utf8');
  const tamam = ozet(sonra[alan]) === ozet(yerel);
  if (!tamam) hata += 1;
  console.log(`  ${tamam ? '✅' : '❌'} ${ad}`);
}

console.log(hata === 0 ? '\n✅ Tamam.\n' : `\n❌ ${hata} şablon tutmadı.\n`);
process.exit(hata === 0 ? 0 : 1);
