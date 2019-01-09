import {tokenize} from 'linkifyjs';

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}

export default function autolink(str, {defaultProtocoll = 'https', nl2br = true, target = '_blank', escapeFn = text => text}) {
  const tokens = tokenize(str);
  const result = [];

  for (const token of tokens) {
    if (token.type === 'nl' && nl2br) {
      result.push('<br>\n');
      continue;
    } else if (!token.isLink) {
      result.push(escapeFn(token.toString()));
      continue;
    }

    let link = `<a href="${escapeAttr(token.toHref(defaultProtocoll))}"`;

    if (target) {
      link += ` target="${escapeAttr(target)}"`;
    }

    link += `>${escapeFn(token.toString())}</a>`;
    result.push(link);
  }

  return result.join('');
}
