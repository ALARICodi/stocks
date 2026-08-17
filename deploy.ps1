# Permanent deploy: push the current docs/ to GitHub Pages.
# Run ONLY when the user explicitly asks for the permanent URL to be updated.
# Site: https://alaricodi.github.io/stocks/

$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot

git -C $repo add -A
$changed = git -C $repo status --porcelain
if (-not $changed) {
    Write-Output "NOTHING_TO_PUSH -- permanent site is already up to date."
    Write-Output "URL=https://alaricodi.github.io/stocks/"
    exit 0
}

$n = ($changed | Measure-Object).Count
$msg = "update site " + (Get-Date -Format "yyyy-MM-dd HH:mm")
git -C $repo commit -q -m $msg

git -C $repo push origin main --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Output "PUSH_FAILED -- see message above."
    exit 1
}

Write-Output ("PUSHED " + $n + " changed files.")
Write-Output "Pages rebuild takes about 1-2 minutes, then refresh:"
Write-Output "URL=https://alaricodi.github.io/stocks/"
