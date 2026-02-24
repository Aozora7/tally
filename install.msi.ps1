$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Restarting with administrator privileges..."
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$msiDir = Join-Path $PSScriptRoot "src-tauri\target\release\bundle\msi"

if (-not (Test-Path $msiDir)) {
    Write-Error "Error: MSI directory not found. Run 'npm run tauri:build' first."
    Read-Host "Press Enter to exit"
    exit 1
}

$msiFile = Get-ChildItem -Path $msiDir -Filter "*.msi" | Select-Object -First 1

if (-not $msiFile) {
    Write-Error "Error: No MSI file found in $msiDir"
    Read-Host "Press Enter to exit"
    exit 1
}

$msiPath = $msiFile.FullName
$logPath = Join-Path $PSScriptRoot "msi-install.log"

Write-Host "Installing: $msiPath"
Write-Host "Log file: $logPath"

$process = Start-Process msiexec -ArgumentList "/i `"$msiPath`" /quiet /norestart /l*vx `"$logPath`"" -Wait -PassThru

if ($process.ExitCode -eq 0) {
    Write-Host "Installation complete."
} elseif ($process.ExitCode -eq 3010) {
    Write-Host "Installation complete. Restart required."
} else {
    Write-Error "Installation failed with exit code: $($process.ExitCode)"
    Write-Host "Check log file for details: $logPath"
}

Read-Host "Press Enter to exit"
