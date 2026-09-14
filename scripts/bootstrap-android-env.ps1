# Bootstrap a JDK 21 + Android SDK command-line toolchain for building the
# Handheld Reader APK. Downloads run through Node's fetch (works on this host).
$ErrorActionPreference = 'Continue'
$base = Join-Path $env:USERPROFILE '.android-build'
$dl   = Join-Path $base 'downloads'
$sdk  = Join-Path $base 'sdk'
$jdkRoot = Join-Path $base 'jdk'
$log  = Join-Path $base 'bootstrap.log'
New-Item -ItemType Directory -Force -Path $dl, $sdk, $jdkRoot | Out-Null

function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
  Write-Output $line
  Add-Content -Path $log -Value $line
}

# ---------- helper: node downloader ----------
function Download-File($url, $out, $label) {
  Log "Downloading $label ..."
  $env:DL_URL = $url; $env:DL_OUT = $out
  $script = @'
const https = require('https');
const http = require('http');
const fs = require('fs');
const url = process.env.DL_URL;
const out = process.env.DL_OUT;
const path = require('path');
function get(u, redirects) {
  return new Promise((resolve, reject) => {
    const mod = u.startsWith('https') ? https : http;
    const req = mod.get(u, { headers: { 'user-agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 8) {
        res.resume();
        const next = new URL(res.headers.location, u).toString();
        resolve(get(next, redirects + 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode + ' for ' + u)); return; }
      resolve(res);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(new Error('timeout ' + u)); });
  });
}
(async () => {
  const res = await get(url, 0);
  const len = parseInt(res.headers['content-length'] || '0', 10);
  const ws = fs.createWriteStream(out);
  let got = 0;
  res.on('data', (c) => { got += c.length; });
  res.pipe(ws);
  await new Promise((resolve, reject) => { ws.on('finish', resolve); ws.on('error', reject); });
  console.log('downloaded', got, 'bytes to', out);
})().catch((e) => { console.error('DL_ERR', e.message); process.exit(1); });
'@
  $env:NODE_SCRIPT = $script
  $env:DL_LABEL = $label
  node -e "eval(process.env.NODE_SCRIPT)" 2>&1 | ForEach-Object { Log $_ }
  if ($LASTEXITCODE -ne 0) { Log "$label FAILED"; return $false }
  return (Test-Path $out)
}

Log 'Bootstrap started'

# ---------- 1. JDK 21 (Microsoft build) ----------
$jdkZip = Join-Path $dl 'jdk21.zip'
$jdkBin = Get-ChildItem -Path $jdkRoot -Filter 'java.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdkBin) {
  $ok = Download-File 'https://aka.ms/download-jdk/microsoft-jdk-21.0.6-windows-x64.zip' $jdkZip 'JDK 21'
  if (-not $ok) { Log 'JDK download failed'; exit 1 }
  Log ('JDK zip bytes: ' + (Get-Item $jdkZip).Length)
  Log 'Extracting JDK ...'
  Expand-Archive -Path $jdkZip -DestinationPath $jdkRoot -Force
  Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
  $jdkBin = Get-ChildItem -Path $jdkRoot -Filter 'java.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
} else { Log 'JDK already present' }
if (-not $jdkBin) { Log 'ERROR: java.exe not found'; exit 1 }
$javaHome = $jdkBin.Directory.Parent.FullName
Log ("JAVA_HOME=" + $javaHome)

# ---------- 2. Android cmdline-tools ----------
$cltZip = Join-Path $dl 'commandlinetools.zip'
$sdkManager = Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkManager)) {
  $ok = Download-File 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip' $cltZip 'Android cmdline-tools'
  if (-not $ok) { Log 'cmdline-tools download failed'; exit 1 }
  Log ('CLT zip bytes: ' + (Get-Item $cltZip).Length)
  Log 'Extracting cmdline-tools ...'
  $tmp = Join-Path $dl 'clt_extract'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $cltZip -DestinationPath $tmp -Force
  Remove-Item $cltZip -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path (Join-Path $sdk 'cmdline-tools') | Out-Null
  $cltDir = Join-Path $tmp 'cmdline-tools'
  if (Test-Path $cltDir) {
    Move-Item -Path $cltDir -Destination (Join-Path $sdk 'cmdline-tools\latest') -Force
  }
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
} else { Log 'cmdline-tools already present' }
if (-not (Test-Path $sdkManager)) { Log 'ERROR: sdkmanager.bat missing'; exit 1 }

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$javaHome\bin;" + $env:Path

# ---------- 3. Accept licenses ----------
Log 'Accepting SDK licenses ...'
1..30 | ForEach-Object { 'y' } | & $sdkManager --sdk_root=$sdk --licenses *>> $log

# ---------- 4. Install packages ----------
Log 'Installing platforms;android-36, build-tools;36.0.0, platform-tools ...'
& $sdkManager --sdk_root=$sdk 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools' *>> $log
Log 'sdkmanager install returned'

# ---------- 5. Verify ----------
Log '--- VERIFY ---'
& "$javaHome\bin\java.exe" -version 2>&1 | ForEach-Object { Log $_ }
& $sdkManager --sdk_root=$sdk --list_installed 2>&1 | Select-Object -First 25 | ForEach-Object { Log $_ }
Log 'Bootstrap finished'
