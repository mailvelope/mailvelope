Mailvelope Changelog
====================

v5.2.0
-------
__Jun 27, 2024__

  * Measure onboarding success with opt-in for 1% of users (Clean Insights)
  * Auto text wrap in display container for cleartext signed messages
  * Fix duplicate key entries in the keyring after reload of GnuPG keyring
  * Add better hint when GnuPG is installed but not detected
  * Use crypto.randomUUID() for unique identifiers

v5.1.2
-------
__Feb 14, 2024__

  * Fix click on links in decrypted message leading to page loading errors
  * Update dependencies

v5.1.1
-------
__Oct 13, 2023__

  * [Gmail] Fix detection of encrypted attachments

v5.1.0
-------
__Jul 11, 2023__

  * Support signature verification independent of sender identity
  * Display signature verification results in the file decryption UI
  * Warn about signature inconsistency between message and attachments
  * Improve detection of messages with detached signatures
  * Fix key import not updating existing keys properly
  * Fix undefined password in private key backup after prior usage of password cache

v5.0.1
-------
__Apr 19, 2023__

  * Replace QR code library
  * Fix showing only first email address of key in recipient selection of Mailvelope editor
  * Fix unknown signature has fingerprint instead keyId (GnuPG backend)

v5.0.0
-------
__Apr 2, 2023__

  * Upgrade to OpenPGP.js v5
  * Fix timeout error when loading large GnuPG keyrings

v4.7.1
-------
__Nov 19, 2022__

  * [Gmail] Fix Gmail API re-authentication required after browser restart

v4.7.0
-------
__Nov 8, 2022__

  * [Gmail] Migrate deprecated OAuth out-of-band flow to browser.identity API

v4.6.1
-------
__Sep 9, 2022__

  * PGP/MIME compatibility: detect messages starting with "Content-Class"
  * Fix sending messages with defined alternative key where recipient does not have a key
  * Fix update password caching settings not taking effect
  * Fix issue with sending message when password cache is deactivated and email has attachments

v4.6.0
-------
__Jun 20, 2022__

  * Revise key search UI: search in verified key directories and WKD. Use key import preview for search results. Remove HKP server configuration.
  * Fix decrypting email with empty MIME nodes
  * [Gmail] Fix sending email with special characters in name associated with the email address

v4.5.2
-------
__Apr 3, 2022__

  * [Gmail] Fix detection of navigation area for new integrated view of Gmail to display Mailvelope compose button
  * [Gmail] Fix transfer of recipient email addresses from Mailvelope to Gmail editor
  * Upgrade emailjs-mime-parser to v2.0.7

v4.5.1
-------
__Mar 16, 2022__

  * Fix signature evaluation for key binding feature that can result in error when decrypting messages or files

