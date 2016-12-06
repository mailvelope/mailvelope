Mailvelope Changelog
====================

v1.6.1
-------
__Dec. 6, 2016__

  * Fix path to addon.detection.png on Chrome to be compatibe with the client-API v1.0

v1.6.0
-------
__Dec. 2, 2016__

  * Add message signing options to Mailvelope editor for sign & encrypt and sign-only use cases.
  * Extract sender address from mail client and show signature verification result in decrypt view
  * Add key expiration time option to key generate UI
  * Prevent setting invalid keys as primary key
  * Add inbox.google.com to watchlist. Fix decryption errors.
  * Migrate from jshint and jscs to eslint
  * [API]: createDisplayContainer method returns error code
  * Major refactoring
    - new folder structure
    - React is used for new UI components
    - Webpack and Babel included in the build step
    - migrating to ES6 module syntax
  * Update dependencies
  * Bugfixes

v1.5.2
-------
__Sept. 7, 2016__

  * [Firefox] Update jpm to v1.1.4
  * Optimize recipients transfer methods in editor for Gmail and Yahoo
  * Remove recipients transfer methods in editor for generic webmail
  * Localization updates

v1.5.1
-------
__July 8, 2016__

  * Bugfixes
  * Localization updates

v1.5.0
-------
__July 5, 2016__

  * Introduce provider specific content scripts to optimize integration of Mailvelope and webmail client (non-API case)
  * New workflow for key selection in the Mailvelope editor: select recipients with their email address. Email autocomplete feature from all email addresses in local keyring.
  * Transfer recipient email address to Mailvelope editor and back to webmail client (Gmail only)
  * Refactoring of controllers, add unit test framework, unit tests for controllers and Mailvelope editor
  * Use Angular.js for new UI components
  * Implement TOFU key lookup using new Mailvelope key server: keys.mailvelope.com
  * Add option to upload public key on key generation to key server
  * Increase minimum required version: Chrome 49, Firefox 45

v1.4.0
-------
__May 9, 2016__

  * Implement HKP key search and import
  * File encryption support
  * Add mocha unit test infrastructure
  * Localize recovery sheet for key backup
  * Show key ID in sign message dialog
  * Redesign key import UI
  * Update OpenPGP.js to v1.6.0
  * Update bower dependencies: jQuery to 2.2.1, DOMPurify to 0.7.4
  * Bugfixes

v1.3.6
-------
__Feb. 24, 2016__

  * Update to latest email.js components
  * Port Firefox add-on to jpm build tool

v1.3.5
-------
__Feb. 16, 2016__

  * Update closure library to support new email address TLDs for key generation
  * [Security] Limit operations for keys in cache
  * Remove feature to sign/encrypt in DOM of website

v1.3.4
-------
__Jan. 23, 2016__

  * Fix editor flexbox rendering for Chrome 48
  * Use name-addr format if no name provided in userid at key generation
  * Add language file for Ukrainian

v1.3.3
-------
__Jan. 7, 2016__

  * Update watchlist for Outlook.com
  * Activate API for Posteo
  * Log API encryption operations
  * Always sign editor drafts
  * Add mail.ru to list of supported mail providers

v1.3.2
-------
__Dec. 15, 2015__

  * [Security] Fix XSS via HTML file download link

v1.3.1
-------
__Dec. 7, 2015__

  * Increment patch version to allow new upload to Mozilla signing process

v1.3.0
-------
__Nov. 27, 2015__

  * API: create and restore drafts in the editor container
  * Grunt task to build crx packages for Chrome
  * Strict check on packet structure for private key restore
  * Pseudo-revoke mechanism to allow mail provider to invalidate keys
  * Update DOMpurify to 0.7.3

v1.2.3
-------
__Oct. 28, 2015__

  * [OpenPGP.js] Enforce integrity protection only for modern ciphers, fix compatibility issues

v1.2.2
-------
__Oct. 16, 2015__

  * Fix key generation activity indicator (Firefox)
  * Don't show recovery sheet when backup upload fails

v1.2.1
-------
__Oct. 14, 2015__

  * Recovery sheet layout fixes
  * [OpenPGP.js] Update OpenPGP.js, enforce integrity protection, deprecate Symmetrically Encrypted Data Packet (Tag 9)

v1.2.0
-------
__Oct. 4, 2015__

  * API: trigger disconnect event on extension update
  * API: add confirm parameter to key generate method to allow rejecting key if public key upload fails
  * Fix Mailvelope editor button in certain mail providers
  * [Security][OpenPGP.js] Fix S2K to prevent decryption of malformed private key backup messages

v1.1.0
-------
__Sep. 16, 2015__

  * Editor container supports keepAttachment flag for message forwarding scenarios
  * Fix race condition on attachment upload that can lead to lost attachments
  * Ignore null values in API type checker
  * [OpenPGP.js] Support plain email address in user IDs of keys

v1.0.2
-------
__Aug. 25, 2015__

  * Fix spinner for large messages in reply scenario

v1.0.1
-------
__Aug. 20, 2015__

  * Fix false positives from Mozilla signing review

