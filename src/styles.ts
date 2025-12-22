import { css } from 'lit';

/**
 * Shared styles for room-card components.
 * Uses CSS Container Queries and clamp() for iOS accessibility zoom compatibility.
 */
export const styles = css`
  :host {
    display: block;
  }

  ha-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .card-content {
    padding: 1rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .warning {
    display: block;
    color: var(--error-color);
    background-color: var(--error-state-color);
    padding: 1rem;
    border-radius: 0.25rem;
  }
`;
