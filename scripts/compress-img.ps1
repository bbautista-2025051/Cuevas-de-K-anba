Add-Type -AssemblyName System.Drawing

$src = "public\assets\img"
$bak = "scripts\img-bak"
New-Item -ItemType Directory -Force -Path $bak | Out-Null

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq 'JPEG' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]72)

$totalBefore = 0; $totalAfter = 0
Get-ChildItem $src -File | Where-Object { $_.Extension -match '\.(jpg|jpeg)$' } | ForEach-Object {
  $before = $_.Length
  $totalBefore += $before
  $dest = Join-Path $bak $_.Name
  if (-not (Test-Path $dest)) { Copy-Item $_.FullName $dest -Force }

  $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
  $ms = New-Object System.IO.MemoryStream(, $bytes)
  $img = [System.Drawing.Image]::FromStream($ms)
  $ms.Dispose()

  $msOut = New-Object System.IO.MemoryStream
  $img.Save($msOut, $codec, $encoderParams)
  $img.Dispose()
  $newBytes = $msOut.ToArray()
  $msOut.Dispose()

  if ($newBytes.Length -lt $before) {
    [System.IO.File]::WriteAllBytes($_.FullName, $newBytes)
    $totalAfter += $newBytes.Length
    Write-Output ("OK  {0}  {1} KB -> {2} KB" -f $_.Name, [math]::Round($before/1KB), [math]::Round($newBytes.Length/1KB))
  } else {
    $totalAfter += $before
    Write-Output ("SKIP {0}  (no mejora)" -f $_.Name)
  }
}
Write-Output ("TOTAL: {0} MB -> {1} MB" -f [math]::Round($totalBefore/1MB, 2), [math]::Round($totalAfter/1MB, 2))