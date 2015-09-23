## Basic Usage

The Mailvelope extension injects a script into the page to make its client-api accessible.
The `window.mailvelope` object will be an instance of the [Mailvelope](Mailvelope.html) class, please refer to its methods for further documentation.

## Events

### mailvelope

The event will be triggered once the `window.mailvelope` object is available.
Since the timing is not defined consumers will have to use the following method or something equivalent to reliably obtain a reference to the Mailvelope client-API.
```
(function() {

  function init() {
    if (typeof mailvelope !== 'undefined') {
      mailvelopeLoaded();
    } else {
      window.addEventListener('mailvelope', mailvelopeLoaded, false);
    }
  }

  function mailvelopeLoaded() {
    // window.mailvelope object is available
  }

  $(document).ready(init);

}());
```

### mailvelope-disconnect

The event is fired during an update of the extension. The auto-update mechanism of the browser can initiate the update at any time.
Existing Mailvelope containers on a consumer page are no longer functional after the update. The disconnect event can be used to inform users about potential data loss (only relevant for Mailvelope editor) and trigger a page reload.
```
window.addEventListener('mailvelope-disconnect', function(event) {
  // event.detail.version is the version of the updated extension
}, false);
```

## Promises

The client-API uses the new ECMAScript 6 Promises. At the moment JSDoc does not have specialized support for this new
language feature, although adding support is in [discussion](https://github.com/jsdoc3/jsdoc/issues/509). Due to this reason
we will use the `@throws` tag to document errors that should be expected in the rejection of a promise and will not actually
be thrown by the function returning the promise.
