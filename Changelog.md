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
