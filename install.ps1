$ErrorActionPreference = "Stop"

param(
  [string]$RepoUrl = $(if ($env:KAIZEN_REPO_URL) { $env:KAIZEN_REPO_URL } else { "https://github.com/Hainrixz/kaizen.git" }),
  [string]$Branch = $(if ($env:KAIZEN_BRANCH) { $env:KAIZEN_BRANCH } else { "" }),
  [string]$InstallDir = $(if ($env:KAIZEN_INSTALL_DIR) { $env:KAIZEN_INSTALL_DIR } else { Join-Path $HOME ".kaizen\agent" }),
  [string]$BinDir = $(if ($env:KAIZEN_BIN_DIR) { $env:KAIZEN_BIN_DIR } else { Join-Path $HOME ".kaizen\bin" }),
  [switch]$NoLaunch,
  [switch]$NoOnboard
)

function Resolve-AutoLaunch {
  param([switch]$NoLaunchFlag)
  if ($NoLaunchFlag) {
    return $false
  }

  $value = $env:KAIZEN_AUTO_LAUNCH
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $true
  }

  $normalized = $value.Trim().ToLowerInvariant()
  if ($normalized -in @("0", "false", "off", "no")) {
    return $false
  }
  return $true
}

function Resolve-AutoOnboard {
  param([switch]$NoOnboardFlag)
  if ($NoOnboardFlag) {
    return $false
  }

  $value = $env:KAIZEN_AUTO_ONBOARD
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $true
  }

  $normalized = $value.Trim().ToLowerInvariant()
  if ($normalized -in @("0", "false", "off", "no")) {
    return $false
  }
  return $true
}

function Get-RunModeFromConfig {
  param([string]$ConfigPath)
  if (-not (Test-Path $ConfigPath)) {
    return "manual"
  }

  try {
    $raw = Get-Content -Path $ConfigPath -Raw
    $parsed = $raw | ConvertFrom-Json
    $mode = "$($parsed.defaults.runMode)".Trim().ToLowerInvariant()
    if ($mode -eq "always-on") {
      return "always-on"
    }
  } catch {
  }

  return "manual"
}

function Write-ManualNextSteps {
  param(
    [bool]$HasConfig,
    [string]$RunMode
  )

  Write-Host "run these manually:"
  $step = 1

  if (-not $HasConfig) {
    Write-Host "$step) kaizen onboard"
    $step++
    $RunMode = "manual"
  }

  if ($RunMode -eq "always-on") {
    Write-Host "$step) kaizen service install"
    $step++
    Write-Host "$step) kaizen service start"
    $step++
    Write-Host "$step) kaizen service status"
  } else {
    Write-Host "$step) kaizen start"
  }
}

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
$autoLaunch = Resolve-AutoLaunch -NoLaunchFlag:$NoLaunch
$autoOnboard = Resolve-AutoOnboard -NoOnboardFlag:$NoOnboard
Write-Host "[kaizen installer] auto launch: $autoLaunch"
Write-Host "[kaizen installer] auto onboard: $autoOnboard"

$configPath = if ($env:KAIZEN_CONFIG_PATH) { $env:KAIZEN_CONFIG_PATH } else { Join-Path $HOME ".kaizen\kaizen.json" }
$hadConfigBeforeInstall = Test-Path $configPath

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

$kaizenHome = if (-not [string]::IsNullOrWhiteSpace($env:KAIZEN_HOME)) {
  $env:KAIZEN_HOME
} elseif (-not [string]::IsNullOrWhiteSpace($env:KAIZEN_CONFIG_PATH)) {
  Split-Path -Parent $env:KAIZEN_CONFIG_PATH
} else {
  Join-Path $HOME ".kaizen"
}

$installMetadataPath = Join-Path $kaizenHome "install.json"
try {
  New-Item -ItemType Directory -Path $kaizenHome -Force | Out-Null
  $installMetadata = @{
    version = 1
    platform = "win32"
    installDir = $InstallDir
    binDir = $BinDir
    launcherPaths = @($cmdPath, $ps1Path)
    pathConfig = @{
      kind = "windows-user-path"
      binDir = $BinDir
    }
    installedAt = (Get-Date).ToString("o")
  }
  $installMetadata | ConvertTo-Json -Depth 8 | Set-Content -Path $installMetadataPath -Encoding UTF8
} catch {
  Write-Warning "[kaizen installer] unable to write install metadata: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "kaizen installed."
Write-Host "launcher: $cmdPath"
if ($pathUpdated) {
  Write-Host "user PATH updated. open a new terminal to use 'kaizen' globally."
}
Write-Host ""
if ($autoLaunch) {
  if (-not $hadConfigBeforeInstall) {
    if ($autoOnboard) {
      Write-Host "[kaizen installer] launching onboarding..."
      try {
        & $cmdPath onboard --auto-start false
      } catch {
        Write-Warning "[kaizen installer] onboarding failed: $($_.Exception.Message)"
      }
    } else {
      Write-Host "[kaizen installer] onboarding skipped (-NoOnboard)."
    }
  } else {
    Write-Host "[kaizen installer] existing config found. skipping onboarding."
  }

  $hasConfigNow = Test-Path $configPath
  $runMode = Get-RunModeFromConfig -ConfigPath $configPath

  if ($hasConfigNow -and $runMode -eq "always-on") {
    Write-Host "[kaizen installer] run mode is always-on. installing and starting service..."
    try {
      & $cmdPath service install
    } catch {
      Write-Warning "[kaizen installer] service install failed: $($_.Exception.Message)"
    }
    try {
      & $cmdPath service start
    } catch {
      Write-Warning "[kaizen installer] service start failed: $($_.Exception.Message)"
    }
    try {
      & $cmdPath service status
    } catch {
      Write-Warning "[kaizen installer] service status check failed: $($_.Exception.Message)"
    }
  } elseif ($hasConfigNow) {
    Write-Host "[kaizen installer] run mode is manual. launching kaizen..."
    try {
      & $cmdPath start
    } catch {
      Write-Warning "[kaizen installer] start failed: $($_.Exception.Message)"
    }
  } else {
    Write-Host "no Kaizen config found yet."
    Write-ManualNextSteps -HasConfig:$false -RunMode:"manual"
  }
} else {
  Write-Host "auto-launch disabled."
  $hasConfigNow = Test-Path $configPath
  $runMode = Get-RunModeFromConfig -ConfigPath $configPath
  Write-ManualNextSteps -HasConfig:$hasConfigNow -RunMode:$runMode
}
