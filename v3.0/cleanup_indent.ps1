$files = @("v2.5/js/state.js", "v2.5/js/auth.js", "v2.5/js/catalog.js", "v2.5/js/ui.js", "v2.5/js/app.js")

foreach ($file in $files) {
    if (Test-Path $file) {
        (Get-Content $file) | ForEach-Object { $_ -replace '^\s{8}', '' } | Set-Content $file -Encoding UTF8
        Write-Host "Cleaned $file"
    }
}
