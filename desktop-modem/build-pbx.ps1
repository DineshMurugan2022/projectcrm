param([switch]$Force)
$ErrorActionPreference = 'Stop'

$vswhere = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'Visual Studio Build Tools 2022 is required to build the PBX engine.' }
$vsPath = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vsPath) { throw 'Install the Visual C++ x64 build tools, then run npm run build:pbx again.' }
$cmake = Join-Path $vsPath 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe'
if (-not (Test-Path -LiteralPath $cmake)) { throw 'The Visual Studio CMake component is missing.' }

$buildRoot = Join-Path $env:LOCALAPPDATA 'BNY-CRM-PBX\pjsip-2.17'
$source = Join-Path $buildRoot 'pjproject'
$build = Join-Path $buildRoot 'build'
$install = Join-Path $buildRoot 'install'
$engineBuild = Join-Path $buildRoot 'engine-build'
$native = Join-Path $PSScriptRoot 'native'
[IO.Directory]::CreateDirectory($buildRoot) | Out-Null
[IO.Directory]::CreateDirectory($native) | Out-Null

$builtEngine = Join-Path $native 'bny-pbx-engine.exe'
$sourceCode = Join-Path $PSScriptRoot 'pbx-engine\pbx-engine.cpp'
$sourceProject = Join-Path $PSScriptRoot 'pbx-engine\CMakeLists.txt'
$nativeResources = @('PJSIP-LICENSE.txt', 'PJSIP-2.17-source.zip', 'MSVCP140.dll', 'VCRUNTIME140.dll', 'VCRUNTIME140_1.dll')
$resourcesReady = @($nativeResources | Where-Object { -not (Test-Path -LiteralPath (Join-Path $native $_)) }).Count -eq 0
$engineReady = (Test-Path -LiteralPath $builtEngine) -and $resourcesReady -and
  (Get-Item -LiteralPath $builtEngine).LastWriteTimeUtc -ge (Get-Item -LiteralPath $sourceCode).LastWriteTimeUtc -and
  (Get-Item -LiteralPath $builtEngine).LastWriteTimeUtc -ge (Get-Item -LiteralPath $sourceProject).LastWriteTimeUtc
if ($engineReady -and -not $Force) {
  Write-Host 'PBX engine is current; pass -Force to rebuild it.'
  exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $source 'CMakeLists.txt'))) {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required to download the PJSIP 2.17 source.' }
  & git clone --depth 1 --branch 2.17 https://github.com/pjsip/pjproject.git $source
  if ($LASTEXITCODE -ne 0) { throw 'Could not download the PJSIP source.' }
}

& $cmake -S $source -B $build -G 'Visual Studio 17 2022' -A x64 -DPJ_SKIP_EXPERIMENTAL_NOTICE=ON -DPJLIB_WITH_SSL= -DPJMEDIA_WITH_AUDIODEV_WMME=ON -DBUILD_TESTING=OFF
if ($LASTEXITCODE -ne 0) { throw 'PJSIP CMake configuration failed.' }
& $cmake --build $build --config Release --target pjsua pjsua2 --parallel 8
if ($LASTEXITCODE -ne 0) { throw 'PJSIP build failed.' }
& $cmake --install $build --config Release --prefix $install
if ($LASTEXITCODE -ne 0) { throw 'PJSIP install step failed.' }
& $cmake -S (Join-Path $PSScriptRoot 'pbx-engine') -B $engineBuild -G 'Visual Studio 17 2022' -A x64 "-DCMAKE_PREFIX_PATH=$install"
if ($LASTEXITCODE -ne 0) { throw 'BNY PBX engine CMake configuration failed.' }
& $cmake --build $engineBuild --config Release --target bny-pbx-engine --parallel 8
if ($LASTEXITCODE -ne 0) { throw 'BNY PBX engine build failed.' }

$engine = Join-Path $engineBuild 'out\bny-pbx-engine.exe'
if (-not (Test-Path -LiteralPath $engine)) { throw 'The PBX engine binary was not produced.' }
Copy-Item -LiteralPath $engine -Destination $builtEngine -Force
$sourceArchive = Join-Path $native 'PJSIP-2.17-source.zip'
Copy-Item -LiteralPath (Join-Path $source 'COPYING') -Destination (Join-Path $native 'PJSIP-LICENSE.txt') -Force
& git -C $source archive --format=zip "--output=$sourceArchive" HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not create the PJSIP source archive.' }
$crtRoot = Join-Path $vsPath 'VC\Redist\MSVC'
$crtFolder = Get-ChildItem -LiteralPath $crtRoot -Directory -ErrorAction SilentlyContinue |
  ForEach-Object { Join-Path $_.FullName 'x64\Microsoft.VC143.CRT' } |
  Where-Object { Test-Path -LiteralPath $_ } |
  Sort-Object -Descending |
  Select-Object -First 1
if (-not $crtFolder) { throw 'The Visual C++ x64 runtime files are missing.' }
Get-ChildItem -LiteralPath $crtFolder -Filter '*.dll' | Copy-Item -Destination $native -Force
Write-Host 'PBX engine built and PJSIP license/source copied into desktop-modem/native.'
