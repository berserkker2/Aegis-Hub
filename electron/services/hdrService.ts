import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

export interface HdrStatus {
  supported: boolean;
  enabled: boolean;
  changed?: boolean;
}

const CSHARP_SOURCE = `using System;
using System.Runtime.InteropServices;
using System.Threading;

public class Program
{
    [StructLayout(LayoutKind.Sequential)]
    public struct LUID
    {
        public uint LowPart;
        public int HighPart;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_PATH_SOURCE_INFO
    {
        public LUID adapterId;
        public uint id;
        public uint modeInfoIdx;
        public uint statusFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_PATH_TARGET_INFO
    {
        public LUID adapterId;
        public uint id;
        public uint modeInfoIdx;
        public uint outputTechnology;
        public uint rotation;
        public uint scaling;
        public uint refreshRateNumerator;
        public uint refreshRateDenominator;
        public uint scanLineOrdering;
        public bool targetAvailable;
        public uint statusFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_PATH_INFO
    {
        public DISPLAYCONFIG_PATH_SOURCE_INFO sourceInfo;
        public DISPLAYCONFIG_PATH_TARGET_INFO targetInfo;
        public uint flags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_MODE_INFO
    {
        public uint infoType;
        public uint id;
        public LUID adapterId;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 48)]
        public byte[] modeInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_DEVICE_INFO_HEADER
    {
        public int type;
        public uint size;
        public LUID adapterId;
        public uint id;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint value;
        public int colorEncoding;
        public int bitsPerColorChannel;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint value;
    }

    [DllImport("user32.dll")]
    public static extern int GetDisplayConfigBufferSizes(uint flags, out uint numPathArrayElements, out uint numModeInfoArrayElements);

    [DllImport("user32.dll")]
    public static extern int QueryDisplayConfig(uint flags, ref uint numPathArrayElements, [Out] DISPLAYCONFIG_PATH_INFO[] pathArray, ref uint numModeInfoArrayElements, [Out] DISPLAYCONFIG_MODE_INFO[] modeInfoArray, IntPtr currentTopologyId);

    [DllImport("user32.dll")]
    public static extern int DisplayConfigGetDeviceInfo(ref DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO requestPacket);

    [DllImport("user32.dll")]
    public static extern int DisplayConfigSetDeviceInfo(ref DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE setPacket);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    private const byte VK_LWIN = 0x5B;
    private const byte VK_LMENU = 0xA4;
    private const byte VK_B = 0x42;
    private const uint KEYEVENTF_KEYUP = 0x0002;

    private static void QueryState(out bool anySupported, out bool anyEnabled)
    {
        anySupported = false;
        anyEnabled = false;
        uint pathCount, modeCount;
        if (GetDisplayConfigBufferSizes(2, out pathCount, out modeCount) != 0) return;
        var paths = new DISPLAYCONFIG_PATH_INFO[pathCount];
        var modes = new DISPLAYCONFIG_MODE_INFO[modeCount];
        if (QueryDisplayConfig(2, ref pathCount, paths, ref modeCount, modes, IntPtr.Zero) != 0) return;

        foreach (var p in paths)
        {
            var info = new DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO();
            info.header.type = 9;
            info.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO));
            info.header.adapterId = p.targetInfo.adapterId;
            info.header.id = p.targetInfo.id;
            if (DisplayConfigGetDeviceInfo(ref info) == 0)
            {
                bool supported = (info.value & 0x1) != 0;
                bool enabled = (info.value & 0x2) != 0;
                if (supported) anySupported = true;
                if (enabled) anyEnabled = true;
            }
        }
    }

    private static void TryNativeSet(bool enable)
    {
        uint pathCount, modeCount;
        if (GetDisplayConfigBufferSizes(2, out pathCount, out modeCount) != 0) return;
        var paths = new DISPLAYCONFIG_PATH_INFO[pathCount];
        var modes = new DISPLAYCONFIG_MODE_INFO[modeCount];
        if (QueryDisplayConfig(2, ref pathCount, paths, ref modeCount, modes, IntPtr.Zero) != 0) return;

        foreach (var p in paths)
        {
            var info = new DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO();
            info.header.type = 9;
            info.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO));
            info.header.adapterId = p.targetInfo.adapterId;
            info.header.id = p.targetInfo.id;
            if (DisplayConfigGetDeviceInfo(ref info) == 0 && (info.value & 0x1) != 0)
            {
                var setPkt = new DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE();
                setPkt.header.type = 10;
                setPkt.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE));
                setPkt.header.adapterId = p.targetInfo.adapterId;
                setPkt.header.id = p.targetInfo.id;
                setPkt.value = enable ? 1u : 0u;
                DisplayConfigSetDeviceInfo(ref setPkt);
            }
        }
    }

    private static void SendWinAltB()
    {
        keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
        keybd_event(VK_LMENU, 0, 0, UIntPtr.Zero);
        keybd_event(VK_B, 0, 0, UIntPtr.Zero);
        Thread.Sleep(40);
        keybd_event(VK_B, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LMENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void Main(string[] args)
    {
        string cmd = args.Length > 0 ? args[0].ToLowerInvariant() : "status";
        bool supported, enabled;
        QueryState(out supported, out enabled);

        if (cmd == "status" || !supported)
        {
            Console.WriteLine("{\\"supported\\":" + (supported ? "true" : "false") + ",\\"enabled\\":" + (enabled ? "true" : "false") + ",\\"changed\\":false}");
            return;
        }

        bool target = (cmd == "on" || cmd == "true" || cmd == "1");
        if (cmd == "toggle") target = !enabled;

        if (enabled == target)
        {
            Console.WriteLine("{\\"supported\\":true,\\"enabled\\":" + (enabled ? "true" : "false") + ",\\"changed\\":false}");
            return;
        }

        TryNativeSet(target);
        Thread.Sleep(250);
        QueryState(out supported, out enabled);

        if (enabled != target)
        {
            SendWinAltB();
            for (int i = 0; i < 8; i++)
            {
                Thread.Sleep(250);
                QueryState(out supported, out enabled);
                if (enabled == target) break;
            }
        }

        Console.WriteLine("{\\"supported\\":" + (supported ? "true" : "false") + ",\\"enabled\\":" + (enabled ? "true" : "false") + ",\\"changed\\":true}");
    }
}
`;

