$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
$desktopDirectory = [Environment]::GetFolderPath('Desktop')
$shortcutName = -join ([char[]](0x65F6, 0x95F4, 0x5730, 0x5C42))
$shortcutPath = Join-Path $desktopDirectory ($shortcutName + '.lnk')
$launchPath = Join-Path $projectDirectory 'Launch.ps1'
$iconPath = Join-Path $projectDirectory 'assets\chrono-icon.ico'
if (-not (Test-Path -LiteralPath $launchPath)) { throw 'The launcher file is missing.' }
if (-not (Test-Path -LiteralPath $iconPath)) { throw 'The icon file is missing.' }
if (Test-Path -LiteralPath $shortcutPath) { throw 'The desktop shortcut already exists; it was not overwritten.' }

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -WindowStyle Hidden -File "' + $launchPath + '"'
$shortcut.WorkingDirectory = $projectDirectory
$shortcut.IconLocation = $iconPath + ',0'
$shortcut.Description = 'Open Chrono-Sediment: anime, books and games.'
$shortcut.WindowStyle = 7
$shortcut.Save()
if (-not (Test-Path -LiteralPath $shortcutPath)) { throw 'The shortcut could not be saved.' }
Write-Output $shortcutPath
