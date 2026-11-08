import { useState, useEffect, useRef } from 'react';
import {
  ControllerFamily,
  detectControllerFamily,
  getNormalizedGamepadState,
} from '../utils/gamepadUtils';

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
  onSelect?: () => void; // Select / Back / View / Share
  onStart?: () => void; // Start / Menu / Key M
  onToggleBigPicture?: () => void; // Start + Select combo
  onGuide?: () => void; // Xbox Guide / Home button
  onRightStickY?: (value: number) => void; // Right stick vertical axis (-1: up, +1: down)
  onInputActivity?: (source: 'keyboard' | 'gamepad') => void;
}

export type InputDeviceType = 'keyboard' | 'xbox' | 'playstation' | 'switch';

export function detectControllerType(id?: string | null): 'xbox' | 'playstation' | 'switch' {
  const family = detectControllerFamily(id);
  if (family === 'generic') return 'xbox';
  return family;
}

interface UseGamepadNavOptions {
  enabled?: boolean;
}

interface NormalizedButtonState {
  confirm: boolean;
  back: boolean;
  actionX: boolean;
  actionY: boolean;
  prevTab: boolean;
  nextTab: boolean;
  select: boolean;
  start: boolean;
  guide: boolean;
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

  // Track native window focus state
  const isWindowFocusedRef = useRef<boolean>(true);

