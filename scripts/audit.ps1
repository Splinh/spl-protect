$ErrorActionPreference = "SilentlyContinue"

# 1. Check DNS configuration
$dnsList = @()
$isSecureDNS = $false
try {
    $dnsAdapters = Get-DnsClientServerAddress | Where-Object { $_.AddressFamily -eq 2 }
    foreach ($adapter in $dnsAdapters) {
        if ($adapter.ServerAddresses) {
            foreach ($ip in $adapter.ServerAddresses) {
                if ($dnsList -notcontains $ip) {
                    $dnsList += $ip
                }
                # Check Cloudflare secure (1.1.1.2, 1.0.0.2) or Quad9 (9.9.9.9)
                if ($ip -eq "1.1.1.2" -or $ip -eq "1.0.0.2" -or $ip -eq "9.9.9.9") {
                    $isSecureDNS = $true
                }
            }
        }
    }
} catch {}
$dnsString = $dnsList -join ", "
if (-not $dnsString) { $dnsString = "None" }

# 2. Check Windows Defender
$defenderRealTime = "Unknown"
try {
    $defStatus = Get-MpComputerStatus
    if ($defStatus) {
        if ($defStatus.RealTimeProtectionEnabled -eq $true) {
            $defenderRealTime = "Enabled"
        } else {
            $defenderRealTime = "Disabled"
        }
    }
} catch {
    $defenderRealTime = "Error"
}

# 3. Check Windows Sandbox
$sandboxStatus = "NotSupported"
try {
    $sbFeature = Get-WindowsOptionalFeature -Online -FeatureName "Containers-DisposableClientVM"
    if ($sbFeature) {
        if ($sbFeature.State -eq "Enabled") {
            $sandboxStatus = "Enabled"
        } else {
            $sandboxStatus = "Disabled"
        }
    } else {
        $sandboxStatus = "NotSupported"
    }
} catch {
    $sandboxStatus = "Unknown"
}

# 4. Check Windows Script Host (WSH)
$wshEnabled = $true
try {
    $regPathHKLM = "HKLM:\Software\Microsoft\Windows Script Host\Settings"
    $regPathHKCU = "HKCU:\Software\Microsoft\Windows Script Host\Settings"
    
    $valHKLM = Get-ItemProperty -Path $regPathHKLM -Name "Enabled" -ErrorAction SilentlyContinue
    $valHKCU = Get-ItemProperty -Path $regPathHKCU -Name "Enabled" -ErrorAction SilentlyContinue
    
    if (($valHKLM -and $valHKLM.Enabled -eq 0) -or ($valHKCU -and $valHKCU.Enabled -eq 0)) {
        $wshEnabled = $false
    }
} catch {
    $wshEnabled = $true
}

# 5. Check PowerShell Execution Policy
$execPolicy = "Unknown"
try {
    $execPolicy = (Get-ExecutionPolicy).ToString()
} catch {}

# Create JSON output object
$outputObj = [PSCustomObject]@{
    dns = @{
        configured = $dnsString
        isSecure = $isSecureDNS
    }
    defender = @{
        realTime = $defenderRealTime
    }
    sandbox = @{
        status = $sandboxStatus
    }
    wsh = @{
        enabled = $wshEnabled
    }
    executionPolicy = @{
        policy = $execPolicy
    }
}

$outputObj | ConvertTo-Json -Compress
