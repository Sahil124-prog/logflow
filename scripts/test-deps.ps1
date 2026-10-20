# # Starts the throwaway databases that `npm test` needs:
# #   Mongo on 27018 (all three suites), Redis on 6380 (api + ingestion limiter tests).
# # Safe to run any time: it only starts what isn't running, then waits until each answers.
# $deps = @(
#   @{ Name = "logflow-test-mongo"; Image = "mongo:6";        Port = "27018:27017"; Ping = @("mongosh", "--quiet", "--eval", "db.runCommand({ping:1}).ok") },
#   @{ Name = "logflow-test-redis"; Image = "redis:7-alpine"; Port = "6380:6379";   Ping = @("redis-cli", "ping") }
# )

# foreach ($d in $deps) {
#   $running = docker ps --filter "name=^$($d.Name)$" --format "{{.Names}}"
#   if ($running) {
#     Write-Host "$($d.Name): already running"
#   } else {
#     docker run -d --rm --name $d.Name -p $d.Port $d.Image | Out-Null
#     Write-Host "$($d.Name): started"
#   }

#   # Ready = the database answers its own ping, not just "container started"
#   $ok = $false
#   for ($i = 0; $i -lt 30; $i++) {
#     docker exec $d.Name @($d.Ping) 2>$null | Out-Null
#     if ($LASTEXITCODE -eq 0) { $ok = $true; break }
#     Start-Sleep -Seconds 1
#   }
#   if ($ok) { Write-Host "$($d.Name): ready" } else { Write-Error "$($d.Name): not ready after 30 s" }
# }


# Starts the throwaway databases that `npm test` needs:
#   Mongo on 27018 (all three suites), Redis on 6380 (api + ingestion limiter tests).
# "Ready" is checked FROM WINDOWS, through Docker's port forwarding — the same path the
# tests use. (A check inside the container can pass while the forwarded port is not up yet.)

function Test-PortFromHost([int]$port, [bool]$redisPing) {
  $c = New-Object Net.Sockets.TcpClient
  try {
    if (-not $c.ConnectAsync("127.0.0.1", $port).Wait(2000)) { return $false }
    if (-not $redisPing) { return $true }              # Mongo: an accepted connection is enough
    $s = $c.GetStream(); $s.ReadTimeout = 2000
    $b = [Text.Encoding]::ASCII.GetBytes("PING`r`n"); $s.Write($b, 0, $b.Length)
    $buf = New-Object byte[] 16; $n = $s.Read($buf, 0, 16)
    return ([Text.Encoding]::ASCII.GetString($buf, 0, $n)) -like "+PONG*"   # Redis must answer
  } catch { return $false } finally { $c.Close() }
}

$deps = @(
  @{ Name = "logflow-test-mongo"; Image = "mongo:6";        HostPort = 27018; Inner = 27017; Redis = $false },
  @{ Name = "logflow-test-redis"; Image = "redis:7-alpine"; HostPort = 6380;  Inner = 6379;  Redis = $true  }
)

foreach ($d in $deps) {
  $running = docker ps --filter "name=^$($d.Name)$" --format "{{.Names}}"
  if ($running) {
    Write-Host "$($d.Name): already running"
  } else {
    docker run -d --rm --name $d.Name -p "$($d.HostPort):$($d.Inner)" $d.Image | Out-Null
    Write-Host "$($d.Name): started"
  }
  $ok = $false
  for ($i = 0; $i -lt 30; $i++) {
    if (Test-PortFromHost $d.HostPort $d.Redis) { $ok = $true; break }
    Start-Sleep -Seconds 1
  }
  if ($ok) { Write-Host "$($d.Name): ready on 127.0.0.1:$($d.HostPort)" }
  else     { Write-Error "$($d.Name): not reachable from Windows on port $($d.HostPort) after 30 s — try restarting Docker Desktop" }
}