param(
  [ValidateSet("up", "down", "restart", "status", "logs")]
  [string]$Action = "status",
  [int]$Port = 3000,
  [int]$Tail = 80,
  [int]$StartupTimeoutSec = 45
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $ProjectRoot "tmp-dev$Port.pid"
$OutFile = Join-Path $ProjectRoot "tmp-dev$Port.out.log"
$ErrFile = Join-Path $ProjectRoot "tmp-dev$Port.err.log"

function Write-Info([string]$Message) {
  Write-Host "[dev-server] $Message"
}

function Get-ListenerPids([int]$ListenPort) {
  try {
    $listeners = Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) { return @() }
    return @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {
    return @()
  }
}

function Read-PidFile {
  if (-not (Test-Path $PidFile)) { return $null }
  $raw = (Get-Content -Raw $PidFile).Trim()
  $parsedPid = 0
  if ([int]::TryParse($raw, [ref]$parsedPid)) { return $parsedPid }
  return $null
}

function Write-PidFile([int]$ProcessId) {
  Set-Content -Path $PidFile -Value "$ProcessId" -Encoding ASCII
}

function Clear-PidFile {
  if (Test-Path $PidFile) {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }
}

function Is-PidAlive([int]$ProcessId) {
  if ($ProcessId -le 0) { return $false }
  $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  return $null -ne $proc
}

function Stop-ByPid([int]$ProcessId) {
  if ($ProcessId -gt 0) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
  }
}

function Test-Health([int]$HealthPort) {
  try {
    $tcpClient = [System.Net.Sockets.TcpClient]::new()
    $connect = $tcpClient.BeginConnect("127.0.0.1", $HealthPort, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(500)) {
      $tcpClient.Close()
      return $false
    }

    $tcpClient.EndConnect($connect)
    $tcpClient.Close()
    return $true
  } catch {
    return $false
  }
}

function Tail-Logs([int]$Lines) {
  Write-Info "logs: $OutFile"
  Write-Info "errors: $ErrFile"

  if (Test-Path $OutFile) {
    Write-Host "--- OUT (tail $Lines) ---"
    Get-Content -Tail $Lines $OutFile
  } else {
    Write-Host "--- OUT ---"
    Write-Host "(no output log)"
  }

  if (Test-Path $ErrFile) {
    Write-Host "--- ERR (tail $Lines) ---"
    Get-Content -Tail $Lines $ErrFile
  } else {
    Write-Host "--- ERR ---"
    Write-Host "(no error log)"
  }
}

function Get-NpmCommand {
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCmd) { return $npmCmd.Source }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) { return $npm.Source }

  throw "npm command not found in PATH."
}

function Start-Server {
  Set-Location $ProjectRoot

  $trackedPid = Read-PidFile
  if ($trackedPid -and (Is-PidAlive $trackedPid) -and (Test-Health $Port)) {
    Write-Info "already running (PID=$trackedPid, port=$Port)"
    return 0
  }

  foreach ($listenerProcessId in (Get-ListenerPids $Port)) {
    if ($listenerProcessId -gt 0) {
      Write-Info "stopping existing listener PID=$listenerProcessId on port $Port"
      Stop-ByPid $listenerProcessId
    }
  }

  if (Test-Path $OutFile) { Remove-Item $OutFile -Force -ErrorAction SilentlyContinue }
  if (Test-Path $ErrFile) { Remove-Item $ErrFile -Force -ErrorAction SilentlyContinue }

  $npmCommandPath = Get-NpmCommand
  Write-Info "starting next dev on port $Port"

  try {
    $proc = Start-Process `
      -FilePath $npmCommandPath `
      -ArgumentList @("run", "dev", "--", "-p", $Port.ToString()) `
      -WorkingDirectory $ProjectRoot `
      -RedirectStandardOutput $OutFile `
      -RedirectStandardError $ErrFile `
      -WindowStyle Hidden `
      -PassThru
  } catch {
    Write-Info "failed to start process: $($_.Exception.Message)"
    return 1
  }

  Write-PidFile -ProcessId $proc.Id

  $maxChecks = [Math]::Max(1, [int][Math]::Ceiling($StartupTimeoutSec * 2))
  for ($i = 0; $i -lt $maxChecks; $i++) {
    Start-Sleep -Milliseconds 500

    if (-not (Is-PidAlive $proc.Id)) {
      Write-Info "process exited early (PID=$($proc.Id))."
      Tail-Logs 120
      Clear-PidFile
      return 1
    }

    if (Test-Health $Port) {
      Write-Info "running (PID=$($proc.Id), port=$Port)"
      return 0
    }
  }

  Write-Info "failed to become healthy within ${StartupTimeoutSec}s."
  Tail-Logs 120
  return 1
}

function Stop-Server {
  $trackedPid = Read-PidFile
  if ($trackedPid -and (Is-PidAlive $trackedPid)) {
    Write-Info "stopping tracked PID=$trackedPid"
    Stop-ByPid $trackedPid
  }

  foreach ($listenerProcessId in (Get-ListenerPids $Port)) {
    if ($listenerProcessId -gt 0) {
      Write-Info "stopping listener PID=$listenerProcessId"
      Stop-ByPid $listenerProcessId
    }
  }

  Clear-PidFile
  Write-Info "stopped"
  return 0
}

function Show-Status {
  $trackedPid = Read-PidFile
  $listenerPids = @(Get-ListenerPids $Port)
  $healthy = Test-Health $Port

  if ($healthy) {
    $pidText = if ($listenerPids.Count -gt 0) { ($listenerPids -join ",") } else { "unknown" }
    Write-Info "RUNNING (port=$Port, listener PID=$pidText)"
  } elseif ($trackedPid -and (Is-PidAlive $trackedPid)) {
    Write-Info "STARTING/UNHEALTHY (tracked PID=$trackedPid, port=$Port)"
  } else {
    Write-Info "STOPPED (port=$Port)"
  }

  Write-Info "logs: $OutFile"
  Write-Info "errors: $ErrFile"
  return 0
}

try {
  switch ($Action) {
    "up" { exit (Start-Server) }
    "down" { exit (Stop-Server) }
    "restart" {
      $null = Stop-Server
      exit (Start-Server)
    }
    "status" { exit (Show-Status) }
    "logs" {
      Tail-Logs $Tail
      exit 0
    }
    default {
      Write-Info "unknown action: $Action"
      exit 1
    }
  }
} catch {
  Write-Info "fatal error: $($_.Exception.Message)"
  exit 1
}
