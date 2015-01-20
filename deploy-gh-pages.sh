#!/bin/bash

if [ $TRAVIS_BRANCH -ne "master" ] || [ $TRAVIS_SECURE_ENV_VARS -ne "true" ]; then
 echo "Not building on master branch or building a pull request -> not updating gh-pages";
 exit 0;
fi

rm -rf out || exit 0;
mkdir out;
( cd out
 git init
 git config user.name "Travis-CI"
 git config user.email "travis@travis-ci.org"
 cp -R ../build/doc/* .
 git commit -am "Deployed to Github Pages"
 git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1
)
