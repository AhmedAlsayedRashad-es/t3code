<#
.SYNOPSIS
  Builds the Windows (NSIS, x64) desktop installer from this checkout into the project's "installer" folder.

.EXAMPLE
  scripts\build-windows-installer.cmd
  scripts\build-windows-installer.cmd -Version 0.2.0
#>
param(
  # Installer version (X.Y.Z). Defaults to one patch above the newest build in -OutputRoot.
  [string]$Version,
  # Where builds and the cached resource monitor live.
  [string]$OutputRoot = "D:\T3CodeBuild",
  # Final copy goes here as First-Option-Code-Setup-<version>-x64.exe.
  [string]$CopyTo = (Join-Path (Split-Path -Parent $PSScriptRoot) "installer")
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Fail($message) {
  Write-Host ""
  Write-Host "BUILD FAILED: $message" -ForegroundColor Red
  exit 1
}

Write-Host "Repo:   $repo"
Write-Host "Commit: $(git -C $repo log -1 --format='%h %s (%cr)') on $(git -C $repo branch --show-current)"
$dirty = git -C $repo status --porcelain
if ($dirty) { Write-Host "Note: uncommitted changes are included in this build." -ForegroundColor Yellow }

# --- Version ---------------------------------------------------------------
if (-not $Version) {
  $previous = Get-ChildItem -LiteralPath $OutputRoot -Directory -Filter "installer-*" -ErrorAction SilentlyContinue |
    ForEach-Object { if ($_.Name -match '^installer-(\d+\.\d+\.\d+)$') { [version]$Matches[1] } } |
    Sort-Object -Descending | Select-Object -First 1
  if ($previous) {
    $Version = "$($previous.Major).$($previous.Minor).$($previous.Build + 1)"
  } else {
    $Version = (Get-Content -Raw "$repo\apps\desktop\package.json" | ConvertFrom-Json).version
  }
}
if ($Version -notmatch '^\d+\.\d+\.\d+$') { Fail "Version must look like 1.2.3 (got '$Version')." }
$buildVersion = "$Version-local.$(Get-Date -Format yyyyMMdd)"
$outputDir = Join-Path $OutputRoot "installer-$Version"
Write-Host "Version: $buildVersion"
Write-Host "Output:  $outputDir"
Write-Host ""

# --- Dependencies ------------------------------------------------------------
$env:PATH = "$repo\node_modules\.bin;$env:PATH"
if (-not (Test-Path "$repo\node_modules\.bin\vp.cmd")) {
  Write-Host "Installing dependencies (first run in this checkout)..." -ForegroundColor Cyan
  corepack pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { Fail "Dependency install failed." }
}

# --- Resource monitor (Rust) -------------------------------------------------
# Without cargo, reuse a prebuilt binary cached in $OutputRoot\tools.
$monitorPath = "$repo\native\resource-monitor\target\x86_64-pc-windows-msvc\release\t3-resource-monitor.exe"
$monitorCache = Join-Path $OutputRoot "tools\t3-resource-monitor.exe"
if (Get-Command cargo -ErrorAction SilentlyContinue) {
  Remove-Item Env:\T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR -ErrorAction SilentlyContinue
} else {
  if (-not (Test-Path $monitorPath)) {
    if (-not (Test-Path $monitorCache)) {
      Fail "Rust is not installed and no cached resource monitor exists at $monitorCache. Install Rust (https://rustup.rs) or copy t3-resource-monitor.exe there."
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $monitorPath) | Out-Null
    Copy-Item -LiteralPath $monitorCache -Destination $monitorPath
  }
  $env:T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR = "1"
}

# --- Build -------------------------------------------------------------------
$started = Get-Date
node scripts/build-desktop-artifact.ts --platform win --target nsis --arch x64 `
  --build-version $buildVersion --output-dir $outputDir
if ($LASTEXITCODE -ne 0) { Fail "build-desktop-artifact exited with code $LASTEXITCODE (see output above)." }

$installer = Get-ChildItem -LiteralPath $outputDir -Filter "*-x64.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) { Fail "No installer .exe found in $outputDir." }

if ((Test-Path $monitorPath) -and -not (Test-Path $monitorCache)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $monitorCache) | Out-Null
  Copy-Item -LiteralPath $monitorPath -Destination $monitorCache
}

$final = $installer.FullName
if ($CopyTo) {
  New-Item -ItemType Directory -Force -Path $CopyTo | Out-Null
  $final = Join-Path $CopyTo "First-Option-Code-Setup-$Version-x64.exe"
  Copy-Item -LiteralPath $installer.FullName -Destination $final -Force
}

$minutes = [math]::Round(((Get-Date) - $started).TotalMinutes, 1)
Write-Host ""
Write-Host "Installer ready ($minutes min): $final" -ForegroundColor Green
