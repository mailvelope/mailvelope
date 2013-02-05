var mvelo = mvelo || {};
// chrome extension
mvelo.crx = typeof chrome !== 'undefined';
// firefox addon
mvelo.ffa = typeof self !== 'undefined' && self.port;
mvelo.extension = mvelo.extension || mvelo.crx && chrome.extension;
// min height for large frame
mvelo.LARGE_FRAME = 600;
// frame constants
mvelo.FRAME_STATUS = 'stat';
// frame status
mvelo.FRAME_ATTACHED = 'att';
mvelo.FRAME_DETACHED = 'det';
// key for reference to frame object
mvelo.FRAME_OBJ = 'fra';
// scan status
mvelo.SCAN_ON = 'on';
mvelo.SCAN_OFF = 'off';
// marker for dynamically created iframes
mvelo.DYN_IFRAME = 'dyn';
mvelo.IFRAME_OBJ = 'obj';
// armor header type
mvelo.PGP_MESSAGE = 'msg';
mvelo.PGP_SIGNATURE = 'sig';
mvelo.PGP_PUBLIC_KEY = 'pub';
mvelo.PGP_PRIVATE_KEY = 'priv';
// editor mode
mvelo.EDITOR_WEBMAIL = 'webmail';
mvelo.EDITOR_EXTERNAL = 'external';
mvelo.EDITOR_BOTH = 'both';
// display decrypted message
mvelo.DISPLAY_INLINE = 'inline';
mvelo.DISPLAY_POPUP = 'popup';
// editor type
mvelo.PLAIN_TEXT = 'plain';
mvelo.RICH_TEXT = 'rich';

// random hash generator
mvelo.getHash = function() { return Math.random().toString(36).substr(2, 8); };

if (typeof exports !== 'undefined') {
  exports.mvelo = mvelo;
}