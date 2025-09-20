// utils/action-handler.ts
import { ActionHandlerDetail, ActionHandlerOptions } from 'custom-card-helpers';

export const actionHandler = (options: ActionHandlerOptions = {}) => {
  const hasHold = options.hasHold ?? true;
  const hasDoubleClick = options.hasDoubleClick ?? true;

  return {
    handlePointerDown(e: PointerEvent): void {
      const target = e.currentTarget as HTMLElement;
      const detail: Partial<ActionHandlerDetail> = {
        action: 'tap'
      };
      
      let timer: number | undefined;
      let clickCount = 0;
      
      const handleUp = (): void => {
        clearTimeout(timer);
        clickCount++;
        
        if (clickCount === 1) {
          timer = window.setTimeout(() => {
            if (clickCount === 1) {
              target.dispatchEvent(new CustomEvent('action', {
                detail: { ...detail, action: 'tap' },
                bubbles: true,
                composed: true
              }));
            } else if (clickCount === 2 && hasDoubleClick) {
              target.dispatchEvent(new CustomEvent('action', {
                detail: { ...detail, action: 'double_tap' },
                bubbles: true,
                composed: true
              }));
            }
            clickCount = 0;
          }, hasDoubleClick ? 250 : 0);
        }
        
        target.removeEventListener('pointerup', handleUp);
        target.removeEventListener('pointercancel', handleUp);
      };
      
      if (hasHold) {
        timer = window.setTimeout(() => {
          target.dispatchEvent(new CustomEvent('action', {
            detail: { ...detail, action: 'hold' },
            bubbles: true,
            composed: true
          }));
          clickCount = 0;
        }, 500);
      }
      
      target.addEventListener('pointerup', handleUp);
      target.addEventListener('pointercancel', handleUp);
    }
  };
};