#!/bin/sh

# based on https://github.com/toberndo/mailvelope

NOW="$(date "+%Y%m%d-%H%M%S")"

echo Make a fresh and shallow clone of Mailvelope with all dependencies from git and compile
echo Create a backup of local repositories in mailvelope-$NOW.tgz
tar -czf mailvelope-$NOW.tgz mailvelope addon-sdk

rm -r mailvelope addon-sdk

git clone --depth 1 git://github.com/toberndo/mailvelope.git
cd mailvelope
git submodule init
git submodule update
make build

cd ..
git clone --depth 1 git://github.com/mozilla/addon-sdk.git
cd addon-sdk
source bin/activate

cd ../mailvelope
make dist-ff
