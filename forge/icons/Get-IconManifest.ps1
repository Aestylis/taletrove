Function Get-IconManifest {
    Get-ChildItem -File -Filter *.svg | Select-Object -Expand BaseName | ConvertTo-Json
}
Get-IconManifest