# ShopTrace Traffic Generator
# Sends realistic mixed traffic to populate SigNoz with traces, metrics & logs

$BASE    = "http://localhost:3000"
$ROUNDS  = 60
$DELAY_MS = 1500

$customers = @(
  "alice@example.com", "bob@dev.io", "carol@shop.net",
  "dave@acme.com",     "eve@startup.co", "frank@corp.org"
)

function Invoke-GET($url) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
    return $r.StatusCode, ($r.Content | ConvertFrom-Json)
  } catch {
    $resp = $_.Exception.Response
    if ($resp -ne $null) {
      $code = [int]$resp.StatusCode
    } else {
      $code = 0
    }
    return $code, $null
  }
}

function Invoke-POST($url, $body) {
  try {
    $json = $body | ConvertTo-Json
    $r = Invoke-WebRequest -Uri $url -Method POST -Body $json `
         -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    return $r.StatusCode, ($r.Content | ConvertFrom-Json)
  } catch {
    $resp = $_.Exception.Response
    if ($resp -ne $null) {
      $code = [int]$resp.StatusCode
    } else {
      $code = 0
    }
    return $code, $null
  }
}

function Log($emoji, $msg) {
  Write-Host "$emoji  $msg"
}

# Fetch products
Log ">" "Fetching product catalogue..."
$sc, $products = Invoke-GET "$BASE/products"
if (-not $products -or $products.Count -eq 0) {
  Write-Host "FAIL: Could not fetch products (HTTP $sc). Is the app running?" -ForegroundColor Red
  exit 1
}
Log "OK" "Found $($products.Count) products"
$productIds = $products | Select-Object -ExpandProperty id

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Starting $ROUNDS rounds of traffic..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$orderIds = New-Object System.Collections.Generic.List[string]
$ok = 0; $errCount = 0; $orders = 0

for ($i = 1; $i -le $ROUNDS; $i++) {
  $roll = Get-Random -Minimum 1 -Maximum 100

  if ($roll -le 40) {
    # 40% - list products
    $sc, $_ = Invoke-GET "$BASE/products"
    if ($sc -eq 200) { $ok++;      Log "[OK ]" "[$i/$ROUNDS] GET /products -> 200" }
    else             { $errCount++; Log "[ERR]" "[$i/$ROUNDS] GET /products -> $sc" }

  } elseif ($roll -le 75) {
    # 35% - place an order
    $email     = $customers | Get-Random
    $productId = $productIds | Get-Random
    $qty       = Get-Random -Minimum 1 -Maximum 4
    $body      = @{ customer_email=$email; product_id=$productId; quantity=$qty }
    $sc, $o = Invoke-POST "$BASE/orders" $body
    if ($sc -eq 201) {
      $ok++; $orders++
      if ($o -ne $null -and $o.id) { $orderIds.Add($o.id) }
      $total = if ($o -ne $null) { $o.total_amount } else { "?" }
      Log "[NEW]" "[$i/$ROUNDS] POST /orders -> 201  total=$total  $email"
    } else {
      $errCount++
      Log "[ERR]" "[$i/$ROUNDS] POST /orders -> $sc"
    }

  } elseif ($roll -le 85) {
    # 10% - look up a past order
    if ($orderIds.Count -gt 0) {
      $oid = $orderIds | Get-Random
      $short = $oid.Substring(0,8)
      $sc, $_ = Invoke-GET "$BASE/orders/$oid"
      if ($sc -eq 200) { $ok++;      Log "[GET]" "[$i/$ROUNDS] GET /orders/$short... -> 200" }
      else             { $errCount++; Log "[ERR]" "[$i/$ROUNDS] GET /orders/$short... -> $sc" }
    } else {
      $sc, $_ = Invoke-GET "$BASE/orders/00000000-0000-0000-0000-000000000000"
      $errCount++
      Log "[404]" "[$i/$ROUNDS] GET /orders/fake -> $sc (expected 404)"
    }

  } elseif ($roll -le 95) {
    # 10% - trigger error
    $sc, $_ = Invoke-GET "$BASE/simulate/error"
    $errCount++
    Log "[ERR]" "[$i/$ROUNDS] GET /simulate/error -> $sc (intentional)"

  } else {
    # 5% - slow request
    $ms = Get-Random -Minimum 800 -Maximum 3000
    $sc, $_ = Invoke-GET "$BASE/simulate/slow?ms=$ms"
    if ($sc -eq 200) { $ok++;      Log "[SLW]" "[$i/$ROUNDS] GET /simulate/slow?ms=$ms -> 200" }
    else             { $errCount++; Log "[ERR]" "[$i/$ROUNDS] GET /simulate/slow -> $sc" }
  }

  if ($i % 10 -eq 0) {
    $sc, $h = Invoke-GET "$BASE/health"
    $st = if ($h -ne $null) { $h.status } else { "?" }
    $db = if ($h -ne $null) { $h.db }     else { "?" }
    Log "[HLT]" "Health -> status=$st  db=$db"
  }

  Start-Sleep -Milliseconds $DELAY_MS
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  DONE! Traffic summary:" -ForegroundColor Green
Write-Host "  Rounds  : $ROUNDS"  -ForegroundColor White
Write-Host "  Success : $ok"      -ForegroundColor Green
Write-Host "  Errors  : $errCount  (includes intentional ones)" -ForegroundColor Yellow
Write-Host "  Orders  : $orders placed" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Open SigNoz -> Services -> shoptrace-simple" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Green
