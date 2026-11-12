Add-Type -AssemblyName System.Drawing

param([switch]$Test)

$src = "public\assets\img"
$bak = "scripts\img-bak"
New-Item -ItemType Directory -Force -Path $bak | Out-Null

$files = Get-ChildItem $src -File | Where-Object { $_.Extension -match '\.(jpg|jpeg)$' }
if ($Test) { $files = $files | Select-Object -First 1 }

foreach ($file in $files) {
  $before = $file.Length
  $dest = Join-Path $bak $file.Name
  if (-not (Test-Path $dest)) { Copy-Item $file.FullName $dest -Force }

  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString() + ".jpg")
  try {
    $img = [System.Drawing.Image]::FromFile($file.FullName)
    $img.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $img.Dispose()
    $newBytes = [System.IO.File]::ReadAllBytes($tmp)
    if ($newBytes.Length -lt $before) {
      [System.IO.File]::WriteAllBytes($file.FullName, $newBytes)
      Write-Output ("OK  {0}  {1} KB -> {2} KB" -f $file.Name, [math]::Round($before/1KB), [math]::Round($newBytes.Length/1KB))
    } else {
      Write-Output ("SKIP {0}  (el re-encode no mejora)" -f $file.Name)
    }
  } catch {
    Write-Output ("ERROR {0}: {1}" -f $file.Name, $_.Exception.Message)
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}