
var hosts = Array.from(document.getElementsByTagName('iframe')).map(element => element.src); // eslint-disable-line no-var
hosts.push(document.location.hostname);
hosts; // return hosts to browser.tabs.executeScript
