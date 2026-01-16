// Chrome API setup for integration tests - non-module version
// This file sets up Chrome API mocks before any modules are loaded

(() => {
  const listeners = [];
  const pendingPorts = [];

  // Port class implementation
  class Port {
    constructor(name = '') {
      this.name = name;
      this.sender = null;
      this._otherPort = null;
      this._isConnected = true;

      // Event handlers storage
      this._onMessageHandlers = [];
      this._onDisconnectHandlers = [];

      // Event capturing functionality
      this._captureEnabled = false;
      this._capturedEvents = [];

      // Create event objects with addListener/removeListener methods
      this.onMessage = {
        addListener: callback => {
          if (typeof callback === 'function') {
            this._onMessageHandlers.push(callback);
          }
        },
        removeListener: callback => {
          const index = this._onMessageHandlers.indexOf(callback);
          if (index > -1) {
            this._onMessageHandlers.splice(index, 1);
          }
        }
      };

      this.onDisconnect = {
        addListener: callback => {
          if (typeof callback === 'function') {
            this._onDisconnectHandlers.push(callback);
          }
        },
        removeListener: callback => {
          const index = this._onDisconnectHandlers.indexOf(callback);
          if (index > -1) {
            this._onDisconnectHandlers.splice(index, 1);
          }
        }
      };
    }

    /**
     * Send a message to the other end of the port
     * @param {any} message - The message to send (should be JSON-ifiable)
     */
    postMessage(message) {
      if (!this._isConnected) {
        throw new Error('Attempting to use a disconnected port object');
      }

      if (this._otherPort?._isConnected) {
        // Clone the message to simulate serialization
        const clonedMessage = JSON.parse(JSON.stringify(message));

        // Asynchronously deliver the message to simulate real behavior
        setTimeout(async () => {
          if (this._otherPort?._isConnected) {
            await this._otherPort._triggerMessageEvent(clonedMessage, this);
          }
        }, 0);
      }
    }

    /**
     * Disconnect the port
     */
    disconnect() {
      if (!this._isConnected) {
        return; // Already disconnected, no-op
      }

      this._isConnected = false;

      // Notify the other end of disconnection
      if (this._otherPort?._isConnected) {
        const otherPort = this._otherPort;
        this._otherPort = null;

        // Asynchronously trigger disconnect on the other end
        setTimeout(() => {
          otherPort._handleDisconnect();
        }, 0);
      }

      this._otherPort = null;
    }

    /**
     * Internal method to handle incoming messages
     * @private
     */
    async _triggerMessageEvent(message, senderPort) {
      if (!this._isConnected) {
        return;
      }

      // Call all registered message handlers and wait for them to complete
      for (const handler of this._onMessageHandlers) {
        try {
          await handler(message, senderPort);
        } catch (error) {
          console.error('Error in onMessage handler:', error);
        }
      }

      // Capture event AFTER all handlers have finished processing
      if (this._captureEnabled) {
        this._capturedEvents.push({...message});
      }
    }

    /**
     * Internal method to handle disconnection from the other end
     * @private
     */
    _handleDisconnect() {
      if (!this._isConnected) {
        return;
      }

      this._isConnected = false;
      this._otherPort = null;

      // Call all registered disconnect handlers
      for (const handler of this._onDisconnectHandlers) {
        try {
          handler(this);
        } catch (error) {
          console.error('Error in onDisconnect handler:', error);
        }
      }
    }

    /**
     * Internal method to establish connection between two ports
     * @private
     */
    _connectTo(otherPort) {
      this._otherPort = otherPort;
      otherPort._otherPort = this;
    }

    /**
     * Enable event capturing for this port
     * @returns {Port} Returns this port for chaining
     */
    enableEventCapture() {
      this._captureEnabled = true;
      return this;
    }

    /**
     * Disable event capturing for this port
     * @returns {Port} Returns this port for chaining
     */
    disableEventCapture() {
      this._captureEnabled = false;
      return this;
    }

    /**
     * Get array of captured events
     * @returns {Array} Array of captured event objects
     */
    getCapturedEvents() {
      return [...this._capturedEvents];
    }

    /**
     * Clear captured events
     * @returns {Port} Returns this port for chaining
     */
    clearCapturedEvents() {
      this._capturedEvents = [];
      return this;
    }

    /**
     * Wait for a specific event to be captured
     * @param {string} eventType - The event type to wait for
     * @param {number} timeout - Timeout in milliseconds (default: 5000)
     * @returns {Promise} Promise that resolves with the event when found
     */
    waitForEvent(eventType, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);

        const checkEvent = () => {
          const event = this._capturedEvents.find(e => e.event === eventType);
          if (event) {
            clearTimeout(timeoutId);
            resolve(event);
          } else {
            setTimeout(checkEvent, 10);
          }
        };
        checkEvent();
      });
    }

    /**
     * Static method to create a connection
     * @param {Object} options - Connection options
     * @param {string} options.name - Optional name for the connection
     * @param {Function} onConnectCallback - Callback that receives the second Port instance
     * @returns {Port} The initiating Port instance
     */
    static connect(options = {}, onConnectCallback) {
      // Handle overloaded parameters
      if (typeof options === 'function') {
        onConnectCallback = options;
        options = {};
      }

      const name = options.name || '';

      // Create two connected ports
      const port1 = new Port(name);
      const port2 = new Port(name);

      // Set sender information (in real implementation, this would contain extension info)
      port2.sender = {
        id: 'mock-extension-id',
        url: 'mock://extension',
        // In real implementation, these would be populated based on context
        frameId: 0,
        tab: null
      };

      // Establish the connection between ports
      port1._connectTo(port2);

      // Trigger the onConnect callback asynchronously with the second port
      if (typeof onConnectCallback === 'function') {
        setTimeout(() => {
          onConnectCallback(port2);
        }, 0);
      }

      return port1;
    }
  }

  window.chrome ??= {};

  window.chrome.runtime ??= {
    id: 'kajibbejlbohfaggdiogboambcijhkke',
    getURL(name) {
      return `${location.href.split('/test/')[0]}/${name}`;
    },
    getManifest() {
      return {
        oauth2: {client_id: '123'},
        browser_specific_settings: {gecko: {id: 'test@mailvelope.com'}}
      };
    },
    onConnect: {
      addListener(listener) {
        listeners.push(listener);
        while (pendingPorts.length) {
          listener(pendingPorts.shift());
        }
      }
    },
    connect({name}) {
      const senderPort = Port.connect({name}, receiverPort => {
        if (!listeners.length) {
          pendingPorts.push(receiverPort);
          return;
        }
        for (const listener of listeners) {
          listener(receiverPort);
        }
      });
      return senderPort;
    },
    onMessage: {
      addListener() {}
    }
  };

  window.chrome.i18n = {
    getMessage(id) {
      return id;
    },
    getUILanguage() {
      return 'en';
    }
  };

  window.chrome.action ??= {
    setBadgeText() {},
    setBadgeBackgroundColor() {}
  };

  // Storage implementation using Map for in-memory storage
  const localStorageData = new Map();
  const sessionStorageData = new Map();

  function createStorageArea(storageMap) {
    return {
      async set(items) {
        if (typeof items !== 'object' || items === null) {
          throw new Error('Items must be an object');
        }
        for (const [key, value] of Object.entries(items)) {
          storageMap.set(key, value);
        }
      },

      async get(keys) {
        const result = {};

        if (!keys) {
          // Return all items
          for (const [key, value] of storageMap.entries()) {
            result[key] = value;
          }
        } else if (typeof keys === 'string') {
          // Single key
          if (storageMap.has(keys)) {
            result[keys] = storageMap.get(keys);
          }
        } else if (Array.isArray(keys)) {
          // Array of keys
          for (const key of keys) {
            if (storageMap.has(key)) {
              result[key] = storageMap.get(key);
            }
          }
        } else if (typeof keys === 'object') {
          // Object with default values
          for (const [key, defaultValue] of Object.entries(keys)) {
            result[key] = storageMap.has(key) ? storageMap.get(key) : defaultValue;
          }
        }

        return result;
      },

      async remove(keys) {
        if (typeof keys === 'string') {
          storageMap.delete(keys);
        } else if (Array.isArray(keys)) {
          for (const key of keys) {
            storageMap.delete(key);
          }
        }
      },

      async getBytesInUse(keys) {
        let totalBytes = 0;
        const keysToCheck = !keys ?
          Array.from(storageMap.keys()) :
          Array.isArray(keys) ? keys : [keys];

        for (const key of keysToCheck) {
          if (storageMap.has(key)) {
            // Rough byte calculation - stringify and count UTF-16 code units
            const serialized = JSON.stringify({[key]: storageMap.get(key)});
            totalBytes += serialized.length * 2; // UTF-16 uses 2 bytes per character
          }
        }

        return totalBytes;
      },

      async clear() {
        storageMap.clear();
      }
    };
  }

  window.chrome.storage ??= {
    session: createStorageArea(sessionStorageData),
    local: createStorageArea(localStorageData)
  };

  window.chrome.alarms ??= {
    onAlarm: {
      addListener() {}
    }
  };

  // Define browser object to trigger the offscreen.js path that creates window.offscreen
  window.browser = window.browser || {};

  // Expose reset function for test cleanup
  window.chrome._resetMockState = () => {
    // Clear all listeners
    listeners.length = 0;
    // Clear all pending ports
    pendingPorts.length = 0;
    // Clear storage data
    localStorageData.clear();
    sessionStorageData.clear();
  };

  console.log('Chrome API mocks initialized');
})();
