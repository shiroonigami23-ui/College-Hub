param([string]$Version = "1.0.0")

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$dist = Join-Path $root "dist"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist | Out-Null

$zip = Join-Path $dist ("college-hub-template-v{0}.zip" -f $Version)
Compress-Archive -Path @(
  "apps",
  "services",
  ".github",
  "scripts",
  "docs",
  "README.md",
  ".gitignore"
) -DestinationPath $zip -CompressionLevel Optimal

Write-Host "Created package: $zip"
