param(
    [switch]$CheckOnly,
    [ValidateRange(1, 65535)][int]$Port = 3001
)

$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
$archiveUrl = "http://127.0.0.1:$Port"
$expectedIdentity = ''
$script:lastHealthCode = 0
$launchMutex = $null
$ownsMutex = $false

function Test-ArchiveReady {
    $script:lastHealthCode = 0
    try {
        $response = Invoke-WebRequest -Uri "$archiveUrl/api/health" -UseBasicParsing -TimeoutSec 1
        $script:lastHealthCode = [int]$response.StatusCode
        return $response.Content -eq $expectedIdentity
    } catch {
        if ($_.Exception.Response) {
            $script:lastHealthCode = [int]$_.Exception.Response.StatusCode
        }
        return $false
    }
}

try {
    $hasher = [Security.Cryptography.SHA256]::Create()
    try {
        $archiveIdentity = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectDirectory.ToLowerInvariant()))).Replace('-', '').ToLowerInvariant()
        $identifier = $archiveIdentity.Substring(0, 16)
        $expectedIdentity = "CHRONO-SEDIMENT`n$archiveIdentity"
    } finally { $hasher.Dispose() }
    $launchMutex = New-Object Threading.Mutex($false, "Local\ChronoSediment-$identifier-$Port")
    try { $ownsMutex = $launchMutex.WaitOne(15000) }
    catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { throw 'Another launch is still in progress. Please try again in a moment.' }

    if (-not (Test-ArchiveReady)) {
        if ($script:lastHealthCode -gt 0) { throw "Port $Port belongs to another service. Close that service and try again." }
        $nodeExecutable = $null
        $nodePathFile = Join-Path $projectDirectory 'node-path.txt'
        if (Test-Path -LiteralPath $nodePathFile) {
            $configuredPath = (Get-Content -LiteralPath $nodePathFile -Raw).Trim()
            if (Test-Path -LiteralPath $configuredPath -PathType Leaf) { $nodeExecutable = $configuredPath }
        }
        if (-not $nodeExecutable) {
            $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($nodeCommand) { $nodeExecutable = $nodeCommand.Source }
        }
        if (-not $nodeExecutable) { throw 'Node.js was not found. Install it or update node-path.txt in the archive folder.' }

        $env:PORT = [string]$Port
        $env:CHRONO_DESKTOP = '1'
        $serverFile = Join-Path $projectDirectory 'server.js'
        $serverProcess = Start-Process -FilePath $nodeExecutable -ArgumentList ('"' + $serverFile + '"') -WorkingDirectory $projectDirectory -WindowStyle Hidden -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Milliseconds 150
            if (Test-ArchiveReady) { $ready = $true; break }
            if ($serverProcess.HasExited) { throw 'The archive service stopped. Check that its dependencies are installed.' }
        }
        if (-not $ready) { throw 'The archive did not start in time. Please try again.' }
    }

    if ($CheckOnly) { Write-Output 'Archive ready; existing server reused when available.' }
    else { Start-Process "$archiveUrl/index.html" }
} catch {
    if ($CheckOnly) { [Console]::Error.WriteLine($_.Exception.Message) }
    else {
        Add-Type -AssemblyName System.Windows.Forms
        [void][Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Chrono-Sediment', 'OK', 'Warning')
    }
    exit 1
} finally {
    if ($ownsMutex) { $launchMutex.ReleaseMutex() }
    if ($launchMutex) { $launchMutex.Dispose() }
}
