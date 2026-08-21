# Veritabanı Yedeği — Kurulum ve Geri Yükleme

## Niye bu var

Supabase projesi **Free planda** ve Free planda **hiçbir otomatik yedek yok**.
Bugün veritabanının tek kopyası canlı veritabanının kendisi. Yanlış bir
`UPDATE`, kazara silme ya da hesap sorunu → geri dönüş yok.

Şema tarafı `supabase/migrations/00000000000000_temel_sema.sql` ile git'e
alındı. **Bu belge VERİ tarafını kapatıyor.**

### Niye ayrı ve gizli bir depo

`otocv-web` herkese açık. GitHub'da açık depoların Actions çıktılarını
(artifact) **depoyu görebilen herkes indirebiliyor**. Yedeğin içinde plaka,
PIN kodu, telefon ve adres var — şifreli olsa bile açık internete koymak
doğru değil: parola bir gün sızarsa geçmişte alınmış tüm kopyalar açılır.

Gizli depoda artifact da gizli oluyor. Ayrıca yedek Supabase'in **dışında**
duruyor; Supabase hesabında bir sorun çıksa bile veri elinizde kalıyor.

---

## Kurulum

### Hızlı yol — tek komut (~3 dakika)

Proje kökünden:

```powershell
powershell -ExecutionPolicy Bypass -File docs\yedekleme\kur.ps1
```

Betik sırayla: GitHub CLI'yi kurar, sizi bir kez giriş yaptırır, `otocv-yedek`
gizli deposunu açar, iş akışını içine koyar, bağlantı dizenizi **gizli olarak**
sorup secret'a yazar, yedek şifresini üretip gösterir ve ilk yedeği çalıştırır.

⚠ **Bağlantı dizeniz bu makineden çıkmaz.** Gizli olarak sorulur, ekrana
yazılmaz, dosyaya kaydedilmez; doğrudan GitHub secret'ına gider.

⚠ Betik yedek şifresini **bir kez** gösterir. O an şifre yöneticinize
kaydedin — kaybolursa yedekler açılamaz.

Bittiğinde **geri yükleme provasını** yapın (aşağıda). Yeşil tik yeterli değil.

---

### Elle kurulum (betiği çalıştırmak istemezseniz)

#### 1 · Gizli depoyu açın

GitHub'da **New repository**:

- Ad: `otocv-yedek`
- Görünürlük: **Private** ← bu şart
- README eklemeyin, boş açın

#### 2 · Bağlantı dizesini alın

Supabase panelinde üstteki yeşil **`Connect`** düğmesi → **`Direct
Connection string`** sekmesi → açılan listeden **`Session pooler`**.

⚠ SEKME ADI YANILTICI: "Direct Connection string" sekmesinin İÇİNDE
"Direct connection", "Transaction pooler" ve "Session pooler" seçenekleri
birlikte duruyor. Bize gereken üçüncüsü. (Eskiden bu ekran
`Project Settings → Database` altındaydı; panel değişti.)

⚠ **"Session pooler" seçin, "Direct connection" DEĞİL.**
Sebebi teknik: doğrudan bağlantı yalnızca IPv6 üzerinden çalışıyor, GitHub'ın
çalıştırdığı makineler ise IPv4. Direct connection ile iş akışı
"could not connect to server" hatası verir.

Dize şuna benzer (ölçüldü, 21.08.2026):

```
postgresql://postgres.zjfxwvmcouuyrebltmwz:<SIFRE>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

⚠ SUNUCU ADINI EZBERE YAZMAYIN, panelden kopyalayın. Bu belgede önce
`aws-0` yazıyordu; projenin gerçek sunucusu **`aws-1`**. Yanlışı yazmak
sessizce bağlanamama hatası verir. Port **`5432`** olmalı — `6543`
"Transaction pooler"dır ve `pg_dump` orada çalışmaz.

`<SIFRE>` yerine veritabanı şifreniz gelir. Hatırlamıyorsanız aynı ekrandaki
**Reset database password** ile yenileyebilirsiniz; siteniz etkilenmez
çünkü uygulama publishable anahtarı kullanıyor, veritabanı şifresini değil.

⚠ ŞİFREDE ÖZEL KARAKTER VARSA percent-encode edin (`@` -> `%40`,
`#` -> `%23`, `/` -> `%2F`, `%` -> `%25`). Yoksa adres yanlış ayrışır.