  useEffect(() => {
    if (window.api?.isMainWindowFocused) {
      window.api.isMainWindowFocused().then((f) => {
        isWindowFocusedRef.current = f;
      });
    }

    let unsubFocus: (() => void) | undefined;
    if (window.api?.onMainWindowFocus) {
      unsubFocus = window.api.onMainWindowFocus((focused) => {
        isWindowFocusedRef.current = focused;
      });
    }

    const handleFocus = () => {
      isWindowFocusedRef.current = true;
    };
    const handleBlur = () => {
      isWindowFocusedRef.current = false;
      prevButtonsRef.current = {
        confirm: false,
        back: false,
        actionX: false,
        actionY: false,
        prevTab: false,
        nextTab: false,
        select: false,
        start: false,
        guide: false,
      };
      comboHasBeenReleasedRef.current = false;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (unsubFocus) unsubFocus();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Track button state to prevent firing every frame (trigger once per press)
  const prevButtonsRef = useRef<NormalizedButtonState>({
    confirm: false,
    back: false,
    actionX: false,
    actionY: false,
    prevTab: false,
    nextTab: false,
    select: false,
    start: false,
    guide: false,
  });

  const lastAxisMoveTimeRef = useRef<{ axis: string; time: number; repeatCount: number }>({
    axis: '',
    time: 0,
    repeatCount: 0,
  });

  // Must release Start and Select completely before allowing exit toggle
  const mountedTimeRef = useRef<number>(Date.now());
  const comboHasBeenReleasedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    let animFrame: number | null = null;

    const pollGamepad = () => {
      // Ignore all gamepad inputs if window is not focused or is hidden
      const isFocused = isWindowFocusedRef.current && (typeof document === 'undefined' || !document.hidden);
      if (!isFocused) {
        prevButtonsRef.current = {
          confirm: false,
          back: false,
          actionX: false,
          actionY: false,
          prevTab: false,
          nextTab: false,
          select: false,
          start: false,
          guide: false,
        };
        animFrame = requestAnimationFrame(pollGamepad);
        return;
      }

      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = Array.from(gamepads).find((p) => p && p.connected);

      if (!pad) {
        animFrame = null;
        return;
      }

      const state = getNormalizedGamepadState(pad);

      if (state.hasAnyInput) {
        callbacksRef.current.onInputActivity?.('gamepad');
        if (!isGamepadActiveRef.current) {
          isGamepadActiveRef.current = true;
          setIsGamepadActive(true);
        }
        const detectedType: InputDeviceType = state.family === 'generic' ? 'xbox' : state.family;
        if (inputDeviceTypeRef.current !== detectedType) {
          inputDeviceTypeRef.current = detectedType;
          setInputDeviceType(detectedType);
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

      // 1. Confirm (A on Xbox / Cross on PS / A on Switch)
      if (state.confirm && !prev.confirm) {
        cb.onConfirm?.();
      }
      // 2. Back (B on Xbox / Circle on PS / B on Switch)
      if (state.back && !prev.back) {
        cb.onBack?.();
      }
      // 3. Action X (X on Xbox / Square on PS / Y on Switch)
      if (state.actionX && !prev.actionX) {
        cb.onActionX?.();
      }
      // 4. Action Y (Y on Xbox / Triangle on PS / X on Switch)
      if (state.actionY && !prev.actionY) {
        cb.onActionY?.();
      }
      // 5. Left Bumper (LB / L1 / L)
      if (state.prevTab && !prev.prevTab) {
        cb.onPrevTab?.();
      }
      // 6. Right Bumper (RB / R1 / R)
      if (state.nextTab && !prev.nextTab) {
        cb.onNextTab?.();
      }

      // 7. Start + Select combo: toggle Big Picture exit with release guard & startup immunity
      if (!state.start && !state.select) {
        comboHasBeenReleasedRef.current = true;
      }

      if (state.isStartSelectCombo) {
        const canTriggerExit = comboHasBeenReleasedRef.current && (Date.now() - mountedTimeRef.current > 1500);
        if (canTriggerExit && (!prev.start || !prev.select)) {
          comboHasBeenReleasedRef.current = false;
          cb.onToggleBigPicture?.();
        }
      } else {
        // Button Select / Back / Minus (only when Start is not also down)
        if (state.select && !prev.select && !state.start) {
          cb.onSelect?.();
        }
        // Button Start / Menu / Plus (only when Select is not also down)
        if (state.start && !prev.start && !state.select) {
          cb.onStart?.();
        }
      }

      // 8. Guide / Home button (Xbox Guide / PS Home / Switch Home)
      if (state.guide && !prev.guide) {
        cb.onGuide?.();
      }

      // 9. D-Pad & Left Analog Stick
      const deadzone = 0.45;
      const isUp = state.dpadUp || state.leftStickY < -deadzone;
      const isDown = state.dpadDown || state.leftStickY > deadzone;
      const isLeft = state.dpadLeft || state.leftStickX < -deadzone;
      const isRight = state.dpadRight || state.leftStickX > deadzone;

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

      // 10. Right Analog Stick vertical axis (Smooth modal and description scrolling)
      const rDeadzone = 0.18;
      if (Math.abs(state.rightStickY) > rDeadzone) {
        callbacksRef.current.onInputActivity?.('gamepad');
        const sign = Math.sign(state.rightStickY);
        const magnitude = (Math.abs(state.rightStickY) - rDeadzone) / (1 - rDeadzone);
        cb.onRightStickY?.(sign * magnitude);
      }

      // Save button states for next frame
      prevButtonsRef.current = {
        confirm: state.confirm,
        back: state.back,
        actionX: state.actionX,
        actionY: state.actionY,
        prevTab: state.prevTab,
        nextTab: state.nextTab,
        select: state.select,
        start: state.start,
        guide: state.guide,
      };

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
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      switchToKeyboardIfNeeded();

      const cb = callbacksRef.current;
      const target = e.target as HTMLElement | null;

      // Do not intercept arrow navigation if typing in an input or textarea
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const now = performance.now();

      // Handle Arrow Keys with smooth key repeating
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        if (now - lastKeyRepeatTime < 130) return;
        lastKeyRepeatTime = now;

        if (e.key === 'ArrowUp') cb.onUp?.();
        if (e.key === 'ArrowDown') cb.onDown?.();
        if (e.key === 'ArrowLeft') cb.onLeft?.();
        if (e.key === 'ArrowRight') cb.onRight?.();
        return;
      }

      switch (e.key) {
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
        case 'x':
        case 'X':
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
