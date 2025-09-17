export class HapticFeedback {
  static light(): void {
    if (this._canVibrate()) {
      navigator.vibrate(50);
    }
  }

  static medium(): void {
    if (this._canVibrate()) {
      navigator.vibrate(100);
    }
  }

  static heavy(): void {
    if (this._canVibrate()) {
      navigator.vibrate(200);
    }
  }

  private static _canVibrate(): boolean {
    return 'vibrate' in navigator;
  }
}