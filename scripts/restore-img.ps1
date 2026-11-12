$src = "scripts\img-bak"
$dst = "public\assets\img"
Get-ChildItem $src -File | ForEach-Object {
  $target = Join-Path $dst $_.Name
  Copy-Item $_.FullName $target -Force
}
Get-ChildItem $dst -File | Measure-Object -Property Length -Sum | ForEach-Object {
  Write-Output ("Restauradas: {0} archivos, {1} MB" -f $_.Count, [math]::Round($_.Sum / 1MB, 2))
}