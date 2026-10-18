param([string]$RuntimeArchive = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$lock = Get-Content release/runtime-lock.json -Raw | ConvertFrom-Json
if ($pkg.version -notmatch '^\d+\.\d+\.\d+(-[a-z0-9.]+)?$') { throw 'Invalid release version' }
if (-not $RuntimeArchive) {
  New-Item -ItemType Directory -Force release-cache | Out-Null
  $RuntimeArchive = Join-Path $root ('release-cache/' + $lock.archive)
  if (-not (Test-Path -LiteralPath $RuntimeArchive)) { Invoke-WebRequest $lock.url -OutFile $RuntimeArchive }
}
$RuntimeArchive = (Resolve-Path -LiteralPath $RuntimeArchive).Path
if ((Get-FileHash -LiteralPath $RuntimeArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $lock.sha256) { throw 'Official Node archive SHA256 mismatch' }
$stage = Join-Path $root ('release-stage/' + [guid]::NewGuid().ToString('N'))
$name = 'Muyu-' + $pkg.version + '-windows-x64-portable'
$app = Join-Path $stage $name
New-Item -ItemType Directory -Force $app | Out-Null
foreach ($dir in @('js','assets','companion')) { Copy-Item -LiteralPath (Join-Path $root $dir) -Destination $app -Recurse }
# Explicitly copy source and original demo data only; never local files added to companion/data.
$copiedData = Join-Path $app 'companion/data'
Get-ChildItem -LiteralPath $copiedData -File | Where-Object Name -ne '示例.json' | ForEach-Object { throw 'Private companion data found; use clean checkout for release' }
foreach ($file in @('index.html','styles.css','server.cjs','runtime-paths.cjs','package.json','we-connect.html','we-connect.css','we-connect.js','RIGHTS.md','一键打开.bat','启用系统信息.bat','停止系统信息.bat','关闭系统信息自动启动.bat','停止编辑器.bat','连接桌面系统信息.bat')) { Copy-Item -LiteralPath (Join-Path $root $file) -Destination $app }
New-Item -ItemType Directory -Force (Join-Path $app 'scripts') | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'scripts/launch.cjs') -Destination (Join-Path $app 'scripts')
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $app 'start.bat'), "@echo off`r`nchcp 65001 >nul`r`ncd /d `"%~dp0`"`r`n`"%~dp0runtime\node.exe`" `"%~dp0scripts\launch.cjs`" %*`r`nif errorlevel 1 pause`r`n", $utf8)
[IO.File]::WriteAllText((Join-Path $app 'distribution.json'), (@{version=$pkg.version;platform='windows-x64';runtime=$lock.version} | ConvertTo-Json), $utf8)
Copy-Item -LiteralPath (Join-Path $root 'release/使用说明.txt') -Destination $app
Expand-Archive -LiteralPath $RuntimeArchive -DestinationPath (Join-Path $stage 'node')
$node = Join-Path $stage ('node/node-v' + $lock.version + '-win-x64')
New-Item -ItemType Directory -Force (Join-Path $app 'runtime'),(Join-Path $app 'licenses') | Out-Null
Copy-Item -LiteralPath (Join-Path $node 'node.exe') -Destination (Join-Path $app 'runtime')
Copy-Item -LiteralPath (Join-Path $node 'LICENSE') -Destination (Join-Path $app 'licenses/Node-LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $root 'assets/LICENSE.txt') -Destination (Join-Path $app 'licenses/Assets-LICENSE.txt')
& (Join-Path $app 'runtime/node.exe') (Join-Path $root 'scripts/verify-release.cjs') $app
if ($LASTEXITCODE -ne 0) { throw 'Release verification failed' }
New-Item -ItemType Directory -Force (Join-Path $root 'dist') | Out-Null
$zip = Join-Path $root ('dist/' + $name + '.zip')
if (Test-Path -LiteralPath $zip) { throw 'Output already exists; choose a fresh version or move previous local output aside' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
# Only the application tree is archived, with one top-level directory.
$zipTemp = Join-Path $stage 'app.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($app,$zipTemp,[IO.Compression.CompressionLevel]::Optimal,$true)
Move-Item -LiteralPath $zipTemp -Destination $zip
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $root 'dist/SHA256SUMS.txt'), "$hash  $name.zip`n", $utf8)
Write-Output "Built: $zip"
