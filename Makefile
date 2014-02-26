
PROFILEDIR = ~/dev/firefox/test_profile
FFBIN = ~/dev/firefox/firefox-beta/firefox

default: help

help:
	@echo "build-cs       - pack content script files"
	@echo "copy-common    - copy common folder to Chrome and Firefox directories"
	@echo "copy-dep       - copy openpgp.js library to Chrome  and Firefox directories"
	@echo "build          - copy common folder and dependencies"
	@echo "start-ff       - run addon in Firefox beta"
	@echo "start-ff-new   - run addon in Firefox beta, clear local storage"
	@echo "start-ff-std   - run addon in Firefox current release"
	@echo "test-ff        - do test-build & run addon in Firefox"
	@echo "dist-ff        - package add-on as an XPI file in dist folder"
	@echo "dist-cr        - package chrome extension in zip file"

build-cs:
	@echo Concatenate content script files...
	@cat common/dep/jquery.min.js common/ui/inline/mvelo.js common/ui/inline/main-cs.js common/ui/inline/extractFrame.js common/ui/inline/decryptFrame.js common/ui/inline/importFrame.js common/ui/inline/encryptFrame.js > common/ui/inline/build/cs-mailvelope.js
	@echo Appending //@ sourceURL=cs-mailvelope.js...
	@echo '//@ sourceURL=cs-mailvelope.js' >> common/ui/inline/build/cs-mailvelope.js

copy-common:
	@echo Update common folder...
	@rsync -ur --exclude='lib/' common/* chrome/common
	@rsync -ur common/lib/* chrome/lib/common
	@rsync -ur --exclude='lib/' common/* firefox/data/common
	@rsync -ur common/lib/* firefox/lib/common
	@rsync -ur common/ui/inline/mvelo.js firefox/lib/common

copy-dep:
	@echo Update openpgp.js files...
	@rsync -u dep/chrome/openpgpjs/dist/openpgp_nodebug.js chrome/dep
	@rsync -u dep/firefox/openpgpjs/resources/openpgp.js firefox/packages/openpgp/lib

build: build-cs copy-common copy-dep

dist-ff:
	@echo Package add-on as an XPI file in dist folder...
	@cfx xpi --pkgdir=firefox --strip-sdk --output-file=dist/mailvelope.firefox.xpi

dist-cr:
	@echo Package chrome extension in zip file...
	@rm -f dist/mailvelope.chrome.zip
	@zip -r dist/mailvelope.chrome.zip chrome/* -x "*/.*"

start-ff:
	@echo Start Firefox beta...
	@cfx run --pkgdir=firefox --profiledir=$(PROFILEDIR) --binary=$(FFBIN)

start-ff-new:
	@echo Start Firefox beta, , clear local storage...
	@cfx run --pkgdir=firefox --profiledir=$(PROFILEDIR) --binary=$(FFBIN) --static-args='{ "clear_storage": true }'

start-ff-std:
	@echo Start Firefox...
	@cfx run --pkgdir=firefox --profiledir=$(PROFILEDIR)

test-ff: test-build start-ff
