var mvelo = mvelo || {};
// chrome extension
mvelo.crx = typeof chrome !== 'undefined';
// firefox addon
mvelo.ffa = self.port !== undefined;
mvelo.extension = mvelo.extension || mvelo.crx && chrome.extension;
// min height for large frame
mvelo.LARGE_FRAME = 600;