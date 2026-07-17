param(
  [Parameter(Mandatory = $true)]
  [string]$WebRoot,

  [int]$PreferredPort = 4173,

  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$resolvedWebRoot = [System.IO.Path]::GetFullPath($WebRoot)
$indexPath = Join-Path $resolvedWebRoot 'index.html'

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  throw "Website entry file was not found: $indexPath"
}

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.css' { return 'text/css; charset=utf-8' }
    '.js' { return 'text/javascript; charset=utf-8' }
    '.mjs' { return 'text/javascript; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.svg' { return 'image/svg+xml' }
    '.png' { return 'image/png' }
    '.jpg' { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.webp' { return 'image/webp' }
    '.gif' { return 'image/gif' }
    '.ico' { return 'image/x-icon' }
    '.wav' { return 'audio/wav' }
    '.mp3' { return 'audio/mpeg' }
    '.woff' { return 'font/woff' }
    '.woff2' { return 'font/woff2' }
    '.ttf' { return 'font/ttf' }
    '.map' { return 'application/json; charset=utf-8' }
    default { return 'application/octet-stream' }
  }
}

function Write-HttpResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$IncludeBody = $true
  )

  $headers = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($IncludeBody -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

$listener = $null
$selectedPort = $null

foreach ($candidatePort in $PreferredPort..($PreferredPort + 100)) {
  $candidateListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidatePort)
  try {
    $candidateListener.Start()
    $listener = $candidateListener
    $selectedPort = $candidatePort
    break
  } catch [System.Net.Sockets.SocketException] {
    $candidateListener.Stop()
  }
}

if ($null -eq $listener -or $null -eq $selectedPort) {
  throw 'No available local port was found.'
}

$url = "http://127.0.0.1:$selectedPort/"

try {
  Write-Host ''
  Write-Host 'Qwerty Learner Local is running.' -ForegroundColor Green
  Write-Host "Browser address: $url"
  Write-Host 'Close this window to stop the local edition.' -ForegroundColor Yellow
  Write-Host ''

  if (-not $NoBrowser) {
    Start-Process $url
  }

  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    $reader = $null
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }

      while ($true) {
        $headerLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($headerLine)) {
          break
        }
      }

      $requestParts = $requestLine.Split(' ')
      if ($requestParts.Length -lt 2) {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Bad Request')
        Write-HttpResponse -Stream $stream -StatusCode 400 -StatusText 'Bad Request' -ContentType 'text/plain; charset=utf-8' -Body $body
        continue
      }

      $method = $requestParts[0].ToUpperInvariant()
      if ($method -ne 'GET' -and $method -ne 'HEAD') {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
        Write-HttpResponse -Stream $stream -StatusCode 405 -StatusText 'Method Not Allowed' -ContentType 'text/plain; charset=utf-8' -Body $body
        continue
      }

      $requestPath = $requestParts[1].Split('?')[0]
      $decodedPath = [System.Uri]::UnescapeDataString($requestPath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($decodedPath)) {
        $decodedPath = 'index.html'
      }

      $relativePath = $decodedPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $candidatePath = [System.IO.Path]::GetFullPath((Join-Path $resolvedWebRoot $relativePath))
      $isInsideWebRoot = $candidatePath.Equals($resolvedWebRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
        $candidatePath.StartsWith($resolvedWebRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)

      if (-not $isInsideWebRoot) {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
        Write-HttpResponse -Stream $stream -StatusCode 403 -StatusText 'Forbidden' -ContentType 'text/plain; charset=utf-8' -Body $body
        continue
      }

      if (-not (Test-Path -LiteralPath $candidatePath -PathType Leaf)) {
        if ([string]::IsNullOrEmpty([System.IO.Path]::GetExtension($relativePath))) {
          $candidatePath = $indexPath
        } else {
          $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
          Write-HttpResponse -Stream $stream -StatusCode 404 -StatusText 'Not Found' -ContentType 'text/plain; charset=utf-8' -Body $body
          continue
        }
      }

      $fileBytes = [System.IO.File]::ReadAllBytes($candidatePath)
      Write-HttpResponse -Stream $stream -StatusCode 200 -StatusText 'OK' -ContentType (Get-ContentType -Path $candidatePath) -Body $fileBytes -IncludeBody ($method -eq 'GET')
    } catch {
      Write-Warning "Request failed: $($_.Exception.Message)"
    } finally {
      if ($null -ne $reader) {
        $reader.Dispose()
      }
      if ($null -ne $stream) {
        $stream.Dispose()
      }
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
