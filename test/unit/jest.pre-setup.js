// Pre-setup file - runs BEFORE test imports
// Sets up globals that must be available when modules are imported

// Crypto API - needed by modules that use crypto.subtle at import time
global.crypto = {
  getRandomValues: array => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    encrypt: () => Promise.resolve(new ArrayBuffer(0)),
    decrypt: () => Promise.resolve(new ArrayBuffer(0)),
    generateKey: () => Promise.resolve({}),
    importKey: () => Promise.resolve({}),
    exportKey: () => Promise.resolve({}),
    sign: () => Promise.resolve(new ArrayBuffer(0)),
    verify: () => Promise.resolve(true),
    digest: () => Promise.resolve(new ArrayBuffer(0))
  }
};
