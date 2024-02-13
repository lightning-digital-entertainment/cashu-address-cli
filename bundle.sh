#!/bin/sh

mkdir tmp
node build.js
node --experimental-sea-config sea-config.json
mv ./sea-prep.blob ./tmp/sea-prep.blob
sudo cp $(command -v node) ca-cli
codesign --remove-signature ca-cli
sudo npx postject ca-cli NODE_SEA_BLOB ./tmp/sea-prep.blob \
	--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
	--macho-segment-name NODE_SEA
codesign --sign - ca-cli
rm -rf ./tmp/
