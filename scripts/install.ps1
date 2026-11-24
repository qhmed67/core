# Thin PowerShell wrapper around install.mjs.
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error 'install: Node.js 18 or newer is required (node not found on PATH)'
    exit 1
}

& node (Join-Path $here 'install.mjs') @args
exit $LASTEXITCODE
