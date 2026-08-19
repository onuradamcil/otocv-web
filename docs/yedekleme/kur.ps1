# =========================================================================
# OTO-CV YEDEK DEPOSU — TEK KOMUTLA KURULUM
#
# NE YAPAR:
#   1. GitHub CLI yoksa kurar
#   2. GitHub'a giriş yapmanızı ister (tarayıcı, bir kez)
#   3. `otocv-yedek` adında GİZLİ bir depo açar
#   4. Yedek iş akışını içine koyar
#   5. Veritabanı bağlantı dizenizi ve üretilen şifreyi secret olarak yazar
#   6. İlk yedeği çalıştırır ve sonucunu gösterir
#
# ⚠ ŞİFRENİZ BU MAKİNEDEN ÇIKMAZ. Bağlantı dizesi gizli olarak sorulur,
# ekrana yazılmaz, dosyaya kaydedilmez; doğrudan GitHub secret'a gider.
#
# ÇALIŞTIRMA (proje kökünden):
#   powershell -ExecutionPolicy Bypass -File docs\yedekleme\kur.ps1
# =========================================================================

$ErrorActionPreference = 'Stop'

function Adim($n, $m) { Write-Host "`n[$n] $m" -ForegroundColor Cyan }
function Tamam($m)    { Write-Host "    OK  $m" -ForegroundColor Green }
function Uyari($m)    { Write-Host "    !!  $m" -ForegroundColor Yellow }

Write-Host "OTO-CV YEDEK DEPOSU KURULUMU" -ForegroundColor White

# -------------------------------------------------------------------------
Adim 1 "GitHub CLI kontrol ediliyor"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Uyari "gh kurulu degil, winget ile kuruluyor (1-2 dk)"
    winget install --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements
    # winget PATH'i mevcut oturuma yansitmiyor; elle tazeleniyor.
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path','User')
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "`ngh kuruldu ama bu pencereden gorunmuyor." -ForegroundColor Red
        Write-Host "YENI bir PowerShell penceresi acip betigi tekrar calistirin." -ForegroundColor Red
        exit 1
    }
}
Tamam (gh --version | Select-Object -First 1)

# -------------------------------------------------------------------------
Adim 2 "GitHub oturumu"
$yetkili = $false
try { gh auth status 2>&1 | Out-Null; $yetkili = ($LASTEXITCODE -eq 0) } catch { $yetkili = $false }
if (-not $yetkili) {
    Uyari "Tarayici acilacak, GitHub hesabinizla giris yapin"
    gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { Write-Host "Giris basarisiz." -ForegroundColor Red; exit 1 }
}
$kullanici = (gh api user --jq .login)
Tamam "giris yapildi: $kullanici"

# -------------------------------------------------------------------------
Adim 3 "Gizli depo aciliyor"
$depo = "$kullanici/otocv-yedek"
$varMi = $false
try { gh repo view $depo 2>&1 | Out-Null; $varMi = ($LASTEXITCODE -eq 0) } catch { $varMi = $false }

if ($varMi) {
    Uyari "$depo zaten var, yeniden olusturulmuyor"
    # ⚠ Var olan depo ACIK olabilir; yedek acik depoda DURMAMALI.
    $gorunurluk = (gh repo view $depo --json visibility --jq .visibility)
    if ($gorunurluk -ne 'PRIVATE') {
        Write-Host "`n!! $depo GIZLI DEGIL ($gorunurluk)." -ForegroundColor Red
        Write-Host "   Yedek acik bir depoda duramaz. Once gizli yapin:" -ForegroundColor Red
        Write-Host "   gh repo edit $depo --visibility private" -ForegroundColor Red
        exit 1
    }
} else {
    gh repo create $depo --private --description "OtoCV veritabani yedekleri (otomatik)" | Out-Null
    Tamam "$depo olusturuldu (gizli)"
}

# -------------------------------------------------------------------------
Adim 4 "Is akisi yukleniyor"
$kaynak = Join-Path $PSScriptRoot 'yedek-workflow.yml'
if (-not (Test-Path $kaynak)) { Write-Host "yedek-workflow.yml bulunamadi: $kaynak" -ForegroundColor Red; exit 1 }

$gecici = Join-Path $env:TEMP ("otocv-yedek-" + [guid]::NewGuid().ToString('N').Substring(0,8))
git clone "https://github.com/$depo.git" $gecici 2>&1 | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $gecici '.github\workflows') | Out-Null
Copy-Item $kaynak (Join-Path $gecici '.github\workflows\yedek.yml') -Force

# Depoda ne oldugunu anlatan kisa bir not.
$okuBeni = @'
# OtoCV Veritabani Yedekleri

