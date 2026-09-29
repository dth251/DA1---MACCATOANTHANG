$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Can cai Node.js 22 hoac moi hon truoc khi chay may chu.'
}
$adminName = Read-Host 'Ten dang nhap admin (Enter de dung admin)'
if ([string]::IsNullOrWhiteSpace($adminName)) { $adminName = 'admin' }
$adminSecret = Read-Host 'Mat khau admin (toi thieu 12 ky tu)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
try {
  $env:ADMIN_USERNAME = $adminName
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  & node (Join-Path $PSScriptRoot 'server\server.cjs')
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  Remove-Item Env:\ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:\ADMIN_USERNAME -ErrorAction SilentlyContinue
}
