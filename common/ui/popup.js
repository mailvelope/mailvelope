$(document).ready(function() {
  var crx = typeof chrome !== 'undefined';
  $(".dropdown-menu").on("click", "li", function(event){
    // id of dropdown entry = action
    var message = { 
      event: 'browser-action', 
      action: this.id
    };
    if (crx) {
      chrome.extension.sendMessage(message);
      $(document.body).fadeOut(function() {
        window.close();
      });
    } else {
      addon.postMessage(message);
    }
  }); 
});

//I added this so the message is not lost when writing
$(document).ready(function() {
    textarea = document.getElementsByTagName("textarea").item(0);
    
    if (localStorage["plaintextarea"]!="undefined") {
        textarea.value= localStorage["plaintextarea"];
    }

    setInterval(function(){localStorage["plaintextarea"]=textarea.value}, 100);
});
