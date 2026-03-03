# Moves .next build cache outside OneDrive to avoid EPERM errors.
# Run: npm run setup:next-cache (or .\scripts\setup-next-cache.ps1)

$projectRoot = $PSScriptRoot + "\.."
$cacheDir = "$env:LOCALAPPDATA\NextBuildCache\rizwan-fyp-next-app"

Set-Location $projectRoot

if (Test-Path ".next") {
    $item = Get-Item ".next" -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        Write-Host ".next is already a junction. No change needed." -ForegroundColor Green
        exit 0
    }
    Write-Host "Removing existing .next folder..."
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    cmd /c rmdir ".next" 2>$null
}

New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
cmd /c mklink /J ".next" $cacheDir
Write-Host "Junction created: .next -> $cacheDir" -ForegroundColor Green
Write-Host "Dev server will now write cache outside OneDrive. Run: npm run dev"
