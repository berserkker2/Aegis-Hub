import { useState, useEffect, useRef } from 'react';

export interface GamepadNavCallbacks {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onConfirm?: () => void; // Button A / Enter
  onBack?: () => void; // Button B / Escape
  onActionX?: () => void; // Button X / Key D (Details)
  onActionY?: () => void; // Button Y / Key F (Favorite)
  onPrevTab?: () => void; // LB / Q / PageUp
  onNextTab?: () => void; // RB / E / PageDown
  onStart?: () => void; // Start / Menu / Key M
  onGuide?: () => void; // Xbox Guide / Home button
  onRightStickY?: (value: number) => void; // Right stick vertical axis (-1: up, +1: down)
  onInputActivity?: (source: 'keyboard' | 'gamepad') => void;
}

export type InputDeviceType = 'keyboard' | 'xbox' | 'playstation' | 'switch';

export function detectControllerType(id?: string | null): 'xbox' | 'playstation' | 'switch' {
  if (!id) return 'xbox';
  const lower = id.toLowerCase();
  if (
    lower.includes('sony') ||
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('playstation') ||
    lower.includes('054c') ||
    lower.includes('ps4') ||
    lower.includes('ps5')
  ) {
    return 'playstation';
  }
  if (
    lower.includes('nintendo') ||
    lower.includes('switch') ||
    lower.includes('joy-con') ||
    lower.includes('pro controller') ||
    lower.includes('057e')
  ) {
    return 'switch';
  }
  return 'xbox';
}

interface UseGamepadNavOptions {
  enabled?: boolean;
}

