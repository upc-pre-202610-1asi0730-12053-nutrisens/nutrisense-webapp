// PATH: src/app/shared/domain/events/domain-event.js

/**
 * @template T
 * @typedef {{ type: string, payload: T, occurredAt: string }} DomainEvent
 */

/**
 * Creates an immutable domain event with a UTC timestamp.
 * @template T
 * @param {string} type
 * @param {T} payload
 * @returns {DomainEvent<T>}
 */
export function createDomainEvent(type, payload) {
  return Object.freeze({ type, payload, occurredAt: new Date().toISOString() })
}
