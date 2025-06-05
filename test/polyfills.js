import {Port} from 'utils';

//
// Polyfills and globals required for tests
//

window.chrome ??= {};

window.chrome.runtime ??= {id: 'kajibbejlbohfaggdiogboambcijhkke'};

window.chrome.runtime.getURL = function(name) {
  return `${location.href.split('/test/')[0]}/${name}`;
};

window.chrome.runtime.getManifest = function() {
  return {oauth2: {client_id: '123'}};
};

const listeners = [];
const pendingPorts = [];

window.chrome.runtime.onConnect = {
  addListener(listener) {
    listeners.push(listener);
    while (pendingPorts.length) {
      listener(pendingPorts.shift());
    }
  }
};

window.chrome.runtime.connect = function({name}) {
  const senderPort = Port.connect({name}, receiverPort => {
    if (!listeners.length) {
      pendingPorts.push(receiverPort);
      return;
    }
    listeners.forEach(listener => listener(receiverPort));
  });
  return senderPort;
};

window.chrome.runtime.onMessage ??= {addListener() {}};

window.chrome.i18n = {
  getMessage(id) {
    return id;
  }
};

window.chrome.action ??= {};
window.chrome.action.setBadgeText = function() {};
window.chrome.action.setBadgeBackgroundColor = function() {};

window.chrome.storage ??= {};
window.chrome.storage.session ??= {
  async set() {},
  async get() { return {}; },
  async remove() {},
  async getBytesInUse() {}
};

chrome.alarms ??= {
  onAlarm: {
    addListener() {}
  }
};
