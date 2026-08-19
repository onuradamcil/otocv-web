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

## Kurulum (bir kez, ~15 dakika)

### 1 · Gizli depoyu açın

GitHub'da **New repository**:

- Ad: `otocv-yedek`
- Görünürlük: **Private** ← bu şart
- README eklemeyin, boş açın

### 2 · Bağlantı dizesini alın

Supabase panelinde: **Project Settings → Database → Connection string**

⚠ **"Session pooler" sekmesini seçin, "Direct connection" DEĞİL.**
Sebebi teknik: doğrudan bağlantı yalnızca IPv6 üzerinden çalışıyor, GitHub'ın
çalıştırdığı makineler ise IPv4. Direct connection ile iş akışı
"could not connect to server" hatası verir.

Dize şuna benzer (bölge `eu-central-1`, proje `zjfxwvmcouuyrebltmwz`):

```
postgresql://postgres.zjfxwvmcouuyrebltmwz:<SIFRE>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

`<SIFRE>` yerine veritabanı şifreniz gelir. Hatırlamıyorsanız aynı sayfadan
**Reset database password** ile yenileyebilirsiniz.

⚠ Bu dizeyi **hiçbir dosyaya yazmayın**, doğrudan GitHub secret'a yapıştırın.

### 3 · Yedek parolası üretin

Dökümler bu parolayla şifrelenecek. Rastgele ve uzun olsun:

```bash
openssl rand -base64 32
```

⚠ **BU PAROLAYI KAYBEDERSENİZ YEDEKLER AÇILAMAZ.** Parola yedeğin bir
parçası değil; şifre yöneticinize kaydedin. Kaybolursa elinizde açılamayan
şifreli dosyalar kalır, yani yedeğiniz yok demektir.

### 4 · Secret'ları ekleyin

`otocv-yedek` deposunda: **Settings → Secrets and variables → Actions →
New repository secret**

| Ad | Değer |
|---|---|
| `VERITABANI_URL` | 2. adımdaki session pooler dizesi |
| `YEDEK_SIFRESI` | 3. adımda ürettiğiniz parola |

### 5 · İş akışını kopyalayın

Bu depodaki `docs/yedekleme/yedek-workflow.yml` dosyasını gizli depoya
**`.github/workflows/yedek.yml`** adıyla koyun.

### 6 · Elle çalıştırıp doğrulayın

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
döner, fotoğraflar kırık çıkar. Ayrı bir iş olarak konuşulmalı — bu belge
onu çözmüyor.

## Sınırları

- **En fazla 24 saatlik veri kaybı.** Gece 03:00'te alınıyor; 02:00'de olan
  bir kayıp 23 saatlik iş demektir. Daha sıkı bir hedef isterseniz ya cron
  sıklaştırılır ya da Supabase Pro (günlük otomatik yedek) / PITR
  (saniyelik) konuşulur.
- **Artifact 90 gün sonra siliniyor.** Daha uzun arşiv isterseniz aylık bir
  kopyayı indirip kendi saklama alanınıza koyun.
- **Geri yükleme elle.** Tek tıkla dönüş Supabase Pro'da var, burada yok.
