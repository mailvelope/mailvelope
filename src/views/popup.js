
$(document).ready(function() {
  $(".dropdown-menu").on("click", "li", function(event){
    // id of dropdown entry = action
    chrome.extension.sendMessage({ 
      event: 'browser-action', 
      action: this.id
    });
    $(document.body).fadeOut(function() {
      window.close();
    });
    return false;
  }); 
});