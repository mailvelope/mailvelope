
$(document).ready(function() {
  var crx = typeof chrome !== 'undefined';
  $(".dropdown-menu").on("click", "li", function(event) {
    // id of dropdown entry = action
    var message = {
      event: 'browser-action',
      action: this.id
    };
    if (crx) {
      chrome.runtime.sendMessage(message);
      $(document.body).fadeOut(function() {
        window.close();
      });
    } else {
      addon.postMessage(message);
    }
  });
});
