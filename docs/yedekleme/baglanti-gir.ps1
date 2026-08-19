# =========================================================================
# SON ADIM — VERITABANI BAGLANTI DIZESINI SECRET'A YAZ
#
# Depo, is akisi ve yedek sifresi kuruldu. Geriye yalnizca bu kaldi:
# baglanti dizesi veritabani sifrenizi iceriyor, o yuzden onu siz giriyorsunuz.
#
# ⚠ SIFRENIZ BU MAKINEDEN CIKMAZ. Gizli olarak sorulur, ekrana yazilmaz,
# dosyaya kaydedilmez; dogrudan GitHub secret'ina gider.
#
# CALISTIRMA (proje kokunden):
#   powershell -ExecutionPolicy Bypass -File docs\yedekleme\baglanti-gir.ps1
# =========================================================================

$ErrorActionPreference = 'Stop'
$DEPO = 'onuradamcil/otocv-yedek'

# --- gh'yi bul -----------------------------------------------------------
# Kurulum sirasinda gecici bir klasore indirildi; PATH'te de olabilir.
$gh = $null
$aday = Get-Command gh -ErrorAction SilentlyContinue
if ($aday) { $gh = $aday.Source }
# ⚠ ACIK BIR TERMINALDE PATH ESKI OLABILIR. gh kurulumdan sonra PATH'e
# eklenir ama zaten acik olan pencereler bunu gormez; standart konum
# dogrudan deneniyor.
if (-not $gh -and (Test-Path "$env:ProgramFiles\GitHub CLI\gh.exe")) {
    $gh = "$env:ProgramFiles\GitHub CLI\gh.exe"
}
if (-not $gh -and (Test-Path "$env:LOCALAPPDATA\Microsoft\WinGet\Links\gh.exe")) {
    $gh = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\gh.exe"
}
# Son care: kurulum sirasinda gecici klasore indirilmis bir kopya.
if (-not $gh) {
    $gecici = Get-ChildItem -Path $env:TEMP -Filter gh.exe -Recurse -ErrorAction SilentlyContinue |
              Select-Object -First 1
    if ($gecici) { $gh = $gecici.FullName }
}
if (-not $gh) {
    Write-Host "gh bulunamadi. Once kur.ps1'i calistirin ya da:" -ForegroundColor Red
    Write-Host "  winget install --id GitHub.cli" -ForegroundColor Red
    exit 1
}

# --- token -------------------------------------------------------------
# Git Credential Manager'daki GitHub kimligi kullaniliyor; ekrana yazilmiyor.
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$token = ($cred | Select-String '^password=').ToString() -replace '^password=', ''
if (-not $token) {
    Write-Host "GitHub kimligi bulunamadi. `gh auth login` calistirin." -ForegroundColor Red
    exit 1
}
$env:GH_TOKEN = $token

# --- dizeyi sor ---------------------------------------------------------
Write-Host @"

BAGLANTI DIZESI
---------------
Supabase panelinde: Project Settings -> Database -> Connection string

!! 'Session pooler' sekmesini secin, 'Direct connection' DEGIL.
   Dogrudan baglanti IPv6-only; GitHub makineleri IPv4 ve baglanamaz.

Sunun gibi gorunur:
postgresql://postgres.zjfxwvmcouuyrebltmwz:SIFRE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

"@ -ForegroundColor Gray

$gizli = Read-Host "Dizeyi yapistirin (ekranda gorunmez)" -AsSecureString
$dize  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
           [Runtime.InteropServices.Marshal]::SecureStringToBSTR($gizli))

if ([string]::IsNullOrWhiteSpace($dize)) {
    Write-Host "Bos birakildi, cikiliyor." -ForegroundColor Red; exit 1
}
if ($dize -notmatch '^postgres(ql)?://') {
    Write-Host "Bu bir baglanti dizesi degil." -ForegroundColor Red; exit 1
}
if ($dize -match 'db\..*\.supabase\.co') {
    Write-Host "`n!! Bu DIRECT connection gibi gorunuyor (db.*.supabase.co)." -ForegroundColor Yellow
    Write-Host "   GitHub makineleri IPv4; bu adrese baglanamaz." -ForegroundColor Yellow
    $devam = Read-Host "   Yine de devam edilsin mi? (e/h)"
    if ($devam -ne 'e') { exit 1 }
}
if ($dize -match ':6543/') {
    Write-Host "`n!! Port 6543 = transaction mode. pg_dump SESSION mode ister." -ForegroundColor Yellow
    Write-Host "   Ayni panelden 5432 portlu 'Session pooler' dizesini alin." -ForegroundColor Yellow
    $devam = Read-Host "   Yine de devam edilsin mi? (e/h)"
    if ($devam -ne 'e') { exit 1 }
}

$dize | & $gh secret set VERITABANI_URL --repo $DEPO
Write-Host "OK  VERITABANI_URL yazildi (ekrana/diske yazilmadi)" -ForegroundColor Green

# --- ilk yedegi calistir ------------------------------------------------
Write-Host "`nIlk yedek tetikleniyor..." -ForegroundColor Cyan
& $gh workflow run "Günlük veritabanı yedeği" --repo $DEPO
Start-Sleep -Seconds 10

Write-Host "`nSonucu izleyin:" -ForegroundColor Cyan
Write-Host "  https://github.com/$DEPO/actions" -ForegroundColor White
Write-Host "`n!! Yesil tik YETERLI DEGIL. Geri yukleme provasini yapin:" -ForegroundColor Yellow
Write-Host "   docs\yedekleme\README.md" -ForegroundColor White