export function useGamepadNavigation(callbacks: GamepadNavCallbacks, options: UseGamepadNavOptions = { enabled: true }) {
  const [controllerName, setControllerName] = useState<string | null>(null);
  const [isGamepadActive, setIsGamepadActive] = useState<boolean>(false);
  const [inputDeviceType, setInputDeviceType] = useState<InputDeviceType>('keyboard');
  const callbacksRef = useRef<GamepadNavCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  const isGamepadActiveRef = useRef<boolean>(false);
  const inputDeviceTypeRef = useRef<InputDeviceType>('keyboard');
  const controllerNameRef = useRef<string | null>(null);

  const enabled = options.enabled !== false;

  // Track button state to prevent firing every frame (trigger once per press)
  const prevButtonsRef = useRef<Record<number, boolean>>({});
  const lastAxisMoveTimeRef = useRef<{ axis: string; time: number; repeatCount: number }>({
    axis: '',
    time: 0,
    repeatCount: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    let animFrame: number | null = null;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = Array.from(gamepads).find((p) => p && p.connected);

      if (!pad) {
        animFrame = null;
        return;
      }

      // Check if any button is pressed or stick tilted to switch input mode to controller
      const hasButtonPressed = pad.buttons.some((b) => b.pressed);
      const stickTilted =
        Math.abs(pad.axes[0] ?? 0) > 0.4 ||
        Math.abs(pad.axes[1] ?? 0) > 0.4 ||
        Math.abs(pad.axes[3] ?? 0) > 0.4;

      if (hasButtonPressed || stickTilted) {
        callbacksRef.current.onInputActivity?.('gamepad');
        if (!isGamepadActiveRef.current) {
          isGamepadActiveRef.current = true;
          setIsGamepadActive(true);
        }
        const type = detectControllerType(pad.id);
        if (inputDeviceTypeRef.current !== type) {
          inputDeviceTypeRef.current = type;
          setInputDeviceType(type);
        }
      }

      if (!controllerNameRef.current) {
        const name = pad.id || 'Controller';
        controllerNameRef.current = name;
        setControllerName(name);
      }

      const now = performance.now();
      const prev = prevButtonsRef.current;
      const cb = callbacksRef.current;

      // Button 0: A (Xbox) / Cross (PlayStation)
      if (pad.buttons[0]?.pressed && !prev[0]) {
        cb.onConfirm?.();
      }
      // Button 1: B (Xbox) / Circle (PlayStation)
      if (pad.buttons[1]?.pressed && !prev[1]) {
        cb.onBack?.();
      }
      // Button 2: X (Xbox) / Square (PlayStation)
      if (pad.buttons[2]?.pressed && !prev[2]) {
        cb.onActionX?.();
      }
      // Button 3: Y (Xbox) / Triangle (PlayStation)
      if (pad.buttons[3]?.pressed && !prev[3]) {
        cb.onActionY?.();
      }
      // Button 4: Left Bumper (LB / L1)
      if (pad.buttons[4]?.pressed && !prev[4]) {
        cb.onPrevTab?.();
      }
      // Button 5: Right Bumper (RB / R1)
      if (pad.buttons[5]?.pressed && !prev[5]) {
        cb.onNextTab?.();
      }
      // Button 8: Back / Select / View / Share
      if (pad.buttons[8]?.pressed && !prev[8]) {
        cb.onStart?.();
      }
      // Button 9: Start / Menu / Options
      if (pad.buttons[9]?.pressed && !prev[9]) {
        cb.onStart?.();
      }
      // Button 16: Xbox Guide / PS Home button
      if (pad.buttons[16]?.pressed && !prev[16]) {
        cb.onGuide?.();
      }

      // D-Pad buttons (standard mapping: 12 Up, 13 Down, 14 Left, 15 Right)
      const dpadUp = pad.buttons[12]?.pressed;
      const dpadDown = pad.buttons[13]?.pressed;
      const dpadLeft = pad.buttons[14]?.pressed;
      const dpadRight = pad.buttons[15]?.pressed;

      // Left Analog Stick (Axes 0 is X, Axes 1 is Y)
      const stickX = pad.axes[0] ?? 0;
      const stickY = pad.axes[1] ?? 0;
      const deadzone = 0.45;

      const isUp = dpadUp || stickY < -deadzone;
      const isDown = dpadDown || stickY > deadzone;
      const isLeft = dpadLeft || stickX < -deadzone;
      const isRight = dpadRight || stickX > deadzone;

      let currentDirection = '';
      if (isUp) currentDirection = 'up';
      else if (isDown) currentDirection = 'down';
      else if (isLeft) currentDirection = 'left';
      else if (isRight) currentDirection = 'right';

      if (currentDirection) {
        const lastMove = lastAxisMoveTimeRef.current;
        const isSameDir = lastMove.axis === currentDirection;
        const elapsed = now - lastMove.time;
        // Initial repeat delay (~420ms) on first click before continuous scrolling, then steady 110ms repeat
        const requiredDelay = isSameDir ? (lastMove.repeatCount === 1 ? 420 : 110) : 0;

        if (!isSameDir || elapsed > requiredDelay) {
          if (currentDirection === 'up') cb.onUp?.();
          if (currentDirection === 'down') cb.onDown?.();
          if (currentDirection === 'left') cb.onLeft?.();
          if (currentDirection === 'right') cb.onRight?.();

          lastAxisMoveTimeRef.current = {
            axis: currentDirection,
            time: now,
            repeatCount: isSameDir ? lastMove.repeatCount + 1 : 1,
          };
        }
      } else {
        lastAxisMoveTimeRef.current = { axis: '', time: 0, repeatCount: 0 };
      }

      // Right Analog Stick vertical axis (Axis 3 is Y in standard gamepad mapping)
      const rStickY = pad.axes[3] ?? 0;
      const rDeadzone = 0.18;
      if (Math.abs(rStickY) > rDeadzone) {
        callbacksRef.current.onInputActivity?.('gamepad');
        const sign = Math.sign(rStickY);
        const magnitude = (Math.abs(rStickY) - rDeadzone) / (1 - rDeadzone);
        cb.onRightStickY?.(sign * magnitude);
      }

      // Save button states for next frame
      for (let i = 0; i < pad.buttons.length; i++) {
        prev[i] = pad.buttons[i].pressed;
      }

      animFrame = requestAnimationFrame(pollGamepad);
    };

    const startPollingIfNeeded = () => {
      if (animFrame === null) {
        animFrame = requestAnimationFrame(pollGamepad);
      }
    };

    // Detect gamepad connection
    const handleConnected = (e: GamepadEvent) => {
      const type = detectControllerType(e.gamepad.id);
      const name = e.gamepad.id || 'Controller';
      controllerNameRef.current = name;
      isGamepadActiveRef.current = true;
      inputDeviceTypeRef.current = type;
      setControllerName(name);
      setIsGamepadActive(true);
      setInputDeviceType(type);
      startPollingIfNeeded();
    };

    const handleDisconnected = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const anyPad = Array.from(pads).find((p) => p && p.connected);
      if (anyPad) {
        const type = detectControllerType(anyPad.id);
        const name = anyPad.id || 'Controller';
        controllerNameRef.current = name;
        inputDeviceTypeRef.current = type;
        setControllerName(name);
        setInputDeviceType(type);
      } else {
        controllerNameRef.current = null;
        isGamepadActiveRef.current = false;
        inputDeviceTypeRef.current = 'keyboard';
        setControllerName(null);
        setIsGamepadActive(false);
        setInputDeviceType('keyboard');
      }
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    // Initial check
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activePad = Array.from(pads).find((p) => p && p.connected);
    if (activePad) {
      const type = detectControllerType(activePad.id);
      const name = activePad.id || 'Controller';
      controllerNameRef.current = name;
      isGamepadActiveRef.current = true;
      inputDeviceTypeRef.current = type;
      setControllerName(name);
      setIsGamepadActive(true);
      setInputDeviceType(type);
      startPollingIfNeeded();
    }

    return () => {
      if (animFrame !== null) cancelAnimationFrame(animFrame);
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [enabled]);

  // Keyboard & Mouse navigation fallback
  useEffect(() => {
    if (!enabled) return;

    let lastKeyRepeatTime = 0;

    const switchToKeyboardIfNeeded = () => {
      if (inputDeviceTypeRef.current !== 'keyboard') {
        inputDeviceTypeRef.current = 'keyboard';
        setInputDeviceType('keyboard');
      }
      if (isGamepadActiveRef.current) {
        isGamepadActiveRef.current = false;
        setIsGamepadActive(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      callbacksRef.current.onInputActivity?.('keyboard');
      switchToKeyboardIfNeeded();

      // Don't intercept if user is typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          callbacksRef.current.onBack?.();
        }
        return;
      }

      // Throttle OS repeat rate when holding a key down so it doesn't flood rendering
      if (e.repeat) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - lastKeyRepeatTime < 75) {
          e.preventDefault();
          return;
        }
        lastKeyRepeatTime = now;
      }

      const cb = callbacksRef.current;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          cb.onUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          cb.onDown?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          cb.onLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          cb.onRight?.();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          cb.onConfirm?.();
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          cb.onBack?.();
          break;
        case 'd':
        case 'D':
        case 's':
        case 'S':
          e.preventDefault();
          cb.onActionX?.();
          break;
        case 'f':
        case 'F':
        case 'y':
        case 'Y':
          e.preventDefault();
          cb.onActionY?.();
          break;
        case 'q':
        case 'Q':
        case 'PageUp':
          e.preventDefault();
          cb.onPrevTab?.();
          break;
        case 'e':
        case 'E':
        case 'PageDown':
          e.preventDefault();
          cb.onNextTab?.();
          break;
        case 'm':
        case 'M':
        case 'Home':
          e.preventDefault();
          cb.onStart?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', switchToKeyboardIfNeeded);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', switchToKeyboardIfNeeded);
    };
  }, [enabled]);

  return {
    isGamepadActive,
    inputDeviceType,
    controllerName: isGamepadActive && controllerName
      ? inputDeviceType === 'playstation'
        ? 'PlayStation'
        : inputDeviceType === 'switch'
        ? 'Nintendo Switch'
        : 'Xbox Controller'
      : 'Keyboard & Mouse',
  };
}
