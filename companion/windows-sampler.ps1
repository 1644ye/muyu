# Read-only, bounded Windows API sampling. No administrator rights or command API.
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MuyuPower {
 [StructLayout(LayoutKind.Sequential)] public struct Status {public byte ACLineStatus,BatteryFlag,BatteryLifePercent,SystemStatusFlag; public UInt32 BatteryLifeTime,BatteryFullLifeTime;}
 [DllImport("kernel32.dll")] public static extern bool GetSystemPowerStatus(out Status status);
}
'@
while($true){
 $muyuResult=@{time=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();network=@();battery=$null;disks=@()}
 try {$muyuResult.network=@([Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' -and $_.Name -notmatch 'WFP|QoS|Filter|Packet|Extension' } | Select-Object -First 20 | ForEach-Object { $muyuStats=$_.GetIPStatistics(); @{id=$_.Id;name=$_.Name;type=[string]$_.NetworkInterfaceType;received=$muyuStats.BytesReceived;sent=$muyuStats.BytesSent;speed=$_.Speed} })} catch {$muyuResult.networkError=$_.Exception.Message}
 try {$muyuPower=[MuyuPower+Status]::new(); if([MuyuPower]::GetSystemPowerStatus([ref]$muyuPower)) {$muyuHasBattery=($muyuPower.BatteryFlag -ne 255 -and ($muyuPower.BatteryFlag -band 128) -eq 0);$muyuResult.battery=@{available=$muyuHasBattery;percent=if($muyuHasBattery -and $muyuPower.BatteryLifePercent -ne 255){[int]$muyuPower.BatteryLifePercent}else{$null};charging=if($muyuHasBattery){($muyuPower.BatteryFlag -band 8) -ne 0}else{$null};acConnected=if($muyuPower.ACLineStatus -eq 255){$null}else{$muyuPower.ACLineStatus -eq 1};remainingSeconds=if($muyuHasBattery -and $muyuPower.BatteryLifeTime -ne 4294967295){$muyuPower.BatteryLifeTime}else{$null};reason=if($muyuPower.BatteryFlag -eq 255){'系统未提供电池状态'}elseif(!$muyuHasBattery){'此设备没有系统电池'}else{''}}}} catch {$muyuResult.battery=@{available=$false;reason='电池 API 不可用'}}
 try {$muyuResult.disks=@([IO.DriveInfo]::GetDrives() | Where-Object {$_.IsReady -and $_.DriveType -eq 'Fixed'} | Select-Object -First 16 | ForEach-Object {@{name=$_.Name;total=$_.TotalSize;free=$_.AvailableFreeSpace;used=$_.TotalSize-$_.AvailableFreeSpace;percent=[Math]::Round(100*(1-$_.AvailableFreeSpace/$_.TotalSize),1)}})}catch{}
 $muyuResult | ConvertTo-Json -Depth 6 -Compress
 Start-Sleep -Seconds 2
}
