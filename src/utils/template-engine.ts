import { HomeAssistant } from 'custom-card-helpers';

export interface TemplateContext {
  hass: HomeAssistant;
  states: HomeAssistant['states'];
  user?: HomeAssistant['user'];
  config?: any;
  entity?: string;
  variables?: Record<string, any>;
}

export interface ProcessedTemplate {
  result: any;
  hasTemplate: boolean;
  error?: string;
}

/**
 * Template processor for Home Assistant JSTemplate expressions
 * Supports JavaScript template literals with access to hass context
 */
export class TemplateEngine {
  private static readonly TEMPLATE_REGEX = /\[\[\[(.+?)\]\]\]/g;
  private static readonly JS_TEMPLATE_REGEX = /\${(.+?)}/g;
  private static cache = new Map<string, Function>();

  /**
   * Process a template string or object
   */
  static process(
    template: any, 
    context: TemplateContext
  ): ProcessedTemplate {
    if (typeof template === 'string') {
      return this.processString(template, context);
    } else if (typeof template === 'object' && template !== null) {
      return this.processObject(template, context);
    }
    
    return { 
      result: template, 
      hasTemplate: false 
    };
  }

  /**
   * Process a string template
   */
  private static processString(
    template: string, 
    context: TemplateContext
  ): ProcessedTemplate {
    let hasTemplate = false;
    let result = template;
    let error: string | undefined;

    // Check for triple bracket templates [[[...]]]
    if (this.TEMPLATE_REGEX.test(template)) {
      hasTemplate = true;
      result = template.replace(this.TEMPLATE_REGEX, (match, expression) => {
        try {
          return this.evaluateExpression(expression, context);
        } catch (e) {
          error = `Template error: ${e instanceof Error ? e.message : String(e)}`;
          console.error(`Template evaluation error for "${expression}":`, e);
          return match; // Return original on error
        }
      });
    }

    // Check for JavaScript template literals ${...}
    if (this.JS_TEMPLATE_REGEX.test(template)) {
      hasTemplate = true;
      try {
        const func = this.compileTemplate(template);
        result = func(context);
      } catch (e) {
        error = `Template error: ${e instanceof Error ? e.message : String(e)}`;
        console.error(`Template compilation error for "${template}":`, e);
      }
    }

    return { result, hasTemplate, error };
  }

  /**
   * Process an object recursively
   */
  private static processObject(
    obj: any, 
    context: TemplateContext
  ): ProcessedTemplate {
    let hasTemplate = false;
    const result: any = Array.isArray(obj) ? [] : {};
    let error: string | undefined;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const processed = this.process(obj[key], context);
        result[key] = processed.result;
        hasTemplate = hasTemplate || processed.hasTemplate;
        if (processed.error && !error) {
          error = processed.error;
        }
      }
    }

    return { result, hasTemplate, error };
  }

  /**
   * Evaluate a JavaScript expression in the context
   */
  private static evaluateExpression(
    expression: string, 
    context: TemplateContext
  ): any {
    // Create a safe evaluation context
    const evalContext = this.createEvalContext(context);
    
    // Build the function body with context variables
    const funcBody = `
      const { hass, states, user, config, entity, variables } = context;
      const vars = variables || {};
      
      // Helper functions available in templates
      const helpers = {
        formatNumber: (num, decimals = 0) => Number(num).toFixed(decimals),
        formatDateTime: (date) => new Date(date).toLocaleString(),
        formatTime: (date) => new Date(date).toLocaleTimeString(),
        formatDate: (date) => new Date(date).toLocaleDateString(),
        round: (num, decimals = 0) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
        parseInt: (str) => parseInt(str, 10),
        parseFloat: (str) => parseFloat(str),
        min: (...args) => Math.min(...args),
        max: (...args) => Math.max(...args),
        abs: (num) => Math.abs(num),
        getState: (entityId) => states[entityId]?.state,
        getAttribute: (entityId, attr) => states[entityId]?.attributes?.[attr],
        isState: (entityId, value) => states[entityId]?.state === value,
        hasState: (entityId) => entityId in states,
        iif: (condition, trueValue, falseValue) => condition ? trueValue : falseValue,
        relativeTime: (timestamp) => this.getRelativeTime(new Date(timestamp))
      };
      
      with (helpers) {
        try {
          return ${expression};
        } catch (e) {
          console.error('Expression evaluation error:', e);
          return undefined;
        }
      }
    `;

    try {
      const func = new Function('context', funcBody);
      return func(evalContext);
    } catch (e) {
      console.error(`Failed to evaluate expression "${expression}":`, e);
      throw e;
    }
  }

  /**
   * Compile a template string with ${} placeholders
   */
  private static compileTemplate(template: string): Function {
    const cacheKey = template;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const funcBody = `
      const { hass, states, user, config, entity, variables } = context;
      const vars = variables || {};
      
      try {
        return \`${template}\`;
      } catch (e) {
        console.error('Template compilation error:', e);
        return '${template}';
      }
    `;

    const func = new Function('context', funcBody);
    this.cache.set(cacheKey, func);
    
    return func;
  }

  /**
   * Create a safe evaluation context
   */
  private static createEvalContext(context: TemplateContext): TemplateContext {
    return {
      hass: context.hass,
      states: context.states,
      user: context.user,
      config: context.config,
      entity: context.entity,
      variables: context.variables || {}
    };
  }

  /**
   * Get relative time string
   */
  private static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Clear the template cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Process configuration with templates
   */
  static processConfig(
    config: any,
    hass: HomeAssistant,
    additionalContext?: Partial<TemplateContext>
  ): any {
    const context: TemplateContext = {
      hass,
      states: hass.states,
      user: hass.user,
      config,
      ...additionalContext
    };

    const processed = this.process(config, context);
    
    if (processed.error) {
      console.warn('Configuration template processing warning:', processed.error);
    }
    
    return processed.result;
  }

  /**
   * Check if a value contains templates
   */
  static hasTemplate(value: any): boolean {
    if (typeof value === 'string') {
      return this.TEMPLATE_REGEX.test(value) || this.JS_TEMPLATE_REGEX.test(value);
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (value.hasOwnProperty(key) && this.hasTemplate(value[key])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Validate a template expression
   */
  static validateTemplate(
    template: string,
    context?: Partial<TemplateContext>
  ): { valid: boolean; error?: string } {
    try {
      const mockContext: TemplateContext = {
        hass: {} as HomeAssistant,
        states: {},
        ...context
      };
      
      this.process(template, mockContext);
      return { valid: true };
    } catch (e) {
      return { 
        valid: false, 
        error: e instanceof Error ? e.message : String(e) 
      };
    }
  }
}

/**
 * Template directive for use in Lit templates
 */
export const template = (
  strings: TemplateStringsArray,
  ...values: any[]
): ((context: TemplateContext) => string) => {
  return (context: TemplateContext) => {
    let result = '';
    strings.forEach((str, i) => {
      result += str;
      if (i < values.length) {
        const value = values[i];
        if (typeof value === 'function') {
          result += value(context);
        } else {
          result += value;
        }
      }
    });
    
    const processed = TemplateEngine.process(result, context);
    return processed.result;
  };
};

/**
 * Hook for using templates in Lit components
 */
export function useTemplate(
  template: any,
  hass: HomeAssistant,
  additionalContext?: Partial<TemplateContext>
): any {
  const context: TemplateContext = {
    hass,
    states: hass.states,
    user: hass.user,
    ...additionalContext
  };
  
  const processed = TemplateEngine.process(template, context);
  return processed.result;
}