#Requires -Version 7.2
<#
.SYNOPSIS
  Planwright local operations. Run from any directory.

.DESCRIPTION
  Planwright is a static site: plans live in each visitor's browser (localStorage), not on the server.
  So there is no server-side database to seed, back up or restore. Those commands exist for a uniform
  portfolio interface and explain where the data actually is.

.EXAMPLE
  ./scripts/ops.ps1 setup        # build the image and start it
  ./scripts/ops.ps1 start        # start (http://127.0.0.1:8104)
  ./scripts/ops.ps1 stop         # stop and remove the container
  ./scripts/ops.ps1 status       # container, health and live resource usage
  ./scripts/ops.ps1 logs         # last 200 log lines
  ./scripts/ops.ps1 test         # format, lint, types, unit tests, build and size budget
  ./scripts/ops.ps1 e2e          # end-to-end tests against the running container
  ./scripts/ops.ps1 seed | backup | restore | reset-demo
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0, Mandatory)]
  [ValidateSet('setup', 'start', 'stop', 'status', 'logs', 'seed', 'backup', 'restore', 'reset-demo', 'test', 'e2e')]
  [string]$Command,
  [Parameter(Position = 1)]
  [string]$Target,
  [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root
$Url = 'http://127.0.0.1:8104'

function Invoke-Checked {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$File $($Arguments -join ' ') failed with exit code $LASTEXITCODE" }
}

function Wait-Healthy([int]$TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri "$Url/healthz" -TimeoutSec 3 -SkipHttpErrorCheck
      if ($r.StatusCode -eq 200) { return }
    } catch { }
    Start-Sleep -Seconds 1
  }
  throw "Planwright did not become ready within $TimeoutSeconds s. Check: ./scripts/ops.ps1 logs"
}

switch ($Command) {
  'setup' {
    Invoke-Checked docker @('compose', 'build')
    Invoke-Checked docker @('compose', 'up', '-d', '--wait')
    Write-Host "Planwright is running at $Url"
  }
  'start' {
    Invoke-Checked docker @('compose', 'up', '-d', '--wait')
    Wait-Healthy
    Write-Host "Planwright is running at $Url"
  }
  'stop' {
    Invoke-Checked docker @('compose', 'down')
    Write-Host 'Stopped. Plans stay in each browser; nothing was stored in the container.'
  }
  'status' {
    Invoke-Checked docker @('compose', 'ps', '--format', 'table {{.Service}}\t{{.State}}\t{{.Health}}\t{{.Ports}}')
    $ids = docker compose ps -q
    if ($ids) { Invoke-Checked docker (@('stats', '--no-stream', '--format', 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}') + $ids) }
  }
  'logs' {
    Invoke-Checked docker @('compose', 'logs', '--tail', '200', '--timestamps')
  }
  'seed' {
    Write-Host 'Nothing to seed on the server. A first visit (or Data > Load sample plan) shows the built-in sample plan.'
  }
  'backup' {
    Write-Host 'The container holds no data. Each person backs up their own plan in the app: Data > Export > Plan file (JSON).'
    Write-Host 'The deployable artefact is the image itself: docker image save planwright:local (see docs/OPERATIONS.md).'
  }
  'restore' {
    Write-Host 'Restore happens in the browser: Data > Import, choose the exported JSON file, check the preview, Replace.'
  }
  'reset-demo' {
    if (-not $Yes) {
      Write-Warning 'reset-demo recreates the container. It cannot touch plans saved in browsers; to reset those use Data > Load sample plan (undoable). Re-run with -Yes.'
      exit 2
    }
    Invoke-Checked docker @('compose', 'up', '-d', '--force-recreate', '--wait')
    Write-Host "Container recreated. $Url"
  }
  'test' {
    Invoke-Checked npm @('run', 'format:check')
    Invoke-Checked npm @('run', 'lint')
    Invoke-Checked npm @('run', 'typecheck')
    Invoke-Checked npm @('test')
    Invoke-Checked npm @('run', 'build')
    Invoke-Checked npm @('run', 'budget')
    Write-Host 'All checks passed. End-to-end: ./scripts/ops.ps1 e2e (needs the container: ops.ps1 start).'
  }
  'e2e' {
    Wait-Healthy 10
    Invoke-Checked npx @('playwright', 'test', '--project=desktop', '--project=mobile')
  }
}
