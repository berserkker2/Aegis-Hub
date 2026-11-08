export type ControllerFamily = 'xbox' | 'playstation' | 'switch' | 'generic';

/**
 * Accurately detects controller hardware family based on Vendor ID, Product ID,
 * and device identification string reported by the Chromium Gamepad API.
 */
export function detectControllerFamily(padOrId: Gamepad | string | null | undefined): ControllerFamily {
  if (!padOrId) return 'xbox';
  const id = (typeof padOrId === 'string' ? padOrId : padOrId.id || '').toLowerCase();

  // Nintendo Switch (Switch Pro Controller, Joy-Cons, Charging Grip, etc.)
  // Vendor ID 057e = Nintendo
  // Product ID 2009 = Switch Pro Controller
  // Product ID 2006/2007 = Joy-Cons
  if (
    id.includes('057e') ||
    id.includes('switch') ||
    id.includes('joy-con') ||
    id.includes('pro controller') ||
    id.includes('nintendo')
  ) {
    return 'switch';
  }

  // Sony PlayStation (DualShock 4, DualSense, DualSense Edge, DualShock 3)
  // Vendor ID 054c = Sony
  if (
    id.includes('054c') ||
    id.includes('sony') ||
    id.includes('dualshock') ||
    id.includes('dualsense') ||
    id.includes('playstation') ||
    id.includes('ps4') ||
    id.includes('ps5')
  ) {
    return 'playstation';
  }

  // Microsoft Xbox (Xbox 360, Xbox One, Xbox Series X/S, Elite, etc.)
  // Vendor ID 045e = Microsoft
  if (
    id.includes('045e') ||
    id.includes('xbox') ||
    id.includes('xinput') ||
    id.includes('microsoft')
  ) {
    return 'xbox';
  }

  // Fallback check for DualShock / DualSense over Windows Bluetooth without vendor ID string
  if (id.includes('wireless controller') && typeof padOrId !== 'string' && padOrId.buttons && padOrId.buttons.length >= 17) {
    return 'playstation';
  }

  return 'generic';
}

/**
 * Universal D-pad reader that accurately decodes standard button indices (12, 13, 14, 15)
 * and Point-of-View (POV) Hat Switch in axes[9] for Switch Pro / DirectInput controllers on Windows.
 * NEVER inspects axes 4 through 8 to avoid false positives from IMU gyroscope and accelerometer.
 */
export function readGamepadDPad(pad: Gamepad): { up: boolean; down: boolean; left: boolean; right: boolean } {
  // 1. Standard buttons 12, 13, 14, 15 (Xbox, PlayStation, or standard-mapped controllers)
  const b12 = Boolean(pad.buttons[12]?.pressed);
  const b13 = Boolean(pad.buttons[13]?.pressed);
  const b14 = Boolean(pad.buttons[14]?.pressed);
  const b15 = Boolean(pad.buttons[15]?.pressed);

  // If standard buttons report a direction, use them directly
  if (b12 || b13 || b14 || b15) {
    return { up: b12, down: b13, left: b14, right: b15 };
  }

  // 2. Hat Switch in axes[9] (standard position for DirectInput on Windows, e.g. Switch Pro Controller):
  // NOTE: We STRICTLY only check axes[9] when axes.length >= 10.
  // Axes 4..8 are gyroscope and accelerometer sensors (idle values around 0.0-0.1) and must be IGNORED!
  if (pad.axes.length >= 10) {
    const val = pad.axes[9];
    // When released, the hat switch reports a value > 1.05 (typically 1.2857 or 3.2857)
    if (typeof val === 'number' && val >= -1.05 && val <= 1.05) {
      let up = false;
      let down = false;
      let left = false;
      let right = false;

      // 8 discrete Hat positions with step 2/7 ≈ 0.2857:
      // Up: -1.0, Up-Right: -0.714, Up-Left: 1.0
      if ((val >= -1.05 && val <= -0.88) || (val >= 0.88 && val <= 1.05) || (val >= -0.80 && val <= -0.62)) {
        up = true;
      }
      // Down: +0.143, Down-Right: -0.143, Down-Left: +0.429
      if ((val >= 0.06 && val <= 0.22) || (val >= -0.22 && val <= -0.06) || (val >= 0.35 && val <= 0.50)) {
        down = true;
      }
      // Right: -0.429, Up-Right: -0.714, Down-Right: -0.143
      if ((val >= -0.50 && val <= -0.35) || (val >= -0.80 && val <= -0.62) || (val >= -0.22 && val <= -0.06)) {
        right = true;
      }
      // Left: +0.714, Down-Left: +0.429, Up-Left: 1.0
      if ((val >= 0.62 && val <= 0.80) || (val >= 0.35 && val <= 0.50) || (val >= 0.88 && val <= 1.05)) {
        left = true;
      }

      if (up || down || left || right) {
        return { up, down, left, right };
      }
    }
  }

  return { up: false, down: false, left: false, right: false };
}

export interface NormalizedGamepadState {
  family: ControllerFamily;
  confirm: boolean;     // Bottom position: A (Xbox) / Cross (PS) / Bottom button (Switch)
  back: boolean;        // Right position: B (Xbox) / Circle (PS) / Right button (Switch)
  actionX: boolean;     // Left position: X (Xbox) / Square (PS) / Left button (Switch)
  actionY: boolean;     // Top position: Y (Xbox) / Triangle (PS) / Top button (Switch)
  prevTab: boolean;     // LB / L1 / L
  nextTab: boolean;     // RB / R1 / R
  select: boolean;      // Back / View / Share / Minus (-)
  start: boolean;       // Start / Menu / Options / Plus (+)
  guide: boolean;       // Xbox Guide / PS Button / Home
  leftTrigger: boolean; // LT / L2 / ZL
  rightTrigger: boolean;// RT / R2 / ZR
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  leftStickX: number;
  leftStickY: number;
  rightStickY: number;
  isStartSelectCombo: boolean;
  hasAnyInput: boolean;
}

