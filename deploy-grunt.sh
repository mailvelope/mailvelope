#!/bin/bash

if [ $TRAVIS_PULL_REQUEST == "false" ] && [ $TRAVIS_BRANCH == "dev" ]; then
 grunt nightly
else
 grunt
fi

grunt dist-cr
grunt dist-ff
grunt dist-doc

if [ $TRAVIS_BRANCH != "master" ] || [ $TRAVIS_SECURE_ENV_VARS != "true" ]; then
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
 git add .
 git commit -m "Deployed to Github Pages"
 echo "Deploying to gh-pages now"
 git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1
)