v4.5.0
-------
__Mar 10, 2022__

  * Add option to define extra encryption key in the editor UI to support a domain-wide key concept
  * Introduce key binding: latest seen signature of contact is used for the key selection process
  * Adapt key import dialog for key rotation events
  * Use the keys.openpgp.org verifying key server for automatic key discovery
  * Add Clean Insights privacy preserving analytics (https://cleaninsights.org/)
  * Support WKD advanced method (https://datatracker.ietf.org/doc/draft-koch-openpgp-webkey-service/13/)
  * [Gmail] Fix transfer of recipients to Gmail editor
  * Update dependencies (Webpack 4 -> 5)

v4.4.1
-------
__May 12, 2021__

  * [Gmail] Fix Mailvelope editor button integration when Meet section active in main menu
  * [Gmail] Fix missing cc recipients when reply to all
  * [Gmail] Fix legacy G Suite detection
  * Fix unit tests: replace expired keys
  * Update dependencies

v4.4.0
-------
__Oct 24, 2020__

  * WKD: Add missing 'l' parameter to WKD queries
  * Fix body selection for clipped or cleartext signed messages in Gmail integration
  * Revise signature detail retrieval in file decryption UI and GnuPG module
  * Replace innerHTML assignment with DOMParser in decrypt message content sandbox
  * Improve license error messages and status update
  * Reduce dependencies of content scripts

v4.3.2
-------
__May 22, 2020__

  * Free access to Gmail-API for G Suite legacy (Google Apps) accounts
  * Support port numbers in match patterns of authorized domain list
  * Scan host page for PGP messages inside dynamically created iframes

v4.3.1
-------
__Apr 7, 2020__

  * Revise Gmail API configuration UI

v4.3.0
-------
__Apr 3, 2020__

  * Add Gmail API support for G Suite organizations with Mailvelope subscription
  * Key import preview: merge public into private keys. Fix import of private keys from PGP Universal Server.
  * Revise wording for contacts vs keys
  * Fix build error on case sensitive file systems
  * Update default authorized domain list

v4.2.3
-------
__Mar 5, 2020__

  * Revise Google sign in button design

v4.2.2
-------
__Mar 3, 2020__

  * Fix key import of multiple keys in one armored block
  * Fix decrypt of message with unknown signature (GnuPG backend)
  * Revise Gmail API settings UI

v4.2.1
-------
__Jan 9, 2020__

  * Build WKD URL with web crypto digest method instead node crypto shim
  * Various bug fixes in Gmail API integration
  * Fix options view of app when using createSettingsContainer client-API method
  * Update to Bootstrap 4.4.1, optimize container layout

v4.2.0
-------
__Nov 12, 2019__

  * Support for Gmail API (experimental)
  * Websites can trigger request for inclusion in the authorized domain list

v4.1.1
-------
__Aug 28, 2019__

  * Fix error messages on restore backup dialog
  * Fix bug in the editor recipient input field when terminating email address with space key
  * Hide bit length selector in in advanced key generation options where not appropriate
  * Fix duplicate password popup for Mailvelope viewer in the app decrypt UI
  * Optimize styling of embedded components for small dimensions
  * Allow to switch keyrings in the keyring setup UI
  * Fix encoding of file objects when decrypting armored message in app
  * Add support for Experimental Web Platform features with DOMPurify returning TrustedHTML
  * Add Mailvelope title to editor and password dialog
  * Fix line wrapping of cleartext signed messages

v4.1.0
-------
__Aug 15, 2019__

  * Further fixes of character duplication when pasting password from clipboard in password input fields
  * The keyring.openSettings method supports now direct navigation to the default key

v4.0.1
-------
__Aug 8, 2019__

  * Fix pasting password from clipboard in password and key generate dialogs
  * Fix import keys with key attribute packets from keys.mailvelope.com and WKD
  * Improve scaling of logo

v4.0.0
-------
__Aug 1, 2019__

  * Refreshed Mailvelope branding: new design, new logo, new icons and fonts.
  * Many revised UI components, integration of new UI concepts like toasts to replace alert messages.
  * Revised mail provider integration: messages are automatically decrypted if private key password is cached, new animated Mailvelope editor button.
  * New configurable security background with choice of 24 icons
  * Remove jQuery dependency in content scripts
  * Improve PGP message detection logic on host page
  * New file encryption UI in app which supports signing

v3.3.1
-------
__July 5, 2019__

  * Fix race condition when importing keys that can lead to key pairs being imported as separate public and private key

v3.3.0
-------
__July 4, 2019__

  * [Security] New key import UI that displays all imported user IDs and requires additional confirmation step (CVE-2019-9150)
  * [Security] Fix insufficient key equality checks when importing keys via the client-API
  * [Security] Fix self signature check for armoredDraft option when using GnuPG keyring. Sign and encrypt operations should always require user interaction (CVE-2019-9149).
  * [Security] Add missing message and key validity checks (CVE-2019-9148)
  * [Security] Improve counter of private key operations to increase resistance against time-based side-channel attacks
  * Improve GPG detection on startup
  * [Security] Fix issue with the private key restore mechanism, that stores unlocked private keys inside the encrypted recovery message
  * Support for Autocrypt headers in client-API

v3.2.0
-------
__May 15, 2019__

  * Migrate to Bootstrap 4
  * Add openpgp-email-read and openpgp-email-write web components
  * Add query by email parameter to keyring.hasPrivateKey method
  * Add basic Autocrypt integration
  * Enable key lookup (Mailvelope key server, WKD, Autocrypt) for client-API calls
  * Add freenet.de to default list of authorized domains
  * Update OpenPGP.js to 4.5.1

v3.1.0
-------
__Mar 11, 2019__

  * Redesign key details UI in app
  * Key UI: upload or delete keys to/from the Mailvelope key server
  * Key UI: change password of private keys
  * Key UI: create key revokation certificates
  * Key UI: change (add new, delete, revoke) user ID: name and email
  * Key UI: set new expiration date for key
  * Make links in decrypted messages clickable
  * Add checkbox to security settings to allow to hide header in armored message
  * [Security] Fix control mechanism to let components only be created in authorized domains (CVE-2019-9147)
  * [Security] Fix OK badge on browser action icon that signals user interaction
  * Various fixes and refactoring
  * Update OpenPGP.js to 4.4.9

v3.0.2
-------
__Dec 18, 2018__

  * Update OpenPGP.js to 4.3.0

v3.0.1
-------
__Dec 14, 2018__

  * Move native messaging permission in Chrome to optional permissions. Revise OpenPGP backend selection UI.
  * Update OpenPGP.js to 4.2.2. Add patch to verify ECC keys.

v3.0.0
-------
__Dec 11, 2018__

  * GnuPG integration: connect via native messaging with a GnuPG installation and use GnuPG as an alternative backend for all OpenPGP operations.
  * New encrypted web forms feature: use Mailvelope to transmit HTML form data end-to-end encrypted with OpenPGP (https://github.com/mailvelope/mailvelope/wiki/Encrypted-Forms).
  * Support the Web Key Directory (https://wiki.gnupg.org/WKD) for decentralized public key discovery.
  * Update OpenPGP.js to 4.2 (http://github.com/openpgpjs/openpgpjs/releases/tag/v4.2.0): security fixes, support for ECC.
  * Redesign of keyring selection component and keyring management view
  * Block external HTML content in decrypted messages
  * Revise unit testing framework and increase test coverage
  * Major refactoring of keyring and model classes to support multiple OpenPGP backends
  * Add keyring fallback mechanism to find required private key for an operation across multiple keyrings
  * Public keys are synchronized across multiple keyrings
  * Authorized domains for client-API are by default HTTPS-only
  * Revise MIME parser/builder integration

v2.2.2
-------
__May 15, 2018__

  * [Security] Enforce strict MDC checking for all non-AES symmetric encryption algorithms

v2.2.1
-------
__May 4, 2018__

  * Fix issue with negative left-position of encrypt frame in some webmail clients
  * Remove non-functional (and on Firefox broken) scanning for sub frames when adding active tab to the watchlist
  * Fix corrupted file name on file download for Firefox <61

v2.2.0
-------
__Mar. 6, 2018__

  * Encrypt and decrypt texts in App UI
  * Migrate decrypt-inline and editor component to React
  * Decrypt available messages when transferring to Mailvelope editor
  * Fix keyring backup key type filtering
  * Fix initialization of watchlist
  * Fix key server selection cancel button

v2.1.1
-------
__Dec. 20, 2017__

  * Revert: Use chrome.downloads API for key export

v2.1.0
-------
__Dec. 19, 2017__

  * File encryption: use binary format (.gpg file extension) by default
  * Introduce dashboard view as main entry point for the application
  * Redesign of the Mailvelope menu (in browser add-on toolbar)
  * Accessibility improvements (navigation in keyring management and settings)
  * Use chrome.downloads API for key export (fix for Bugzilla #1420419)
  * Better clarity about private key export in key details UI
  * [Security] Fix Inline Security Background spoofable (Medium)
  * [Security] Fix UI Redressing via web accessible resources (Medium)
  * Unify event handling in all controllers
  * Revise modal dialog behavior of Mailvelope browser popups
  * Revert to Symmetric-Key Message Encryption of OpenPGP.js v1 for private key backup
  * Move add-on distribution from self-hosted to AMO
  * Minor bug fixes and dependency updates

v2.0.0
-------
__Okt. 9, 2017__

  * Complete migration of Firefox Add-on to Web Extension. Merge codebase for Chrome and Firefox.
  * Upgrade to OpenPGP.js v2
  * Support binary format for file decrypt
  * Raise file size limit for file encryption to 50 MB
  * Improve accessibility of main App UI
  * Add mail.zoho.com to list of email providers
  * Migrate main App UI to React and React Router
  * Use frameId based content script injection logic
  * Further migrate codebase to ES6
  * Move bower dependencies to npm
  * Replace PhantomJS with Karma and Chrome headless for unit testing
  * Load OpenPGP.js as npm dependency instead of using git submodules
  * Update dependencies

v1.8.1
-------
__Aug. 2, 2017__

  * Fix localization issues on Firefox 55

v1.8.0
-------
__July 10, 2017__

  * Migrate storage layer from localstorage to chrome.storage on Chrome and WebExtension API on Firefox
  * Support multiple MIME text parts of decrypted message
  * Mailvelope version is set to body tag for all websites in watchlist
  * Bug fixes and update of dependencies

v1.7.2
-------
__Apr. 18, 2017__

  * Add mail.riseup.net to list of email providers
  * Load keyGenDialog from embedded WebExtension to prevent password input warning in Firefox
  * Display selected key server in the key search UI
  * Migrate key server settings to React, allow ports, provide list of servers. Automatically add key server to watchlist.
  * Migrate to Webpack 2
  * Update dependencies
  * Normalize armored keys before import

v1.7.1
-------
__Feb. 24, 2017__

  * Replace unmodified notification in editor with enforced password prompt on signing of message

v1.7.0
-------
__Feb. 23, 2017__

  * Propagate preference changes in App UI to content scripts and all integrated components
  * Extract recipient tag input Angular component to separate file and wrap in React component
  * Update recipient input autocomplete after change of keyring data, newly imported keys can now directly be used in the editor
  * Update key selection for file encryption after key import
  * Fix add to whitelist function for Firefox
  * Remove unnecessary reload notice in settings
  * Refactoring key details view and keyring export
  * Add API version to body tag
  * [Security] Add notification to prevent signing of messages without user interaction
  * localization updates: Spanish, Portuguese (Brazil), Japanese, Chinese (Taiwan), Norwegian, Ukrainian, Dutch, Chinese, Arabic, French, Lithuanian

v1.6.5
-------
__Jan. 16, 2017__

  * Workaround for port.disconnect() bug (#655932) in Chrome

v1.6.4
-------
__Dec. 22, 2016__

  * Revert content script injection logic for Chrome to old logic without frameIds

v1.6.3
-------
__Dec. 21, 2016__

  * Use frameId based content script injection logic in Chrome

v1.6.2
-------
__Dec. 6, 2016__

  * Add default addon.detection.png path to web accessible resources in Chrome

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
