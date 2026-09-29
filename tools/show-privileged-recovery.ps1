$ErrorActionPreference = 'Stop'

$recoveryPath = Join-Path $env:USERPROFILE '.antideploy\fms-privileged-accounts-recovery.dpapi'
if (-not (Test-Path -LiteralPath $recoveryPath)) {
  throw "Encrypted recovery bundle was not found at $recoveryPath"
}

$protected = (Get-Content -LiteralPath $recoveryPath -Raw).Trim() | ConvertTo-SecureString
$json = [Net.NetworkCredential]::new('', $protected).Password
$bundle = $json | ConvertFrom-Json

Write-Host "Site: $($bundle.site)"
Write-Host "Created: $($bundle.createdAt)"
Write-Host 'Keep this terminal private. Add each TOTP secret to an authenticator app.'
$bundle.accounts | Select-Object userId, displayName, role, temporaryPassword, totpSecret, otpauthUri | Format-List
