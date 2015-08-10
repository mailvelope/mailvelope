#!/bin/bash

if [ $TRAVIS_PULL_REQUEST == "false" ] && [ $TRAVIS_BRANCH == "dev" ]; then
  mkdir nightly
  cp dist/mailvelope.chrome.zip "nightly/mailvelope.$(date +%Y-%m-%d).chrome.zip"
  cp dist/mailvelope.firefox.xpi "nightly/mailvelope.$(date +%Y-%m-%d).firefox.xpi"
  cp dist/mailvelope.chrome.zip nightly/mailvelope.latest.chrome.zip
  cp dist/mailvelope.firefox.xpi nightly/mailvelope.latest.firefox.xpi
  sshpass -p ${DEPLOY_PASS} scp -r nightly/ ${DEPLOY_USER}@build.mailvelope.com:html/ 
fi
