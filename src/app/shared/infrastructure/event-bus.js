// PATH: src/app/shared/infrastructure/event-bus.js

/** @type {Map<string, Set<function(unknown): void>>} */
const _handlers = new Map()

/**
 * Registers a handler for the given event type.
 * Handlers remain active for the lifetime of the application.
 * @param {string} eventType
 * @param {function(unknown): void} handler
 */
export function on(eventType, handler) {
  if (!_handlers.has(eventType)) _handlers.set(eventType, new Set())
  _handlers.get(eventType).add(handler)
}

/**
 * Emits a domain event synchronously to all registered handlers.
 * @param {import('../domain/events/domain-event.js').DomainEvent<unknown>} event
 */
export function emit(event) {
  _handlers.get(event.type)?.forEach(h => h(event.payload))
}
