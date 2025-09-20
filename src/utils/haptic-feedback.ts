// utils/haptic-feedback.ts
export class HapticFeedback {
  static vibrate(duration: number): void {
    const nav = navigator as any;
    if (nav && nav.vibrate) {
      try {
        nav.vibrate(duration);
      } catch (e) {
        // Vibration API not supported or failed
      }
    }
  }

  static canVibrate(): boolean {
    const nav = navigator as any;
    return 'vibrate' in nav;
  }
}