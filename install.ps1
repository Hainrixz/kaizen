$ErrorActionPreference = "Stop"

param(
  [string]$RepoUrl = $(if ($env:KAIZEN_REPO_URL) { $env:KAIZEN_REPO_URL } else { "https://github.com/Hainrixz/kaizen.git" }),
  [string]$Branch = $(if ($env:KAIZEN_BRANCH) { $env:KAIZEN_BRANCH } else { "" }),
  [string]$InstallDir = $(if ($env:KAIZEN_INSTALL_DIR) { $env:KAIZEN_INSTALL_DIR } else { Join-Path $HOME ".kaizen\agent" }),
  [string]$BinDir = $(if ($env:KAIZEN_BIN_DIR) { $env:KAIZEN_BIN_DIR } else { Join-Path $HOME ".kaizen\bin" })
)

function Test-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "git")) {
  throw "[kaizen installer] git is required. install git and re-run."
}
if (-not (Test-Command "node")) {
  throw "[kaizen installer] node.js is required (v20+). install node and re-run."
}
if (-not (Test-Command "corepack")) {
  throw "[kaizen installer] corepack is required. install a node version that includes corepack and re-run."
}

$nodeVersion = (& node -p "process.versions.node").Trim()
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 20) {
  throw "[kaizen installer] node v20+ is required. found: $nodeVersion"
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
  $remoteHead = (& git ls-remote --symref $RepoUrl HEAD 2>$null) | Where-Object { $_ -match "^ref:\s+refs/heads/" } | Select-Object -First 1
  if ($remoteHead) {
    $Branch = ($remoteHead -split "\s+")[1] -replace "^refs/heads/", ""
  }
  if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = "main"
  }
}

Write-Host "[kaizen installer] repo: $RepoUrl"
Write-Host "[kaizen installer] branch: $Branch"
Write-Host "[kaizen installer] install dir: $InstallDir"
Write-Host "[kaizen installer] bin dir: $BinDir"

$installParent = Split-Path -Parent $InstallDir
if (-not (Test-Path $installParent)) {
  New-Item -ItemType Directory -Path $installParent -Force | Out-Null
}

$gitDir = Join-Path $InstallDir ".git"
if (Test-Path $gitDir) {
  Write-Host "[kaizen installer] updating existing install..."
  & git -C $InstallDir fetch origin $Branch --depth 1
  & git -C $InstallDir checkout $Branch
  & git -C $InstallDir pull --ff-only origin $Branch
} else {
  if (Test-Path $InstallDir) {
    throw "[kaizen installer] install dir exists but is not a git checkout: $InstallDir`n[kaizen installer] remove that directory (or use -InstallDir) and run again."
  }
  Write-Host "[kaizen installer] cloning kaizen..."
  & git clone --depth 1 --branch $Branch $RepoUrl $InstallDir
}

Write-Host "[kaizen installer] installing dependencies..."
Push-Location $InstallDir
try {
  try {
    & corepack enable | Out-Null
  } catch {
  }
  & corepack pnpm install --frozen-lockfile
  & corepack pnpm build
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Path $BinDir -Force | Out-Null

$cmdPath = Join-Path $BinDir "kaizen.cmd"
$cmdContent = "@echo off`r`nnode `"$InstallDir\kaizen.mjs`" %*`r`n"
Set-Content -Path $cmdPath -Value $cmdContent -Encoding Ascii

$ps1Path = Join-Path $BinDir "kaizen.ps1"
$ps1Content = @"
param([Parameter(ValueFromRemainingArguments=`$true)][string[]]`$Args)
node "$InstallDir\kaizen.mjs" @Args
"@
Set-Content -Path $ps1Path -Value $ps1Content -Encoding Ascii

$env:Path = "$BinDir;$env:Path"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$normalizedParts = @()
if (-not [string]::IsNullOrWhiteSpace($userPath)) {
  $normalizedParts = $userPath.Split(";") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

$pathUpdated = $false
if ($normalizedParts -notcontains $BinDir) {
  $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $BinDir } else { "$BinDir;$userPath" }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  $pathUpdated = $true
}

Write-Host ""
Write-Host "kaizen installed."
Write-Host "launcher: $cmdPath"
if ($pathUpdated) {
  Write-Host "user PATH updated. open a new terminal to use 'kaizen' globally."
}
Write-Host ""
Write-Host "next steps:"
Write-Host "1) kaizen onboard"
Write-Host "2) kaizen start"
