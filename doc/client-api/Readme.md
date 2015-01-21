Basic Usage
-----------
The Mailvelope extension injects a script into the page to make its client-api accessible.
Since the timing is not defined consumers will have to use the following method or something equivalent to reliably obtain a reference to the Mailvelope client-API.
```
(function() {

  function init() {
    if (typeof mailvelope !== 'undefined') {
      mailvelopeLoaded();
    } else {
      $(document).on('mailvelope', mailvelopeLoaded);
    }
  }

  function mailvelopeLoaded() {
    // window.mailvelope object is available
  }

  $(document).ready(init);

}());
```

The `mailvelope` object will be an instance of the [mailvelope.Mailvelope](mailvelope.Mailvelope.html) class, please refer to its methods for further documentation.
