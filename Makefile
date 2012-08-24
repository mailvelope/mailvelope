default: help

help:
	@echo "pack           - concatenate content script files"
	@echo "minify         - minify content script files"

pack:
	@echo Concatenate content script files...
	@cat src/lib/jquery-1.8.custom.js src/content_scripts/decryptFrame.js src/content_scripts/encryptFrame.js src/content_scripts/main-cs.js > src/content_scripts/build/cs-mailvelope.js
	@echo Appending //@ sourceURL=cs-mailvelope.js...
	@echo '//@ sourceURL=cs-mailvelope.js' >> src/content_scripts/build/cs-mailvelope.js

compile:
	@echo Running http://code.google.com/closure/compiler/...
	@java -jar res/closure-compiler/compiler.jar --js=src/lib/jquery-1.8.custom.js --js=src/content_scripts/decryptFrame.js --js=src/content_scripts/encryptFrame.js --js=src/content_scripts/main-cs.js --js_output_file=src/content_scripts/build/cs-mailvelope.min.js
	@echo Appending //@ sourceURL=cs-mailvelope.min.js...
	@echo '//@ sourceURL=cs-mailvelope.min.js' >> src/content_scripts/build/cs-mailvelope.min.js

minify: pack compile

