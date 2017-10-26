#!/bin/bash

if [ $TRAVIS_PULL_REQUEST == "false" ] && [ $TRAVIS_BRANCH == "dev" ]; then
  mkdir nightly
  cp dist/mailvelope.chrome.zip "nightly/mailvelope.$(date +%Y-%m-%d).chrome.zip"
  cp dist/mailvelope.chrome.crx "nightly/mailvelope.$(date +%Y-%m-%d).chrome.crx"
  cp dist/mailvelope.firefox.zip "nightly/mailvelope.$(date +%Y-%m-%d).firefox.zip"
  cp dist/mailvelope.chrome.zip nightly/mailvelope.latest.chrome.zip
  cp dist/mailvelope.chrome.crx nightly/mailvelope.latest.chrome.crx
  cp dist/mailvelope.firefox.zip nightly/mailvelope.latest.firefox.zip
  sshpass -p ${DEPLOY_PASS} scp -r nightly/ ${DEPLOY_USER}@build.mailvelope.com:html/
fi
