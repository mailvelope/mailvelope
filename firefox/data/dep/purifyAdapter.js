
'use strict';

var DOMPurify = DOMPurify || null;

// Add a hook to make all links open a new window
// attribution: https://github.com/cure53/DOMPurify/blob/master/demos/hooks-target-blank-demo.html
DOMPurify.addHook('afterSantitizeAttributes', function(node) {
  // set all elements owning target to target=_blank
  if ('target' in node) {
    node.setAttribute('target', '_blank');
  }
  // set MathML links to xlink:show=new
  if (node.tagName === 'math' && node.hasAttribute('href')) {
    node.setAttribute('xlink:show', 'new');
  }
});

self.port.on('parse', function(message) {
  self.port.emit(message.response, DOMPurify.sanitize(message.data, {SAFE_FOR_JQUERY: true}));
});