⚠ Bu dizeyi **hiçbir dosyaya yazmayın ve kimseye göndermeyin** (yapay zeka
sohbetleri dahil — içinde canlı veritabanı şifreniz var). Doğrudan GitHub
secret'a yapıştırın. Terminalden koyacaksanız etkileşimli biçimi kullanın,
böylece kabuk geçmişine düşmez:

```
gh secret set VERITABANI_URL --repo onuradamcil/otocv-yedek
```

#### 3 · Yedek parolası üretin

Dökümler bu parolayla şifrelenecek. Rastgele ve uzun olsun:

```bash
openssl rand -base64 32
```

⚠ **BU PAROLAYI KAYBEDERSENİZ YEDEKLER AÇILAMAZ.** Parola yedeğin bir
parçası değil; şifre yöneticinize kaydedin. Kaybolursa elinizde açılamayan
şifreli dosyalar kalır, yani yedeğiniz yok demektir.

#### 4 · Secret'ları ekleyin

`otocv-yedek` deposunda: **Settings → Secrets and variables → Actions →
New repository secret**

| Ad | Değer |
|---|---|
| `VERITABANI_URL` | 2. adımdaki session pooler dizesi |
| `YEDEK_SIFRESI` | 3. adımda ürettiğiniz parola |

#### 5 · İş akışını kopyalayın

Bu depodaki `docs/yedekleme/yedek-workflow.yml` dosyasını gizli depoya
**`.github/workflows/yedek.yml`** adıyla koyun.

⚠ İKİSİNİ DE KOYUN. İlk kurulumda yalnızca `YEDEK_SIFRESI` konmuş,
`VERITABANI_URL` unutulmuştu; iki gece üst üste yedek alınamadı. İş akışı
artık eksik anahtarı açıkça söyleyen bir hatayla duruyor, ama en baştan iki
satırı birden koymak en iyisi.

#### 6 · Elle çalıştırıp doğrulayın

Gizli depoda **Actions → Günlük veritabanı yedeği → Run workflow**.

Koşum yeşil olmalı ve altında `otocv-yedek-<tarih>` adlı bir dosya
görünmeli. İndirin, boyutuna bakın — birkaç MB olmalı.

⚠ Yeşil tik yetmez: bir sonraki adımı yapın.

---

## Geri yükleme provası — ATLAMAYIN

**Denenmemiş yedek, yedek değildir.** En sık atlanan adım budur ve
yedeklerin çalışmadığı hep gerçek bir kayıp anında öğrenilir.

Provayı **canlı veritabanında değil**, boş bir Supabase projesinde ya da
yerel PostgreSQL'de yapın:

```bash
# 1. Şifreyi çöz
gpg --batch --passphrase "<YEDEK_SIFRESI>" \
    --output public.dump --decrypt public-<tarih>.dump.gpg

# 2. İçindekilere bak — tablolar orada mı?
pg_restore --list public.dump | grep "TABLE DATA"

# 3. BOŞ bir veritabanına geri yükle
pg_restore --dbname "<BOS_VERITABANI_URL>" \
           --no-owner --no-privileges public.dump

# 4. Sayıları karşılaştır
psql "<BOS_VERITABANI_URL>" -c "select count(*) from vehicles;"
```

Beklenen sayılar (19 Ağustos 2026 itibarıyla): 11 araç, 3 vitrin kaydı,
23.138 katalog paketi.

Bu provayı **6 ayda bir tekrarlayın**.

---

## Ne kapsıyor, ne kapsamıyor

