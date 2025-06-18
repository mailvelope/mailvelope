// Port communication matchers for Jest tests
expect.extend({
  toHavePortEvent(received, eventName) {
    const pass = received &&
      received._events &&
      Array.isArray(received._events[eventName]) &&
      received._events[eventName].length > 0;
    return {
      message: () => `expected port to have recorded ${eventName} event`,
      pass
    };
  }
});
