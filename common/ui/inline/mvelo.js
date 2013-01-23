var mvelo = mvelo || {};
// chrome extension
mvelo.crx = typeof chrome !== 'undefined';
// firefox addon
mvelo.ffa = self.port !== undefined;
mvelo.extension = mvelo.extension || mvelo.crx && chrome.extension;
// min height for large frame
mvelo.LARGE_FRAME = 600;
// random hash generator
mvelo.getHash = function() { return Math.random().toString(36).substr(2, 8); };

var constant = constant || (function() {
  var local = {
    FRAME_STATUS: '1',
    // frame status
    FRAME_ATTACHED: '2',
    FRAME_DETACHED: '3',
    // key for reference to frame object
    FRAME_OBJ: '4',
    // scan status
    SCAN_ON: '5',
    SCAN_OFF: '6',
    // marker for dynamically created iframes
    DYN_IFRAME: '7',
    IFRAME_OBJ: '8',
    // armor header type
    PGP_MESSAGE: '9',
    PGP_SIGNATURE: '10',
    PGP_PUBLIC_KEY: '11',
    PGP_PRIVATE_KEY: '12',
    // editor mode
    EDITOR_WEBMAIL: '13',
    EDITOR_EXTERNAL: '14',
    EDITOR_BOTH: '15'
  }
  Object.freeze(local);
  return local;
}());