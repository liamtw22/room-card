import { ActionHandlerDetail, ActionHandlerOptions } from 'custom-card-helpers';
import { HapticFeedback } from './haptic-feedback';

export interface ActionHandlerEvent extends CustomEvent {
  detail: ActionHandlerDetail;
}

interface ActionHandlerElement extends HTMLElement {
  holdTime?: number;
  bind?: (element: ActionHandlerElement, options?: ActionHandlerOptions) => void;
}

class ActionHandler {
  private holdTime: number;
  private holdTimeout?: number;
  private ripple?: HTMLElement;
  private timer?: number;
  private held = false;
  private cooldownStart = false;
  private cooldownEnd = false;
  private element?: ActionHandlerElement;
  private startX = 0;
  private startY = 0;

  constructor(element: ActionHandlerElement, options: ActionHandlerOptions = {}) {
    this.element = element;
    this.holdTime = options.holdTime ?? 500;

    element.addEventListener('contextmenu', (e: Event) => {
      const ev = e || window.event;
      if (ev.preventDefault) {
        ev.preventDefault();
      }
      if (ev.stopPropagation) {
        ev.stopPropagation();
      }
      ev.cancelBubble = true;
      ev.returnValue = false;
      return false;
    });

    const clickStart = (ev: TouchEvent | MouseEvent): void => {
      if (this.cooldownStart) {
        return;
      }

      this.held = false;
      let x: number;
      let y: number;

      if ('touches' in ev) {
        x = ev.touches[0].clientX;
        y = ev.touches[0].clientY;
      } else {
        x = ev.clientX;
        y = ev.clientY;
      }

      this.startX = x;
      this.startY = y;

      this.cooldownStart = true;
      window.setTimeout(() => (this.cooldownStart = false), 100);

      if (options.hasHold) {
        this.holdTimeout = window.setTimeout(() => {
          this.held = true;
          HapticFeedback.medium();
          this.fireEvent('action', { action: 'hold' });
        }, this.holdTime);
      }

      const ripplePromise = this.createRipple(x, y);
      if (options.hasDoubleClick) {
        const clickEndTimeout = (ev: TouchEvent | MouseEvent): void => {
          if ('touches' in ev) {
            x = ev.touches[0].clientX;
            y = ev.touches[0].clientY;
          } else {
            x = ev.clientX;
            y = ev.clientY;
          }

          if (Math.abs(x - this.startX) > 50 || Math.abs(y - this.startY) > 50) {
            return;
          }

          if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
            HapticFeedback.light();
            this.fireEvent('action', { action: 'double_tap' });
          } else {
            this.timer = window.setTimeout(() => {
              this.timer = undefined;
              if (options.hasHold && this.held) {
                return;
              }
              HapticFeedback.light();
              this.fireEvent('action', { action: 'tap' });
            }, 250);
          }
        };
        element.addEventListener('click', clickEndTimeout);
      } else {
        element.addEventListener('click', () => {
          if (this.cooldownEnd || (options.hasHold && this.held)) {
            return;
          }
          if (Math.abs(x - this.startX) > 50 || Math.abs(y - this.startY) > 50) {
            return;
          }
          HapticFeedback.light();
          this.fireEvent('action', { action: 'tap' });
        });
      }

      ripplePromise.then((ripple) => {
        this.ripple = ripple;
      });
    };

    const clickEnd = (): void => {
      this.cooldownEnd = true;
      window.setTimeout(() => (this.cooldownEnd = false), 100);
      if (this.holdTimeout) {
        clearTimeout(this.holdTimeout);
        this.holdTimeout = undefined;
      }
      if (this.ripple) {
        this.destroyRipple(this.ripple);
        this.ripple = undefined;
      }
    };

    const clickCancel = (): void => {
      this.cooldownEnd = true;
      window.setTimeout(() => (this.cooldownEnd = false), 100);
      if (this.holdTimeout) {
        clearTimeout(this.holdTimeout);
        this.holdTimeout = undefined;
      }
      if (this.ripple) {
        this.destroyRipple(this.ripple);
        this.ripple = undefined;
      }
    };

    element.addEventListener('touchstart', clickStart, { passive: true });
    element.addEventListener('touchend', clickEnd);
    element.addEventListener('touchcancel', clickCancel);