/**
 * Normalizes input readings across Xbox, PlayStation, and Nintendo Switch controllers.
 * Uses positional button mapping (bottom = Confirm, right = Back) for complete consistency
 * with PC gaming standards, decodes Hat Switch D-pad, and isolates triggers from Start/Menu.
 */
export function getNormalizedGamepadState(pad: Gamepad): NormalizedGamepadState {
  const family = detectControllerFamily(pad);
  const isStandard = pad.mapping === 'standard';

  const btn = (idx: number): boolean => {
    const b = pad.buttons[idx];
    return Boolean(b && (b.pressed || (b.value !== undefined && b.value > 0.4)));
  };

  const dpad = readGamepadDPad(pad);

  let confirm = false;
  let back = false;
  let actionX = false;
  let actionY = false;
  let prevTab = false;
  let nextTab = false;
  let select = false;
  let start = false;
  let guide = false;
  let leftTrigger = false;
  let rightTrigger = false;

  if (family === 'switch') {
    // ==========================================
    // Nintendo Switch Pro Controller / Joy-Cons
    // ==========================================
    // Plus (+) = Button 9
    // Minus (-) = Button 8
    start = btn(9);
    select = btn(8);

    // Bumpers & Triggers
    prevTab = btn(4);       // L
    nextTab = btn(5);       // R
    leftTrigger = btn(6);   // ZL
    rightTrigger = btn(7);  // ZR (strictly trigger, never Start!)

    // Home button: Button 16 on standard mapping, Button 12 on DirectInput
    guide = btn(16) || (!isStandard && btn(12));

    // Positional face buttons (consistent with PC / Xbox / PlayStation layout):
    // Button 0 (bottom button): Confirm (where A is on Xbox)
    // Button 1 (right button): Back (where B is on Xbox)
    // Button 2 (left button): Action X (Details)
    // Button 3 (top button): Action Y (Favorite)
    confirm = btn(0);
    back = btn(1);
    actionX = btn(2);
    actionY = btn(3);

  } else if (family === 'playstation') {
    // ==========================================
    // Sony PlayStation (DualShock / DualSense)
    // ==========================================
    confirm = btn(0);       // Cross (bottom)
    back = btn(1);          // Circle (right)
    actionX = btn(2);       // Square (left)
    actionY = btn(3);       // Triangle (top)
    prevTab = btn(4);       // L1
    nextTab = btn(5);       // R1
    leftTrigger = btn(6);   // L2
    rightTrigger = btn(7);  // R2
    select = btn(8) || btn(17); // Share / Create or Touchpad Click
    start = btn(9);         // Options
    guide = btn(16);        // PS Button

  } else {
    // ==========================================
    // Microsoft Xbox & Generic Controllers
    // ==========================================
    confirm = btn(0);       // A (bottom)
    back = btn(1);          // B (right)
    actionX = btn(2);       // X (left)
    actionY = btn(3);       // Y (top)
    prevTab = btn(4);       // LB
    nextTab = btn(5);       // RB
    leftTrigger = btn(6);   // LT
    rightTrigger = btn(7);  // RT
    select = btn(8);        // View / Back
    start = btn(9);         // Menu / Start
    guide = btn(16);        // Xbox Guide

    // Fallbacks for non-standard generic controllers (only if not recognized)
    if (!isStandard) {
      if (!start && btn(11)) start = true;
      if (!select && btn(10)) select = true;
      if (!guide && btn(12)) guide = true;
    }
  }

  const leftStickX = pad.axes[0] ?? 0;
  const leftStickY = pad.axes[1] ?? 0;
  const rightStickY = pad.axes[3] ?? 0;

  // Strict Start + Select combo: requires BOTH Start AND Select active
  const isStartSelectCombo = start && select;

  const hasAnyInput =
    confirm ||
    back ||
    actionX ||
    actionY ||
    prevTab ||
    nextTab ||
    select ||
    start ||
    guide ||
    leftTrigger ||
    rightTrigger ||
    dpad.up ||
    dpad.down ||
    dpad.left ||
    dpad.right ||
    Math.abs(leftStickX) > 0.4 ||
    Math.abs(leftStickY) > 0.4 ||
    Math.abs(rightStickY) > 0.4;

  return {
    family,
    confirm,
    back,
    actionX,
    actionY,
    prevTab,
    nextTab,
    select,
    start,
    guide,
    leftTrigger,
    rightTrigger,
    dpadUp: dpad.up,
    dpadDown: dpad.down,
    dpadLeft: dpad.left,
    dpadRight: dpad.right,
    leftStickX,
    leftStickY,
    rightStickY,
    isStartSelectCombo,
    hasAnyInput,
  };
}

/**
 * Checks whether the Start + Select combo is pressed on any given gamepad,
 * honoring the exact controller family mapping and ignoring triggers (LT/RT).
 */
export function checkIsStartSelectCombo(gp: Gamepad): boolean {
  if (!gp || !gp.connected) return false;
  return getNormalizedGamepadState(gp).isStartSelectCombo;
}
