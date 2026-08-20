# =========================================================================
# OTO-CV STORAGE (GÖRSEL/BELGE) YEDEĞİ
#
# -------------------------------------------------------------------------
# NİYE VAR — VERİTABANI YEDEĞİ BUNU KAPSAMIYOR
# -------------------------------------------------------------------------
# `pg_dump` yalnızca veritabanını alıyor. Supabase Storage AYRI bir servis:
# araç fotoğrafları, faturalar ve profil görselleri dökümde YOK.
#
# Ölçüldü (20 Ağustos 2026):
#   vehicle-images    37 dosya   29 MB   (herkese açık kova)
#   vehicle-invoices   9 dosya   13 MB   (özel)
#   avatarlar          2 dosya  112 kB   (özel)
#   belgeler           0 dosya            (özel)
#
# Bu dosyalar ürünün "beyana değil belgeye dayanır" iddiasının kanıtı.
# Kaybolurlarsa sicil kaydı duruyor ama dayanağı gidiyor.
#
# -------------------------------------------------------------------------
# ⚠ SERVİS ANAHTARI DİSKE YAZILMIYOR
# -------------------------------------------------------------------------
# Özel kovaları okumak `service_role` anahtarı gerektiriyor. O anahtar
# veritabanındaki HER SATIRI okuyup yazabilir — sızarsa ürün biter.
# Bu yüzden:
#   · Betiğe parametre olarak GEÇİLMİYOR (komut geçmişine düşerdi)
#   · Dosyaya YAZILMIYOR
#   · Ekrana basılmıyor
# Ya `SUPABASE_SERVICE_KEY` ortam değişkeninden okunuyor ya da gizli
# olarak soruluyor. `docs/yedekleme/README.md`'deki "bağlantı diziniz bu
# makineden çıkmaz" ilkesinin aynısı.
#
# -------------------------------------------------------------------------
# ⚠ ÇIKTI DEPOYA COMMIT EDİLEMEZ
# -------------------------------------------------------------------------
# `otocv-web` HERKESE AÇIK bir depo. İçindeki dosyalar plaka, fatura ve
# kişisel görsel taşıyor. Varsayılan çıktı `yedek/` altında ve o klasör
# `.gitignore`da. Betik bunu her koşumda DENETLİYOR; kural kalkmışsa
# çalışmayı reddediyor.
#
# -------------------------------------------------------------------------
# KULLANIM
# -------------------------------------------------------------------------
#   powershell -ExecutionPolicy Bypass -File docs\yedekleme\storage-yedek.ps1
#
#   Yalnızca açık kovayı denemek için (anahtar gerekmez):
#   ... -File docs\yedekleme\storage-yedek.ps1 -Kova vehicle-images
#
# Aynı dosya ikinci kez indirilmiyor: SHA-256'sı tutuyorsa atlanıyor.
# Yani koşum yarıda kalırsa tekrar çalıştırmak kaldığı yerden devam eder.
# =========================================================================

param(
  [string] $Cikti = "yedek\storage",
  [string] $Kova  = ""      # boş = hepsi
)

$ErrorActionPreference = "Stop"
# PS 5.1'de ilerleme çubuğu Invoke-WebRequest'i onlarca kat yavaşlatıyor.
$ProgressPreference = "SilentlyContinue"

# -------------------------------------------------------------------------
# 1) GÜVENLİK KAPISI: çıktı klasörü git tarafından yok sayılıyor mu?
# -------------------------------------------------------------------------
$kok = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $kok

$gitignore = Join-Path $kok ".gitignore"
$korumali = $false
if (Test-Path $gitignore) {
  foreach ($satir in (Get-Content $gitignore)) {
    if ($satir.Trim() -eq "yedek/") { $korumali = $true }
  }
}
if (-not $korumali) {
  Write-Host ""
  Write-Host "  DURDURULDU: .gitignore icinde 'yedek/' kurali yok." -ForegroundColor Red
  Write-Host "  Bu depo HERKESE ACIK; yedek icinde plaka ve fatura var." -ForegroundColor Red
  Write-Host "  Once kurali geri koyun, sonra tekrar calistirin." -ForegroundColor Red
  exit 1
}