    element.addEventListener('mousedown', clickStart, { passive: true });
    element.addEventListener('mouseup', clickEnd);
    element.addEventListener('mouseleave', clickCancel);
  }

  private fireEvent(type: string, detail: ActionHandlerDetail): void {
    if (!this.element) return;
    
    const event = new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true,
    });
    this.element.dispatchEvent(event);
  }

  private async createRipple(x: number, y: number): Promise<HTMLElement> {
    if (!this.element) {
      return document.createElement('div');
    }

    const rect = this.element.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'action-handler-ripple';
    
    // Calculate ripple size
    const size = Math.max(rect.width, rect.height) * 2;
    
    // Position ripple at click point
    const left = x - rect.left - size / 2;
    const top = y - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${left}px;
      top: ${top}px;
      border-radius: 50%;
      background-color: currentColor;
      opacity: 0;
      pointer-events: none;
      transform: scale(0);
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
                  opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Ensure parent has position relative
    const computedStyle = window.getComputedStyle(this.element);
    if (computedStyle.position === 'static') {
      this.element.style.position = 'relative';
    }
    
    this.element.appendChild(ripple);
    
    // Trigger animation
    await new Promise((resolve) => requestAnimationFrame(resolve));
    ripple.style.transform = 'scale(1)';
    ripple.style.opacity = '0.2';
    
    return ripple;
  }

  private destroyRipple(ripple: HTMLElement): void {
    ripple.style.opacity = '0';
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 500);
  }
}

export const actionHandlerDirective = {
  bind(element: ActionHandlerElement, options: ActionHandlerOptions = {}): void {
    new ActionHandler(element, options);
  },
};

export const actionHandler = (
  options: ActionHandlerOptions = {}
): any => {
  return {
    update(part: any): void {
      const element = part.element as ActionHandlerElement;
      
      if (!element.bind) {
        element.bind = (el: ActionHandlerElement, opts?: ActionHandlerOptions) => {
          new ActionHandler(el, opts || options);
        };
        element.bind(element, options);
      }
    },
  };
};

/**
 * Helper function to determine if an element has action configuration
 */
export function hasAction(config?: any): boolean {
  return config?.tap_action || config?.hold_action || config?.double_tap_action;
}

/**
 * Helper function to get action configuration
 */
export function getActionConfig(
  config: any,
  action: 'tap' | 'hold' | 'double_tap'
): any {
  const actionConfig = config?.[`${action}_action`];
  
  if (!actionConfig) {
    return undefined;
  }
  
  // Handle 'none' action
  if (actionConfig.action === 'none') {
    return undefined;
  }
  
  return actionConfig;
}

/**
 * Helper to handle common action patterns
 */
export function handleActionConfig(
  element: HTMLElement,
  hass: any,
  config: any,
  action: 'tap' | 'hold' | 'double_tap'
): void {
  const actionConfig = getActionConfig(config, action);
  
  if (!actionConfig) {
    return;
  }
  
  switch (actionConfig.action) {
    case 'toggle':
      if (config.entity) {
        const domain = config.entity.split('.')[0];
        const service = hass.states[config.entity]?.state === 'on' ? 'turn_off' : 'turn_on';
        hass.callService(domain, service, { entity_id: config.entity });
      }
      break;
      
    case 'call-service':
      if (actionConfig.service) {
        const [domain, service] = actionConfig.service.split('.');
        hass.callService(
          domain,
          service,
          actionConfig.service_data || {},
          actionConfig.target || {}
        );
      }
      break;
      
    case 'navigate':
      if (actionConfig.navigation_path) {
        history.pushState(null, '', actionConfig.navigation_path);
        const event = new Event('location-changed', {
          bubbles: true,
          composed: true,
        });
        window.dispatchEvent(event);
      }
      break;
      
    case 'url':
      if (actionConfig.url_path) {
        window.open(actionConfig.url_path, actionConfig.new_tab !== false ? '_blank' : '_self');
      }
      break;
      
    case 'more-info':
      if (config.entity || actionConfig.entity) {
        const entityId = actionConfig.entity || config.entity;
        const event = new CustomEvent('hass-more-info', {
          detail: { entityId },
          bubbles: true,
          composed: true,
        });
        element.dispatchEvent(event);
      }
      break;
  }
}