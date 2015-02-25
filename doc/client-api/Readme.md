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
      $(window).on('mailvelope', mailvelopeLoaded);
    }
  }

  function mailvelopeLoaded() {
    // window.mailvelope object is available
  }

  $(document).ready(init);

}());
```

The `mailvelope` object will be an instance of the [Mailvelope](Mailvelope.html) class, please refer to
its methods for further documentation.

Promises
--------
The client-API uses the new ECMAScript 6 Promises. At the moment JSDoc does not have specialized support for this new
language feature, although adding support is in [discussion](https://github.com/jsdoc3/jsdoc/issues/509). Due to this reason
we will use the `@throws` tag to document errors that should be expected in the rejection of a promise and will not actually
be thrown by the function returning the promise.
