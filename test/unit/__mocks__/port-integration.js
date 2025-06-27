/**
 * Implementation of Chrome Extension Runtime Port
 * This class simulates the behavior of chrome.runtime.Port for integration testing
 */

export class Port {
  constructor(name = '') {
    this.name = name;
    this.sender = null;
    this._otherPort = null;
    this._isConnected = true;

    // Event handlers storage
    this._onMessageHandlers = [];
    this._onDisconnectHandlers = [];

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

    if (this._otherPort && this._otherPort._isConnected) {
      // Clone the message to simulate serialization
      const clonedMessage = JSON.parse(JSON.stringify(message));

      // Asynchronously deliver the message to simulate real behavior
      setTimeout(() => {
        if (this._otherPort && this._otherPort._isConnected) {
          this._otherPort._triggerMessageEvent(clonedMessage, this);
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
    if (this._otherPort && this._otherPort._isConnected) {
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
  _triggerMessageEvent(message, senderPort) {
    if (!this._isConnected) {
      return;
    }

    // Call all registered message handlers
    this._onMessageHandlers.forEach(handler => {
      try {
        handler(message, senderPort);
      } catch (error) {
        console.error('Error in onMessage handler:', error);
      }
    });
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
    this._onDisconnectHandlers.forEach(handler => {
      try {
        handler(this);
      } catch (error) {
        console.error('Error in onDisconnect handler:', error);
      }
    });
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
