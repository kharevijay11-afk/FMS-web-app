param(
  [switch]$Migrate,
  [switch]$SeedDemoUsers,
  [switch]$Start
)

$ErrorActionPreference = 'Stop'

if (-not $env:DATABASE_URL) {
  $secureUrl = Read-Host 'Paste the Supabase Session pooler connection string' -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
  try {
    $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

if (-not $env:DATABASE_URL.StartsWith('postgres')) {
  throw 'DATABASE_URL must be a PostgreSQL/Supabase connection string.'
}

$env:DATA_SOURCE = 'postgres'
$env:DATABASE_SSL = 'true'
# Supabase `sslmode=require`: encrypted transport; CA verification is unavailable
# on this Windows environment because the presented chain is self-signed.
$env:DATABASE_SSL_VERIFY = 'false'
$env:NODE_ENV = 'development'
$env:APP_ORIGIN = 'http://127.0.0.1:3000'

function New-Secret([int]$length) {
  $bytes = New-Object byte[] $length
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($bytes)
}

if (-not $env:MFA_ENCRYPTION_KEY) { $env:MFA_ENCRYPTION_KEY = New-Secret 32 }
if (-not $env:SESSION_SECRET) { $env:SESSION_SECRET = New-Secret 48 }
if (-not $env:TOKEN_PEPPER) { $env:TOKEN_PEPPER = New-Secret 48 }
if (-not $env:AUDIT_IP_PEPPER) { $env:AUDIT_IP_PEPPER = New-Secret 48 }

if ($Migrate) {
  npm.cmd run migrate
  if ($LASTEXITCODE -ne 0) {
    throw "Migration failed with exit code $LASTEXITCODE. Use the Supabase Session pooler connection string and run this command again."
  }
  Write-Host 'Migrations completed. Configure admission_courses and admission_batches before enabling admissions.'
}

if ($SeedDemoUsers) {
  npm.cmd run seed
  if ($LASTEXITCODE -ne 0) {
    throw "Demo-user seed failed with exit code $LASTEXITCODE."
  }
  Write-Host 'Demo users seeded. These accounts are only for the FMS Web App demo environment.'
}

if ($Start) {
  npm.cmd start
  exit $LASTEXITCODE
}

if (-not $Migrate -and -not $Start) {
  Write-Host 'Supabase environment loaded for this PowerShell window only. Run again with -Migrate to apply migrations.'
}
