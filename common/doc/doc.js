
(function() {

  $(document).ready(function() {
    parent.postMessage(JSON.stringify({
      event: "init"
    }), '*');
  });

}());
