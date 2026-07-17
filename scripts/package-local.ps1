$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$workspaceRoot = [System.IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$buildRoot = Join-Path $workspaceRoot 'build'
$releaseRoot = Join-Path $workspaceRoot 'local-release'
$packageRoot = Join-Path $releaseRoot 'qwerty-learner-local'
$archivePath = Join-Path $releaseRoot 'qwerty-learner-local.zip'

if (-not (Test-Path -LiteralPath (Join-Path $buildRoot 'index.html') -PathType Leaf)) {
  throw "Production build was not found: $buildRoot"
}

if (Test-Path -LiteralPath $packageRoot) {
  $resolvedPackageRoot = (Resolve-Path -LiteralPath $packageRoot).Path
  if (-not $resolvedPackageRoot.StartsWith($releaseRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean a directory outside local-release: $resolvedPackageRoot"
  }
  Remove-Item -LiteralPath $resolvedPackageRoot -Recurse -Force
}

if (Test-Path -LiteralPath $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
Copy-Item -LiteralPath $buildRoot -Destination (Join-Path $packageRoot 'app') -Recurse
Copy-Item -Path (Join-Path $workspaceRoot '*.cmd') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'start-local-server.ps1') -Destination (Join-Path $packageRoot 'local-server.ps1')

$instructions = @'
Qwerty Learner Local Edition

How to use:
1. Extract the entire qwerty-learner-local.zip archive.
2. Double-click start-local.cmd.
3. The browser opens automatically. Close the launcher window to stop.

Node.js and npm dev are not required at runtime.
Word pronunciation still uses an online service and requires a network connection.
'@
Set-Content -LiteralPath (Join-Path $packageRoot 'README.txt') -Value $instructions -Encoding UTF8

Compress-Archive -LiteralPath $packageRoot -DestinationPath $archivePath -CompressionLevel Optimal

Write-Host ''
Write-Host 'Local package created:' -ForegroundColor Green
Write-Host $archivePath
