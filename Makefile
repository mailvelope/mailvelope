
PROFILEDIR = ~/dev/firefox/test_profile
FFBIN = ~/dev/firefox/firefox-beta/firefox

default: help

help:
	@echo "pack           - concatenate content script files"
	@echo "minify         - minify content script files"
	@echo "build-cs       - pack & minify content script files"
	@echo "copy-common    - copy common folder to Chrome and Firefox directories"
	@echo "copy-dep       - copy openpgp.js library to Chrome directory"
	@echo "test-build     - pack content scripts and copy common folder"
	@echo "build          - copy common folder and dependencies"
	@echo "start-ff       - run addon in Firefox beta"
	@echo "start-ff-new   - run addon in Firefox beta, clear local storage"
	@echo "start-ff-std   - run addon in Firefox current release"
	@echo "test-ff        - do test-build & run addon in Firefox"
	@echo "dist-ff        - package add-on as an XPI file in dist folder"
	@echo "dist-cr        - package chrome extension in zip file"

pack:
	@echo Concatenate content script files...
	@cat common/dep/jquery.js common/ui/inline/mvelo.js common/ui/inline/main-cs.js common/ui/inline/decryptFrame.js common/ui/inline/encryptFrame.js > common/ui/inline/build/cs-mailvelope.js
	@echo Appending //@ sourceURL=cs-mailvelope.js...
	@echo '//@ sourceURL=cs-mailvelope.js' >> common/ui/inline/build/cs-mailvelope.js

minify:
	@echo Running http://code.google.com/closure/compiler/...
	@java -jar res/closure-compiler/compiler.jar --js=common/dep/jquery.js --js=common/ui/inline/mvelo.js --js=common/ui/inline/main-cs.js --js=common/ui/inline/decryptFrame.js --js=common/ui/inline/encryptFrame.js --js_output_file=common/ui/inline/build/cs-mailvelope.min.js
	@echo Appending //@ sourceURL=cs-mailvelope.min.js...
	@echo '//@ sourceURL=cs-mailvelope.min.js' >> common/ui/inline/build/cs-mailvelope.min.js

build-cs: pack minify

copy-common:
	@echo Update common folder...
	@cp -ur common/* chrome/common
	@cp -ur common/* firefox/data/common

copy-dep:
	@echo Update openpgp.js files...
	@cp -u dep/chrome/openpgpjs/resources/openpgp.js chrome/dep
	@cp -u dep/chrome/openpgpjs/resources/openpgp.min.js chrome/dep
	@cp -u dep/firefox/openpgpjs/resources/openpgp.js firefox/packages/openpgp/lib

test-build: pack copy-common copy-dep

build: copy-common copy-dep

dist-ff:
	@echo Package add-on as an XPI file in dist folder...
	@cfx xpi --pkgdir=firefox
	@mv mailvelope.xpi dist

dist-cr:
	@echo Package chrome extension in zip file...
	@rm -f dist/mailvelope.zip
	@zip -r dist/mailvelope chrome/* -x "*/.*"

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
