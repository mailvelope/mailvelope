
export let map = {};

export function register(ids) {
  for (const id of ids) {
    map[id] = true;
  }
}

export function mapToLocal() {
  map = getMessages(Object.keys(map));
}

export const get = chrome.i18n.getMessage;

function getMessages(ids) {
  const result = {};
  for (const id of ids) {
    result[id] = chrome.i18n.getMessage(id);
  }
  return result;
}

export function set(ids) {
  register(ids);
  mapToLocal();
}

function getLanguage() {
  return chrome.i18n.getUILanguage();
}

export function localizeDateTime(date, options = {}) {
  return date.toLocaleDateString(getLanguage(), options);
}
