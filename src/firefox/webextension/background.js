
browser.runtime.sendMessage({event: 'web-extension-path', url: browser.runtime.getURL('')});

const storagePort = browser.runtime.connect({name: 'storage-port'});

storagePort.onMessage.addListener(handleMessage);

function handleMessage(msg) {
  switch (msg.event) {
    case 'storage-get':
      browser.storage.local.get(msg.id)
      .then(result => storagePort.postMessage({event: 'storage-get-response', data: result[msg.id]}))
      .catch(error => storagePort.postMessage({event: 'storage-get-response', error}));
      break;
    case 'storage-set':
      browser.storage.local.set({[msg.id]: msg.value})
      .then(() => storagePort.postMessage({event: 'storage-set-response'}))
      .catch(error => storagePort.postMessage({event: 'storage-set-response', error}));
      break;
    case 'storage-remove':
      browser.storage.local.remove(msg.id)
      .then(() => storagePort.postMessage({event: 'storage-remove-response'}))
      .catch(error => storagePort.postMessage({event: 'storage-remove-response', error}));
      break;
    default:
      console.log('unknown event background.js:', msg.event);
  }
}