Bu depo YALNIZCA yedek almak icin var. Uygulama kodu `otocv-web` deposunda.

- Her gece 03:00 (TR) veritabaninin tam kopyasi alinir, GPG AES-256 ile
  sifrelenir ve bu deponun Actions sekmesinde artifact olarak saklanir.
- Saklama suresi 90 gun. Daha uzun arsiv icin aylik bir kopyayi indirip
  kendi alaninizda tutun.
- Sifre `YEDEK_SIFRESI` secret'inda. KAYBEDERSENIZ YEDEKLER ACILAMAZ.

Kurulum, geri yukleme provasi ve sinirlar:
otocv-web deposunda `docs/yedekleme/README.md`

## Kapsam disi
Supabase Storage'daki dosyalar (arac fotograflari, faturalar) bu yedege
DAHIL DEGIL.
'@
Set-Content -Path (Join-Path $gecici 'README.md') -Value $okuBeni -Encoding utf8

Push-Location $gecici
git add -A | Out-Null
git -c user.name="otocv-kurulum" -c user.email="noreply@otocv.local" commit -q -m "chore: gunluk yedek is akisi" 2>&1 | Out-Null
git push -q origin HEAD 2>&1 | Out-Null
Pop-Location
Remove-Item -Recurse -Force $gecici -ErrorAction SilentlyContinue
Tamam "yedek.yml depoya konuldu"

# -------------------------------------------------------------------------
Adim 5 "Veritabani baglanti dizesi"
Write-Host @"
    Supabase panelinde: Project Settings -> Database -> Connection string
    !! 'Session pooler' sekmesini secin, 'Direct connection' DEGIL.
       (Dogrudan baglanti IPv6-only; GitHub makineleri IPv4 ve baglanamaz.)

    Sunun gibi gorunur:
    postgresql://postgres.zjfxwvmcouuyrebltmwz:SIFRE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
"@ -ForegroundColor Gray

$gizli = Read-Host "    Baglanti dizesini yapistirin (ekranda gorunmez)" -AsSecureString
$dize  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
           [Runtime.InteropServices.Marshal]::SecureStringToBSTR($gizli))

if ([string]::IsNullOrWhiteSpace($dize)) { Write-Host "Bos birakildi, cikiliyor." -ForegroundColor Red; exit 1 }
if ($dize -notmatch '^postgres(ql)?://') { Write-Host "Bu bir baglanti dizesi degil." -ForegroundColor Red; exit 1 }
if ($dize -match 'db\..*\.supabase\.co') {
    Uyari "Bu DIRECT connection gibi gorunuyor (db.*.supabase.co)."
    Uyari "GitHub makineleri IPv4; bu adrese baglanamaz. Session pooler kullanin."
    $devam = Read-Host "    Yine de devam edilsin mi? (e/h)"
    if ($devam -ne 'e') { exit 1 }
}

$dize | gh secret set VERITABANI_URL --repo $depo
Tamam "VERITABANI_URL yazildi (ekrana ve diske yazilmadi)"

# -------------------------------------------------------------------------
Adim 6 "Yedek sifresi uretiliyor"
# 32 bayt rastgele -> base64. .NET'in kriptografik ureteci kullaniliyor.
$bayt = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bayt)
$sifre = [Convert]::ToBase64String($bayt)
$sifre | gh secret set YEDEK_SIFRESI --repo $depo
Tamam "YEDEK_SIFRESI yazildi"

Write-Host "`n=========================================================" -ForegroundColor Yellow
Write-Host " YEDEK SIFRESI - SIMDI KAYDEDIN, BIR DAHA GOSTERILMEYECEK" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host " $sifre" -ForegroundColor White
Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host " Bunu sifre yoneticinize kaydedin. Kaybederseniz yedekler" -ForegroundColor Yellow
Write-Host " ACILAMAZ - elinizde acilamayan dosyalar kalir." -ForegroundColor Yellow
Read-Host "`n Kaydettiginizde Enter'a basin"

# -------------------------------------------------------------------------
Adim 7 "Ilk yedek calistiriliyor"
gh workflow run "Günlük veritabanı yedeği" --repo $depo
Start-Sleep -Seconds 8
Tamam "tetiklendi"

Write-Host "`nSONUCU IZLEYIN:" -ForegroundColor Cyan
Write-Host "  gh run watch --repo $depo" -ForegroundColor White
Write-Host "  ya da: https://github.com/$depo/actions" -ForegroundColor White
Write-Host "`nYesil tik yeterli DEGIL - geri yukleme provasini yapin:" -ForegroundColor Yellow
Write-Host "  otocv-web/docs/yedekleme/README.md" -ForegroundColor White