export class HdrService {
  private helperExePath: string;
  private helperCsPath: string;
  private ensurePromise: Promise<boolean> | null = null;

  constructor() {
    let dataDir: string;
    try {
      dataDir = app.getPath('userData');
    } catch {
      dataDir = path.join(process.cwd(), '.launcher-data');
    }
    this.helperExePath = path.join(dataDir, 'aegis-hdr-helper.exe');
    this.helperCsPath = path.join(dataDir, 'aegis-hdr-helper.cs');
  }

  private async ensureHelperCompiled(): Promise<boolean> {
    if (process.platform !== 'win32') return false;
    if (fs.existsSync(this.helperExePath)) return true;
    if (this.ensurePromise) return this.ensurePromise;

    this.ensurePromise = new Promise<boolean>((resolve) => {
      try {
        const dir = path.dirname(this.helperExePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.helperCsPath, CSHARP_SOURCE, 'utf-8');

        const cscCandidates = [
          'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
          'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
        ];
        const cscPath = cscCandidates.find((p) => fs.existsSync(p));
        if (!cscPath) {
          resolve(false);
          return;
        }

        execFile(
          cscPath,
          ['/nologo', '/optimize+', '/target:exe', `/out:${this.helperExePath}`, this.helperCsPath],
          { windowsHide: true, timeout: 15000 },
          (err) => {
            try {
              if (fs.existsSync(this.helperCsPath)) fs.unlinkSync(this.helperCsPath);
            } catch {}
            resolve(!err && fs.existsSync(this.helperExePath));
          }
        );
      } catch {
        resolve(false);
      }
    }).finally(() => {
      this.ensurePromise = null;
    });

    return this.ensurePromise;
  }

  private async runHelper(arg: 'status' | 'on' | 'off' | 'toggle'): Promise<HdrStatus> {
    const ready = await this.ensureHelperCompiled();
    if (!ready) {
      return { supported: false, enabled: false, changed: false };
    }

    return new Promise<HdrStatus>((resolve) => {
      execFile(
        this.helperExePath,
        [arg],
        { windowsHide: true, timeout: 8000 },
        (err, stdout) => {
          if (err || !stdout) {
            resolve({ supported: false, enabled: false, changed: false });
            return;
          }
          try {
            const parsed = JSON.parse(stdout.trim());
            resolve({
              supported: Boolean(parsed.supported),
              enabled: Boolean(parsed.enabled),
              changed: Boolean(parsed.changed),
            });
          } catch {
            resolve({ supported: false, enabled: false, changed: false });
          }
        }
      );
    });
  }

  public async getStatus(): Promise<HdrStatus> {
    return this.runHelper('status');
  }

  public async setHdr(enable: boolean): Promise<HdrStatus> {
    return this.runHelper(enable ? 'on' : 'off');
  }

  public async toggleHdr(): Promise<HdrStatus> {
    return this.runHelper('toggle');
  }
}

export const hdrService = new HdrService();
