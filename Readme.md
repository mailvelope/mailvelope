# Mailvelope

Mailvelope is a browser extension for Google Chrome and Firefox that allows secure email communication based on the OpenPGP standard. It can be configured to work with arbitrary Webmail provider.

## OpenPGP backends

Mailvelope uses the following OpenPGP implementation

  - [OpenPGP.js](http://openpgpjs.org/) for the Chrome Extension and for the Firefox Addon

## Status

  - Chrome Extension: _beta_
  - Firefox Addon: _beta_

## Installation

Mailvelope is available in the Chrome Web Store:
https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke

Check the [releases](https://github.com/toberndo/mailvelope/releases) section for latest builds of Firefox and Chrome installation packages.

## Build instructions

    git clone git://github.com/toberndo/mailvelope.git
    cd mailvelope
    git submodule init
    git submodule update
    make build

#### Chrome

    make dist-cr

The extension will be in `dist/mailvelope.chrome.zip`.

#### Firefox

To build the Firefox addon, first get the Firefox Addon SDK:

    cd ..
    git clone git://github.com/mozilla/addon-sdk.git
    cd addon-sdk
    source bin/activate
    cd ../mailvelope
    make dist-ff

The addon will be in `dist/mailvelope.firefox.xpi`.

## Website

http://www.mailvelope.com

## Licence

Use of this source code is governed by the GNU AFFERO GENERAL PUBLIC LICENSE that can be found in the LICENSE file.

## About

written by Thomas Oberndörfer <toberndo@yarkon.de>  
Blog: http://www.chasinclouds.com/  
follow me on [Twitter](https://twitter.com/#!/toberndo)  
