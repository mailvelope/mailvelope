
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

export function localizeHTML(l10n, idSelector) {
  const selector = idSelector ? `${idSelector} [data-l10n-id]` : '[data-l10n-id]';
  $(selector).each(function() {
    const jqElement = $(this);
    const id = jqElement.data('l10n-id');
    const text = l10n ? l10n[id] : chrome.i18n.getMessage(id) || id;
    jqElement.text(text);
  });
  $('[data-l10n-title-id]').each(function() {
    const jqElement = $(this);
    const id = jqElement.data('l10n-title-id');
    const text = l10n ? l10n[id] : chrome.i18n.getMessage(id) || id;
    jqElement.attr('title', text);
  });
}