# -------------------------------------------------------------------------
# 2) PROJE ADRESİ
# -------------------------------------------------------------------------
$url = $env:NEXT_PUBLIC_SUPABASE_URL
if ([string]::IsNullOrWhiteSpace($url)) {
  foreach ($dosya in @(".env.local", ".env.test")) {
    $tam = Join-Path $kok $dosya
    if (Test-Path $tam) {
      foreach ($satir in (Get-Content $tam)) {
        if ($satir -match '^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$') {
          $url = $Matches[1].Trim().Trim('"').Trim("'")
        }
      }
    }
    if (-not [string]::IsNullOrWhiteSpace($url)) { break }
  }
}
if ([string]::IsNullOrWhiteSpace($url)) {
  Write-Host "  Supabase adresi bulunamadi (.env.local)." -ForegroundColor Red
  exit 1
}
$url = $url.TrimEnd("/")

# -------------------------------------------------------------------------
# 3) SERVİS ANAHTARI — ekrana basılmıyor, diske yazılmıyor
# -------------------------------------------------------------------------
$anahtar = $env:SUPABASE_SERVICE_KEY

# ⚠ SORU YALNIZCA DEGISKEN HIC TANIMLI DEGILSE SORULUYOR.
# `SUPABASE_SERVICE_KEY` bos olarak TANIMLIYSA "bilerek anahtarsiz
# calistiriyorum" demektir ve betik sormadan devam eder. Bu ayrim sart:
# aksi halde betik etkilesimsiz bir ortamda (CI, zamanlanmis gorev)
# `Read-Host`ta sonsuza kadar asili kalir.
$soruSorulabilir = -not (Test-Path env:SUPABASE_SERVICE_KEY)

