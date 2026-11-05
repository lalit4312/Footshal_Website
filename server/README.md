# Neco Insurance Futsal API

## Create the first admin account

The first account is created as a Super Admin. From PowerShell, run:

```powershell
Set-Location 'D:\neco_insurance_ltd\server'
$env:ADMIN_NAME = 'Neco Insurance'
$env:ADMIN_EMAIL = 'neco@insurance.com.np'
$securePassword = Read-Host 'Choose a unique admin password (at least 12 characters)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
try {
  node .\src\scripts\create-admin.js
} finally {
  Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
  $securePassword.Dispose()
}
```

The password is entered privately and is not stored in the source code. The setup script reads `MONGODB_URI` from the server's `.env` file. It only creates the first account; if an account already exists, use the authenticated user-management API instead.

After the script reports that it created the account, start the API and frontend, open the site's **Admin** page (usually `http://localhost:5173/admin`), and sign in with `neco@insurance.com.np` and the password you entered.