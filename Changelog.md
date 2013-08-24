
0.6.6 / 24.08.2013 
==================

  * Fix broken decrypt process for outlook.com (accept `<br>` inside `<pre>` in mail body)
  * Add key text file upload to key import view

0.6.5 / 20.08.2013 
==================

  * Fix wrong encoding of non-ASCII characters in decrypted messages
  * [OpenPGP.js] Key generation with non-ASCII user id: generate valid signature

0.6.4 / 12.07.2013 
==================

  * Fix UTF8 regression introduced with OpenPGP.js update in 0.6.3
  * Update watchlist defaults for new GMX navigator
  * Set plain text as default editor due to incompatibilities with encrypted HTML mails

0.6.3 / 25.06.2013 
==================

  * Fix "Send public key by mail" producing corrupted key text
  * Update to latest OpenPGP.js

0.6.2 / 10.05.2013 
==================

  * Update Kendo UI to 2013.1.319. Fix key export problem on Win8
  * Add unique title for password dialog
  * Loading spinner for the key grid
  * Only allow export 'Send public key by mail' if key file does not exceed 1600 characters


0.6.1 / 15.03.2013 
==================

  * Primary private key can be defined in the general settings and option to always add primary key to list of recipients in encryption dialog.


0.6 / 07.03.2013 
==================

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


0.5.5 / 06.02.2013 
==================

  * Update to latest OpenPGP.js release, problems with compressed messages from e.g. Enigmail are fixed
  * Clean-up of key import coding
  * Fonts are loaded locally


0.5.4.2 / 18.12.2012 
==================

  * Unicode support for encryption process and key owner name

0.5.4.1 / 17.12.2012 
==================

  * Set minimum Chrome version to 21
  * Center encrypt dialog (support for new Gmail editor)

0.5.4 / 06.12.2012 
==================

  * Improved positioning of decrypt dialog for large mails: the dialog is now shown always on top and not in the center of the mail
  * Revised armored text extraction in decrypt frame: this fixes a bug where in some situations the armored text was not extracted correctly
  * Fix encrypt button style in outlook.com
  * Decode HTML entities in text mode: e.g. > is now decoded correctly
  * Remove migration code that was introduced with 0.4.2


0.5.3 / 12.11.2012 
==================

  * Support for messages in __pre__ tags
  * Higher selector specificity in framestyles.css to support Roundcube

0.5.2.2 / 08.11.2012 
==================

  * Browser actions: improved tab handling

0.5.2.1 / 07.11.2012 
==================

  * Fix bug in Add/Remove page functionality

0.5.2 / 07.11.2012 
==================

  * Embed documentation from Mailvelope website

0.5.1.1 / 26.10.2012 
==================

  * Fix decrypt problem when Web of Trust (WOT) chrome extension is active

0.5.1 / 15.10.2012 
==================

  * [Chrome] improved decompression and handling of dynamic packet header lengths

0.5.0 / 12.10.2012 
==================

  * Major refactoring
  * Add Firefox support
  * [Chrome] Use Require.js for background scripts
  * Update jQuery to 1.8.2
  * CommonJS wrapper for Google Closure library
  * Add submodules: OpenPGP.js, ppg-api

0.4.3 / 07.09.2012 
==================

  * Add key export feature to key grid
  * Update Bootstrap to 2.1.1

0.4.2.0 / 04.09.2012 
==================

  * Improve key import process
  * Revise public key handling

0.4.1.0 / 27.08.2012 
==================

  * Fix freeze when decrypting ZIP compressed messages
  * Add min-width to browser action popup to prevent cropping

0.4.0.1 / 24.08.2012 
==================

  * initial public release
