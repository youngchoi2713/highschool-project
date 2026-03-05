param(
  [int]$Port = 3000
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "[dev:clean] stop existing server"
& "$PSScriptRoot\dev-server.ps1" -Action down -Port $Port | Out-Host

Write-Host "[dev:clean] clearing .next and ts build cache"
if (Test-Path ".next") {
  Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "tsconfig.tsbuildinfo") {
  Remove-Item -Path "tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue
}

Write-Host "[dev:clean] start server"
& "$PSScriptRoot\dev-server.ps1" -Action up -Port $Port
