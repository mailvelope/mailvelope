# Mailvelope

Mailvelope is a browser extension for Google Chrome and Firefox that allows secure email communication based on the OpenPGP standard. It can be configured to work with arbitrary Webmail provider.

## OpenPGP backends

Mailvelope uses the following OpenPGP implementations

  - [OpenPGP.js](http://openpgpjs.org/) for the Chrome Extension
  - [Pidgeon Privacy Guard](https://pidgeonpg.org/) for the Firefox Addon

## Status

  - Chrome Extension: _beta_
  - Firefox Addon: _alpha_

## Installation

Mailvelope is available in the Chrome Web Store:
https://chrome.google.com/webstore/detail/kajibbejlbohfaggdiogboambcijhkke

For Firefox only from source.

## Build instructions

    git clone git://github.com/toberndo/mailvelope.git
    cd mailvelope
    git submodule init
    git submodule update
    make build
    cd firefox/packages/ppg-api
    git submodule init
    git submodule update

## Website

http://www.mailvelope.com

## Licence

Use of this source code is governed by the GNU AFFERO GENERAL PUBLIC LICENSE that can be found in the LICENSE file.

## About

written by Thomas Oberndörfer <toberndo@yarkon.de>  
Blog: http://www.chasinclouds.com/  
follow me on [Twitter](https://twitter.com/#!/toberndo)  