param(
  [int]$Port = 3000
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "[dev:clean] stopping listener on port $Port"
$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
$processIds = @()
if ($listeners) {
  $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
}

foreach ($pid in $processIds) {
  if ($pid -and $pid -ne 0) {
    Write-Host "[dev:clean] stopping PID $pid"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "[dev:clean] clearing .next and ts build cache"
if (Test-Path ".next") {
  Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "tsconfig.tsbuildinfo") {
  Remove-Item -Path "tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue
}

Write-Host "[dev:clean] starting next dev on port $Port"
npm run dev -- -p $Port
