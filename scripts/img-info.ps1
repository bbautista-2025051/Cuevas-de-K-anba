Add-Type -AssemblyName System.Drawing
Get-ChildItem public\assets\img -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  Write-Output ("{0} {1}x{2} {3} KB" -f $_.Name, $img.Width, $img.Height, [math]::Round($_.Length/1KB))
  $img.Dispose()
}