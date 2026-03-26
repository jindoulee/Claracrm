// Haptic feedback utilities using Vibration API

export function hapticLight() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export function hapticMedium() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(25);
  }
}

export function hapticHeavy() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(50);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([10, 50, 20]);
  }
}

export function hapticError() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([50, 30, 50, 30, 50]);
  }
}