| Kapsar | Kapsamaz |
|---|---|
| `public` şemasının tamamı (araç, vitrin, bakım, katalog, bildirim, mesaj…) | **Storage'daki dosyalar** — araç fotoğrafları ve faturalar |
| `auth.users` satırları (hesap kimlikleri) | Auth ayarları, e-posta şablonları |
| Kısıtlar, indeksler, tetikleyiciler, RPC'ler | Edge Functions |

⚠ **Araç fotoğrafları ve fatura görselleri yedeklenmiyor.** Onlar Supabase
Storage'da duruyor ve `pg_dump` kapsamı dışında. Ölçüldü (19 Ağustos 2026):

| Kova | Dosya | Boyut | Erişim |
|---|---|---|---|
| `vehicle-images` | 37 | 29 MB | herkese açık |
| `vehicle-invoices` | 9 | 13 MB | özel |
| `avatarlar` | 2 | 112 kB | özel |
| `belgeler` | 0 | — | özel |

Toplam ~42 MB / 48 dosya. Veritabanı dökümü bu dosyaların **adreslerini**
içeriyor ama **kendilerini içermiyor**: bugün geri yükleme yapılsa kayıtlar
döner, fotoğraflar kırık çıkar.

### Storage yedeği — `storage-yedek.ps1`

Bu boşluk için ayrı bir betik var:

```powershell
powershell -ExecutionPolicy Bypass -File docs\yedekleme\storage-yedek.ps1
```

Dört kovayı da özyinelemeli tarar, her dosyayı indirir, **boyutunu doğrular**
ve SHA-256'sıyla birlikte `kunye.json`'a yazar. Çıktı `yedek/storage/<tarih>/`
altına düşer — o klasör `.gitignore`'da, çünkü bu depo herkese açık ve
dosyalar plaka/fatura taşıyor. Betik her koşumda bu kuralın yerinde olduğunu
denetler; kalkmışsa çalışmayı reddeder.

Aynı dosya ikinci kez indirilmez (boyutu tutuyorsa atlanır), yani yarıda
kalan koşum tekrar başlatıldığında kaldığı yerden devam eder.

⚠ **`service_role` anahtarı şart.** Kovaları listelemek için gerekiyor.
"Herkese açık kova" yalnızca *bilinen bir yoldan okumayı* serbest bırakıyor;
listeleme ayrı bir yetki. Ölçüldü: anon anahtarıyla `vehicle-images` kök
listelemesi **0 kayıt** döndürüyor, oysa kovada 37 dosya var. Bu yüzden
betik anahtarsız çalışmayı **reddediyor** — anon ile çalışsaydı sessizce boş
bir yedek üretirdi, ki boş yedek hiç yedek olmamasından tehlikelidir:
felaket anında elinizde bir şey olduğunu sanırsınız.

Anahtar parametre olarak **geçilmiyor** (komut geçmişine düşerdi), dosyaya
yazılmıyor, ekrana basılmıyor: ya `SUPABASE_SERVICE_KEY` ortam
değişkeninden okunuyor ya da gizli olarak soruluyor.

⚠ Bu betik şimdilik **elle** çalıştırılıyor. Gizli `otocv-yedek` deposu
kurulduğunda oradaki iş akışına eklenip veritabanı yedeğiyle aynı gece
koşacak şekilde otomatikleştirilmeli.

## Sınırları

- **En fazla 24 saatlik veri kaybı.** Gece 03:00'te alınıyor; 02:00'de olan
  bir kayıp 23 saatlik iş demektir. Daha sıkı bir hedef isterseniz ya cron
  sıklaştırılır ya da Supabase Pro (günlük otomatik yedek) / PITR
  (saniyelik) konuşulur.
- **Artifact 90 gün sonra siliniyor.** Daha uzun arşiv isterseniz aylık bir
  kopyayı indirip kendi saklama alanınıza koyun.
- **Geri yükleme elle.** Tek tıkla dönüş Supabase Pro'da var, burada yok.
