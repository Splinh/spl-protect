param (
    [string]$Action = "all",
    [string]$ResultPath = ""
)

$ErrorActionPreference = "Stop"
$log = @()

function Log-Message([string]$msg, [string]$status="INFO") {
    $script:log += [PSCustomObject]@{
        time = (Get-Date -Format "HH:mm:ss")
        status = $status
        message = $msg
    }
}

try {
    # Check for Admin privileges
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Log-Message "Quyen Administrator bi tu choi. Vui long chay lai voi quyen Admin." "ERROR"
        Write-Output ($script:log | ConvertTo-Json -Compress)
        exit 1
    }

    if ($Action -eq "dns" -or $Action -eq "all") {
        Log-Message "Dang toi uu hoa DNS sang Cloudflare Secure DNS..." "INFO"
        try {
            $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
            if ($adapters) {
                foreach ($adapter in $adapters) {
                    Set-DnsClientServerAddress -InterfaceAlias $adapter.Name -ServerAddresses ("1.1.1.2", "1.0.0.2") -ErrorAction Stop
                    Log-Message "Da thiet lap DNS thanh cong cho adapter: $($adapter.Name)" "SUCCESS"
                }
            } else {
                Log-Message "Khong tim thay card mang dang hoat dong." "WARNING"
            }
        } catch {
            Log-Message "Loi khi thiet lap DNS: $($_.Exception.Message)" "ERROR"
        }
    }

    if ($Action -eq "wsh" -or $Action -eq "all") {
        Log-Message "Dang vo hieu hoa Windows Script Host (WSH)..." "INFO"
        try {
            $paths = @(
                "HKLM:\Software\Microsoft\Windows Script Host\Settings",
                "HKCU:\Software\Microsoft\Windows Script Host\Settings"
            )
            foreach ($path in $paths) {
                # Check if parent registry key exists (Software\Microsoft\Windows Script Host)
                $parent = Split-Path $path
                if (-not (Test-Path $parent)) {
                    New-Item -Path $parent -Force -ErrorAction SilentlyContinue | Out-Null
                }
                if (-not (Test-Path $path)) {
                    New-Item -Path $path -Force -ErrorAction Stop | Out-Null
                }
                Set-ItemProperty -Path $path -Name "Enabled" -Value 0 -Type DWord -Force -ErrorAction Stop | Out-Null
            }
            Log-Message "Da vo hieu hoa Windows Script Host thanh cong." "SUCCESS"
        } catch {
            Log-Message "Loi khi vo hieu hoa WSH: $($_.Exception.Message)" "ERROR"
        }
    }

    if ($Action -eq "sandbox" -or $Action -eq "all") {
        Log-Message "Dang kich hoat Windows Sandbox..." "INFO"
        try {
            $sbFeature = Get-WindowsOptionalFeature -Online -FeatureName "Containers-DisposableClientVM" -ErrorAction SilentlyContinue
            if (-not $sbFeature) {
                Log-Message "Windows Sandbox khong duoc ho tro tren phien ban Windows nay (yeu cau Win Pro/Ent)." "WARNING"
            } elseif ($sbFeature.State -eq "Enabled") {
                Log-Message "Windows Sandbox da duoc bat truoc do." "SUCCESS"
            } else {
                Enable-WindowsOptionalFeature -Online -FeatureName "Containers-DisposableClientVM" -NoRestart -ErrorAction Stop | Out-Null
                Log-Message "Da kich hoat Windows Sandbox thanh cong. Vui long khoi dong lai may tinh." "SUCCESS"
            }
        } catch {
            Log-Message "Loi khi kich hoat Windows Sandbox: $($_.Exception.Message)" "ERROR"
        }
    }

    if ($Action -eq "policy" -or $Action -eq "all") {
        Log-Message "Dang toi uu hoa PowerShell Execution Policy..." "INFO"
        try {
            Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force -ErrorAction Stop
            Log-Message "Da thiet lap Execution Policy thanh cong sang RemoteSigned." "SUCCESS"
        } catch {
            Log-Message "Loi khi thiet lap Execution Policy: $($_.Exception.Message)" "ERROR"
        }
    }

} catch {
    Log-Message "Loi he thong: $($_.Exception.Message)" "ERROR"
}

if ($ResultPath) {
    $script:log | ConvertTo-Json -Compress | Out-File -FilePath $ResultPath -Encoding utf8
} else {
    $script:log | ConvertTo-Json -Compress
}
