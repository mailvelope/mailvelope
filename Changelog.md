Mailvelope Changelog
====================

v0.8.2
------
__May. 2, 2014__

  * Decrypt inline mode for Firefox
  * Short term fix for changes of unsafeWindow coming to Firefox 30
  * XSS sanitizer: replace wysihtml5 parser with DOMPurify
  * [OpenPGP.js] Optimize signature verifications to evaluate primary user (reduces loading time of key grid)
  * [OpenPGP.js] Fix broken twofish cipher
  * [OpenPGP.js] Generate key by default without unlocking secret part
  * [OpenPGP.js] Fix key update for keys generated with PGP Desktop

v0.8.1
------
__Apr. 14, 2014__

  * Fix preferences update. Changes to security token applied instantly.
  * Port Firefox Add-on to new OpenPGP.js API
  * Use web workers for key generation, signing and decryption (Fixes performance issues with Firefox).

v0.8.0
------
__Apr. 5, 2014__

  * Signing of clear text messages. Thanks to @johnyb for contribution.
  * Switch to Grunt as build tool and Bower for packet management
  * [OpenPGP.js] Security fixes. See https://github.com/openpgpjs/openpgpjs/wiki/Cure53-security-audit for details
  * [OpenPGP.js] Update to v0.5.1, new architecture of the library with many enhancements including:
    - generation of standard compliant keys with main key for signing and subkey for encryption
    - improved compatibility and performance

v0.7.0
------
__Nov. 4, 2013__

  * Reduce initial loading time of key grid, lazy loading of key details
  * Merge branch firefox into master: one code base for Chrome and Firefox
  * Identify public key in email body, allow one click import
  * Firefox add-on reaches feature parity with Chrome extension (excluding decrypt inline scenario and performance)
  * Rewrite key import function: reject multiple keys per armored key text, more accurate error logging
  * Improved stability of key grid, make key mapping more robust against exceptions
  * Display short version of key id in key grid
  * Fix display of key creation date in Chrome
  * Export key pair: display public key first
  * Generate 2048-bit RSA keys by default
  * Add reference to Mailvelope in PGP header comment tag
  * Display Mailvelope version in options UI and PGP header line
  * Migrate to jQuery 2
  * Activate Mailvelope in private browsing mode of Firefox
  * Set minimum Chrome version to 26 (minimum Firefox version is 21)
  * Fix wrong encoding of non-ASCII characters in decrypted messages
  * [OpenPGP.js] Evaluate key flag to determine encryption key
  * [OpenPGP.js] Key generation with non-ASCII user id: generate valid signature

v0.6.6
------
__Aug. 24, 2013__

  * Fix broken decrypt process for outlook.com (accept `<br>` inside `<pre>` in mail body)
  * Add key text file upload to key import view

v0.6.5
------
__Aug. 20, 2013__

  * Fix wrong encoding of non-ASCII characters in decrypted messages
  * [OpenPGP.js] Key generation with non-ASCII user id: generate valid signature

v0.6.4
------
__July 12, 2013__

  * Fix UTF8 regression introduced with OpenPGP.js update in 0.6.3
  * Update watchlist defaults for new GMX navigator
  * Set plain text as default editor due to incompatibilities with encrypted HTML mails

v0.6.3
------
__June 25, 2013__

  * Fix "Send public key by mail" producing corrupted key text
  * Update to latest OpenPGP.js

v0.6.2
------
__May 10, 2013__

  * Update Kendo UI to 2013.1.319. Fix key export problem on Win8
  * Add unique title for password dialog
  * Loading spinner for the key grid
  * Only allow export 'Send public key by mail' if key file does not exceed 1600 characters

v0.6.1
------
__Mar. 15, 2013__

  * Primary private key can be defined in the general settings and option to always add primary key to list of recipients in encryption dialog.

v0.6.0
------
__Mar. 7, 2013__

  * Load web fonts locally from the extension
  * External rich text (wysihtml5) or plain text editor for mail composition
  * New preferences views for general and security settings
  * Disable context menu
  * Update RequireJS to 2.1.2
  * Update Bootstrap to 2.2.2
  * New external password dialog
  * Keep passwords in memory for browser session (optional)
  * New popup to display decrypted messages
  * Security token concept on all popup dialogs
  * Use iframe sandbox feature in encrypt and decrypt scenarios
  * Show watermark behind inline decrypted messages
  * [OpenPGP.js] support key import from hushmail
  * [OpenPGP.js] prefer subkeys for encryption
  * Show warning if external editor lost focus
  * Sanitize HTML of decrypted message
  * Logic to keep critical dialogs in the foreground

v0.5.5
------
__Feb. 6, 2013__

  * Update to latest OpenPGP.js release, problems with compressed messages from e.g. Enigmail are fixed
  * Clean-up of key import coding
  * Fonts are loaded locally

v0.5.4.2
--------
__Dec. 18, 2012__

  * Unicode support for encryption process and key owner name

v0.5.4.1
--------
__Dec. 17, 2012__

  * Set minimum Chrome version to 21
  * Center encrypt dialog (support for new Gmail editor)

v0.5.4
------
__Dec. 6, 2012__

  * Improved positioning of decrypt dialog for large mails: the dialog is now shown always on top and not in the center of the mail
  * Revised armored text extraction in decrypt frame: this fixes a bug where in some situations the armored text was not extracted correctly
  * Fix encrypt button style in outlook.com
  * Decode HTML entities in text mode: e.g. > is now decoded correctly
  * Remove migration code that was introduced with 0.4.2

v0.5.3
------
__Nov. 12, 2012__

  * Support for messages in __pre__ tags
  * Higher selector specificity in framestyles.css to support Roundcube

v0.5.2.2
--------
__Nov. 8, 2012__

  * Browser actions: improved tab handling

v0.5.2.1
--------
__Nov 7, 2012__

  * Fix bug in Add/Remove page functionality

v0.5.2
------
__Nov 7, 2012__

  * Embed documentation from Mailvelope website

v0.5.1.1
--------
__Oct. 26, 2012__

  * Fix decrypt problem when Web of Trust (WOT) chrome extension is active

v0.5.1
------
__Oct. 15, 2012__

  * [Chrome] improved decompression and handling of dynamic packet header lengths

v0.5.0
------
__Oct. 12, 2012__

  * Major refactoring
  * Add Firefox support
  * [Chrome] Use Require.js for background scripts
  * Update jQuery to 1.8.2
  * CommonJS wrapper for Google Closure library
  * Add submodules: OpenPGP.js, ppg-api

v0.4.3
------
__Sept. 7, 2012__

  * Add key export feature to key grid
  * Update Bootstrap to 2.1.1

v0.4.2.0
--------
__Sept. 4, 2012__

  * Improve key import process
  * Revise public key handling

v0.4.1.0
--------
__Aug. 27, 2012__

  * Fix freeze when decrypting ZIP compressed messages
  * Add min-width to browser action popup to prevent cropping

v0.4.0.1
--------
__Aug. 24, 2012__

  * initial public release