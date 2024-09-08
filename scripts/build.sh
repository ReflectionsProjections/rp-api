#!/bin/bash
cd /home/ubuntu/rp-api
sudo rm -fr build
export NODE_OPTIONS="--max-old-space-size=8192"
yarn build


