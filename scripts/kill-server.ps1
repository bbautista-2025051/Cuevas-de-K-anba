$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen
foreach ($c in $conns) {
  try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop; Write-Output ("Detenido PID " + $c.OwningProcess) } catch { Write-Output ("No se pudo detener PID " + $c.OwningProcess) }
}