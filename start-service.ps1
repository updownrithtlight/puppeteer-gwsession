$ErrorActionPreference = "Stop"

$ProjectDir = "D:\dev\heng\300.cn\puppeteer-gwsession"
$LogDir = Join-Path $ProjectDir "logs"
$StdoutLog = Join-Path $LogDir "service-out.log"
$StderrLog = Join-Path $LogDir "service-error.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectDir

$Npm = "D:\Program Files\nodejs\npm.cmd"

if (!(Test-Path $Npm)) {
  $Npm = "npm.cmd"
}

Start-Process `
  -FilePath $Npm `
  -ArgumentList "start" `
  -WorkingDirectory $ProjectDir `
  -RedirectStandardOutput $StdoutLog `
  -RedirectStandardError $StderrLog `
  -WindowStyle Hidden
