import { noChange } from 'lit';
import { AttributePart, directive, Directive, DirectiveParameters } from 'lit/directive.js';
import { ActionHandlerDetail, ActionHandlerOptions } from 'custom-card-helpers';

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

interface ActionHandlerElement extends HTMLElement {
  actionHandler?: {
    options: ActionHandlerOptions;
    start?: (ev: Event) => void;
    end?: (ev: Event) => void;
    handleKeyDown?: (ev: KeyboardEvent) => void;
  };
}

class ActionHandler extends HTMLElement {
  public holdTime = 500;
  public held = false;
  public ripple: HTMLElement | null = null;
  private timer?: number;
  private startX?: number;
  private startY?: number;

  connectedCallback(): void {
    Object.assign(this.style, {
      position: 'absolute',
      width: isTouch ? '100px' : '50px',
      height: isTouch ? '100px' : '50px',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: '999',
    });

    this.addEventListener('contextmenu', (ev: Event) => {
      const e = ev || window.event;
      if (e.preventDefault) {
        e.preventDefault();
      }
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.cancelBubble = true;
      e.returnValue = false;
      return false;
    });
  }

  public bind(element: ActionHandlerElement, options: ActionHandlerOptions): void {
    if (element.actionHandler) {
      return;
    }

    element.actionHandler = { options };

    element.addEventListener('contextmenu', (ev: Event) => {
      const e = ev || window.event;
      if (e.preventDefault) {
        e.preventDefault();
      }
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.cancelBubble = true;
      e.returnValue = false;
      return false;
    });

    const start = (ev: Event): void => {
      this.held = false;
      let x: number;
      let y: number;

      if ((ev as TouchEvent).touches) {
        x = (ev as TouchEvent).touches[0].clientX;
        y = (ev as TouchEvent).touches[0].clientY;
      } else {
        x = (ev as MouseEvent).clientX;
        y = (ev as MouseEvent).clientY;
      }

      this.startX = x;
      this.startY = y;

      if (options.hasHold) {
        this.timer = window.setTimeout(() => {
          this.held = true;
          fireEvent(element, 'action', { action: 'hold' });
        }, this.holdTime);
      }
    };

    const end = (ev: Event): void => {
      // Ignore if we're dragging
      if (this.startX !== undefined && this.startY !== undefined) {
        let x: number;
        let y: number;

        if ((ev as TouchEvent).changedTouches) {
          x = (ev as TouchEvent).changedTouches[0].clientX;
          y = (ev as TouchEvent).changedTouches[0].clientY;
        } else {
          x = (ev as MouseEvent).clientX;
          y = (ev as MouseEvent).clientY;
        }

        const distance = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);
        if (distance > 20) {
          // User is scrolling/dragging, don't trigger action
          if (this.timer) {
            window.clearTimeout(this.timer);
            this.timer = undefined;
          }
          return;
        }
      }

      if (this.timer) {
        window.clearTimeout(this.timer);
        this.timer = undefined;
      }

      if (this.held) {
        return;
      }

      fireEvent(element, 'action', { action: 'tap' });
    };

    const handleKeyDown = (ev: KeyboardEvent): void => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        fireEvent(element, 'action', { action: 'tap' });
      }
    };

    element.actionHandler.start = start;
    element.actionHandler.end = end;
    element.actionHandler.handleKeyDown = handleKeyDown;

    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', end);
    element.addEventListener('mousedown', start, { passive: true });
    element.addEventListener('click', end);
    element.addEventListener('keydown', handleKeyDown);

    // Double tap handling
    if (options.hasDoubleClick) {
      let lastTap = 0;
      element.addEventListener('click', (ev: Event) => {
        const now = Date.now();
        if (now - lastTap < 300) {
          ev.preventDefault();
          fireEvent(element, 'action', { action: 'double_tap' });
          lastTap = 0;
        } else {
          lastTap = now;
        }
      });
    }
  }
}

customElements.define('action-handler-room-card', ActionHandler);

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  if (body.querySelector('action-handler-room-card')) {
    return body.querySelector('action-handler-room-card') as ActionHandler;
  }

  const actionHandler = document.createElement('action-handler-room-card') as ActionHandler;
  body.appendChild(actionHandler);

  return actionHandler;
};

export const actionHandlerBind = (
  element: ActionHandlerElement,
  options: ActionHandlerOptions
): void => {
  const actionHandler = getActionHandler();
  if (!actionHandler) {
    return;
  }
  actionHandler.bind(element, options);
};

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as ActionHandlerElement, options);
      return noChange;
    }

    render(_options: ActionHandlerOptions) {
      return noChange;
    }
  }
);

const fireEvent = (
  node: HTMLElement,
  type: string,
  detail: ActionHandlerDetail,
  options?: {
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
  }
): void => {
  options = options || {};
  const event = new CustomEvent(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
    detail,
  });
  node.dispatchEvent(event);
};