v1.0.0
-------
__Aug. 18, 2015__

  * API: sign PGP/MIME messages
  * API: support for signature verification in the decrypt container
  * Set password cache to on by default (30 min)
  * Deprecate Firefox 31 support
  * Improve attachment decrypt performance (Firefox)
  * Auto select right keyring when opening the settings
  * Inject content scripts in all open tabs on installation of extension
  * API: register handlers to allow backup and restore of keys and public keyring synchronization
  * API: validateKeyForAddress method returns fingerprint and lastModified date
  * API: add container to create symmetrically encrypted key backup and recovery sheet
  * API: add container to restore key and password
  * API: add container to generate key
  * API: display key details in the key import dialog
  * API: fix editor quota limit calculation
  * [OpenPGP.js] Generate keys with multiple user IDs
  * [OpenPGP.js] Use Web Crypto API to generate keys (Firefox)
  * Show reason of password request in password dialogs
  * Many style fixes and layout improvements

v0.13.2
-------
__July 22, 2015__

  * Update OpenPGP.js to 1.2.0
  * Custom icon color for security background

v0.13.1
-------
__Apr. 15, 2015__

  * Fix empty list of recipients due to bug in primary key setting
  * Fix positioning of sign/encrypt dialogs
  * Update OpenPGP.js to 1.0.1

v0.13.0
-------
__Apr. 14, 2015__

  * Finalize Client-API v1: http://mailvelope.github.io/mailvelope/
  * Optimize attachment styling
  * Support for multiple keyrings
  * Update mailreader to v0.4.0
  * Fix attachment upload bug in FF
  * Replace security token with security background
  * Small screen-optimization for settings
  * Automatically set primary key at key generation and key import
  * Set auto adding of the primary key by default
  * Redesign password entry and import key dialogs
  * [Security] Encode attachment filename
  * [Security] Update DOMPurify to 0.6.1, use jQuery output option
  * Fix endless loop in armored block detection on the mail client page
  * [Security] Update OpenPGP.js to v0.11.1, fix bug in DSA signature verification
  * [Security] Add noreferrer to external links
  * [Security] Check for ambiguous keyIds on key import
  * [Security] Validate key and user IDs of signatories
  * [Security] Open all links in message body in new window
  * [Security] Set charcode in sandboxed iframes
  * Localization updates
  * Sign Firefox XPI packages
  * Fix decoding of MIME messages with transfer encoding: 8bit
  * Redesign browser action menu
  * Limit on/off action to non client-API controls (Firefox)
  * Establish new Firefox download link: https://download.mailvelope.com/releases/latest/mailvelope.firefox.xpi
  * Add De-Mail providers to default list of supported mail providers
  * UI to set custom security background
  * Establish demo page for client API at: https://demo.mailvelope.com
  * Log user actions in embedded components and display indicator as badge of the addon toolbar icon
  * Add multiple file upload functionality

v0.12.1
-------
__Feb. 23, 2015__

  * Fix AMO review issue: use duplicate mvelo.js instead of eval

v0.12.0
-------
__Feb. 5, 2015__

  * Settings UI: replace Kendo UI components, use templating, replace short with long key ID
  * Client-API: allow web applications to interact with Mailvelope (experimental)
  * Client-API: documentation available at: https://mailvelope.github.io/mailvelope
  * Client-API: unit tests available at: https://github.com/mailvelope/mailvelope-api-test
  * [OpenPGP.js] Upgrade to v0.9.0: fix zlib/zip compression bug
  * fix bug with quoted printable in armored blocks
  * support nested MIME structure in PGP/MIME
  * Enable JSCS style checking
  * use flexbox to resize editor
  * automated builds with travis-ci
  * generate RSA 4096 bit keys by default
  * restrict watchlist match pattern
  * improve MIME detection
  * defer loading of keyring
  * localization updates. New languages: Arabic, Bulgarian, Dutch, Slovenian

v0.11.0
-------
__Nov. 27, 2014__

  * Remove v0.8 local storage migration, delete old keys
  * Controller refactoring
  * Redesign of editor controls
  * Use JavaScript strict mode
  * Deactivate rich-text editor as we currently only support PGP/Inline
  * [Security fix]: Load documentation in separate browser window to prevent access to priviledged API

v0.10.4
-------
__Nov. 10, 2014__

  * Fixes for addons.mozilla.org review

v0.10.3
-------
__Nov. 9, 2014__

  * Migrate to Bootstrap 3.2
  * Refactor content scripts
  * Transfer repository to https://github.com/mailvelope/mailvelope

v0.10.2
-------
__Oct. 14, 2014__

  * Remove keys on uninstall of Firefox addon (optional)
  * Fix font CSP issue in Chrome
  * Fix message adapter API for Firefox 33

v0.10.0
-------
__Oct. 1, 2014__

  * Add support for localization
  * Translations for: Chinese (China), French, German, Norwegian, Polish, Russian, Spanish
  * Fix support for HTML in PGP messages (v0.9.0 regression)
  * Update OpenPGP.js to v0.7.2
  * Use stable worker object in Firefox
  * Update Require.js to 2.1.14
  * Add posteo.de and web.de to default list of mail providers

v0.9.0
------
__June 16, 2014__

  * Support reading of MIME messages
  * Global on/off switch for page injected elements
  * Verify cleartext signed messages [Julian Bäume & Marek Kurdej]
  * Hide Mailvelope editor button after typing
  * Support armored texts without header
  * Update DOMPurify to 0.4.2
  * [Firefox] Use toggle button in Australis
  * [Chrome] Migrate from chrome.extension to chrome.runtime

v0.8.3
------
__May 11, 2014__

  * Update jQuery to 2.1.0
  * Enable sign and encrypt in included textareas for Firefox
  * Separate jQuery from main content script
  * JSHint fixes

v0.8.2
------
__May 2, 2014__

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