if ([string]::IsNullOrWhiteSpace($anahtar) -and $soruSorulabilir) {
  Write-Host ""
  Write-Host "  Ozel kovalar (vehicle-invoices, avatarlar, belgeler) icin" -ForegroundColor Yellow
  Write-Host "  service_role anahtari gerekiyor." -ForegroundColor Yellow
  Write-Host "  Supabase panel > Project Settings > API > service_role" -ForegroundColor DarkGray
  Write-Host "  Bos birakirsaniz YALNIZCA herkese acik kova yedeklenir." -ForegroundColor DarkGray
  $gizli = Read-Host "  Anahtar (girdiginiz gorunmez)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($gizli)
  $anahtar = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

# ⚠ ANON ANAHTARI YEDEGI KALDIRILDI — DENENDI VE ISE YARAMIYOR.
# "Herkese acik kova" demek, BILINEN BIR YOLDAN okumanin serbest olmasi
# demek; LISTELEME ayri bir yetki ve anon'da yok. Olculdu: anon anahtariyla
# `vehicle-images` kok listelemesi 0 kayit donuyor, oysa kovada 37 dosya var.
# Yani anon ile calisan bir yedek dosyalari KESFEDEMIYOR ve sessizce bos
# yedek uretiyor. Bos yedek, yedek olmamasindan daha tehlikeli: guvenirsiniz.
if ([string]::IsNullOrWhiteSpace($anahtar)) {
  Write-Host ""
  Write-Host "  DURDURULDU: service_role anahtari olmadan yedek alinamaz." -ForegroundColor Red
  Write-Host "  Kovalari LISTELEMEK icin gerekli; anon anahtari listeleyemiyor" -ForegroundColor DarkGray
  Write-Host "  ve sessizce BOS bir yedek uretiyor." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "  Supabase panel > Project Settings > API > service_role" -ForegroundColor DarkGray
  exit 1
}

$basliklar = @{}
if (-not [string]::IsNullOrWhiteSpace($anahtar)) {
  $basliklar = @{ "Authorization" = "Bearer $anahtar"; "apikey" = $anahtar }
}

# -------------------------------------------------------------------------
# 4) KOVA İÇERİĞİNİ ÖZYİNELEMELİ LİSTELE
# -------------------------------------------------------------------------
# Storage list API tek seferde YALNIZCA BİR KADEME döndürüyor; klasörler
# `id = null` olarak geliyor. Alt klasörlere inmezsek dosyaların çoğunu
# sessizce atlarız — yedeğin en tehlikeli hatası "eksik ama başarılı
# görünen" yedektir.
function Get-KovaDosyalari {
  param([string] $KovaAdi, [string] $Onek = "")

  $sonuc = New-Object System.Collections.ArrayList
  $atlama = 0
  $sayfa = 100

  while ($true) {
    $govde = @{ prefix = $Onek; limit = $sayfa; offset = $atlama
                sortBy = @{ column = "name"; order = "asc" } } | ConvertTo-Json
    $yanit = Invoke-RestMethod -Method Post `
      -Uri "$url/storage/v1/object/list/$KovaAdi" `
      -Headers $basliklar -ContentType "application/json" -Body $govde

    if ($null -eq $yanit -or $yanit.Count -eq 0) { break }

    foreach ($oge in $yanit) {
      if ($Onek -eq "") { $yol = $oge.name } else { $yol = "$Onek/$($oge.name)" }
      if ($null -eq $oge.id) {
        # klasor -> icine in
        $alt = Get-KovaDosyalari -KovaAdi $KovaAdi -Onek $yol
        foreach ($a in $alt) { [void]$sonuc.Add($a) }
      } else {
        [void]$sonuc.Add([pscustomobject]@{
          yol   = $yol
          boyut = [int64]$oge.metadata.size
        })
      }
    }

    if ($yanit.Count -lt $sayfa) { break }
    $atlama += $sayfa
  }
  return $sonuc
}

# -------------------------------------------------------------------------
# 5) İNDİR + DOĞRULA
# -------------------------------------------------------------------------
$damga = Get-Date -Format "yyyy-MM-dd"
$hedefKok = Join-Path $kok (Join-Path $Cikti $damga)
New-Item -ItemType Directory -Force -Path $hedefKok | Out-Null

$kovalar = @("vehicle-images", "vehicle-invoices", "avatarlar", "belgeler")
if (-not [string]::IsNullOrWhiteSpace($Kova)) { $kovalar = @($Kova) }

$kunye = New-Object System.Collections.ArrayList
$toplamIndirilen = 0
$toplamAtlanan = 0
$toplamHata = 0
$toplamBayt = 0

foreach ($k in $kovalar) {
  Write-Host ""
  Write-Host "  [$k]" -ForegroundColor Cyan
  try {
    $dosyalar = Get-KovaDosyalari -KovaAdi $k
  } catch {
    Write-Host "    listelenemedi: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "    (ozel kova ise service_role anahtari gerekiyor)" -ForegroundColor DarkGray
    $toplamHata++
    continue
  }

  if ($dosyalar.Count -eq 0) {
    Write-Host "    bos" -ForegroundColor DarkGray
    continue
  }

  foreach ($d in $dosyalar) {
    $hedef = Join-Path $hedefKok (Join-Path $k ($d.yol -replace "/", "\"))
    $klasor = Split-Path -Parent $hedef
    if (-not (Test-Path $klasor)) { New-Item -ItemType Directory -Force -Path $klasor | Out-Null }

    # Zaten inmis ve boyutu tutuyorsa tekrar indirme (koşum yarıda kalabilir)
    if ((Test-Path $hedef) -and ((Get-Item $hedef).Length -eq $d.boyut)) {
      $ozet = (Get-FileHash -Path $hedef -Algorithm SHA256).Hash
      [void]$kunye.Add([pscustomobject]@{
        kova = $k; yol = $d.yol; boyut = $d.boyut; sha256 = $ozet; durum = "atlandi" })
      $toplamAtlanan++
      $toplamBayt += $d.boyut
      continue
    }

    # URL kacisi: dosya adlarinda bosluk ve Turkce karakter olabiliyor
    $kacis = ($d.yol -split "/" | ForEach-Object { [Uri]::EscapeDataString($_) }) -join "/"
    try {
      Invoke-WebRequest -Uri "$url/storage/v1/object/$k/$kacis" `
        -Headers $basliklar -OutFile $hedef -UseBasicParsing | Out-Null
    } catch {
      Write-Host "    HATA  $($d.yol) — $($_.Exception.Message)" -ForegroundColor Red
      $toplamHata++
      continue
    }

    # ⚠ INDIRDIM DEMEK YETMEZ: boyut tutuyor mu? Bir hata sayfasi da
    # dosya olarak inebilir ve yedek "basarili" gorunur.
    $inen = (Get-Item $hedef).Length
    if ($inen -ne $d.boyut) {
      Write-Host "    BOYUT UYUSMADI  $($d.yol): beklenen $($d.boyut), inen $inen" -ForegroundColor Red
      $toplamHata++
      continue
    }

    $ozet = (Get-FileHash -Path $hedef -Algorithm SHA256).Hash
    [void]$kunye.Add([pscustomobject]@{
      kova = $k; yol = $d.yol; boyut = $d.boyut; sha256 = $ozet; durum = "indirildi" })
    $toplamIndirilen++
    $toplamBayt += $d.boyut
  }

  $bu = ($kunye | Where-Object { $_.kova -eq $k }).Count
  Write-Host "    $bu dosya" -ForegroundColor Green
}

# -------------------------------------------------------------------------
# 6) KÜNYE — geri yüklemede "elimdeki dosya bozuk mu" sorusunun cevabı
# -------------------------------------------------------------------------
$kunyeYolu = Join-Path $hedefKok "kunye.json"
$paket = [pscustomobject]@{
  alindi     = (Get-Date).ToString("o")
  proje      = $url
  dosya      = $kunye.Count
  toplamBayt = $toplamBayt
  dosyalar   = $kunye
}
# ⚠ Set-Content DEĞİL: PS 5.1'de sistem kod sayfasına yazıyor ve Türkçe
# karakterli dosya adlarını bozuyor.
$paket | ConvertTo-Json -Depth 5 | Out-File -FilePath $kunyeYolu -Encoding utf8

Write-Host ""
Write-Host "  ------------------------------------------------------------"
Write-Host ("  {0} indirildi · {1} atlandi · {2} hata" -f $toplamIndirilen, $toplamAtlanan, $toplamHata)
Write-Host ("  Toplam: {0:N1} MB" -f ($toplamBayt / 1MB))
Write-Host "  Klasor: $hedefKok"
Write-Host "  Kunye : $kunyeYolu"
if ($toplamHata -gt 0) {
  Write-Host "  UYARI: hatali dosya var, yedek EKSIK." -ForegroundColor Red
  exit 1
}

# ⚠ BOS YEDEK BASARI SAYILMAZ — BU KUSUR GERCEKTEN YASANDI.
# Ilk surumde anon anahtariyla kosunca listeleme 0 kayit dondu, betik de
# "Yedek tam" yazip 0 ile cikti. Kovada 37 dosya vardi. Sessizce bos bir
# yedege guvenmek, hic yedek almamaktan kotudur: felaket aninda elinizde
# bir sey oldugunu sanirsiniz.
if ($kunye.Count -eq 0) {
  Write-Host "  DURDURULDU: hicbir dosya bulunamadi." -ForegroundColor Red
  Write-Host "  Kovalar gercekten bos olabilir, ama daha muhtemel olan" -ForegroundColor DarkGray
  Write-Host "  anahtarin listeleme yetkisi olmamasi. Bos yedek URETILMEDI." -ForegroundColor DarkGray
  exit 1
}

Write-Host "  Yedek tam." -ForegroundColor Green
