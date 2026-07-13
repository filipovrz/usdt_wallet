# EvtinkoWallet — restart helper (double-click or run from terminal)
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$exe = Join-Path $root 'node_modules\electron\dist\electron.exe'

if (-not (Test-Path $exe)) {
  Write-Host 'Electron not found. Run: npm install && npm run build'
  exit 1
}

Get-Process -Name 'electron' -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -like "*usdt_wallet*" } |
  Stop-Process -Force -ErrorAction SilentlyContinue

$env:NODE_ENV = 'production'
Start-Process -FilePath $exe -ArgumentList '.' -WorkingDirectory $root -WindowStyle Normal
Write-Host 'EvtinkoWallet started.'
