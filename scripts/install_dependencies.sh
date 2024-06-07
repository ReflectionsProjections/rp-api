#!/bin/bash
cd /home/ubuntu/rp-api
sudo yarn

sudo pm2 describe appname 2>&1 /dev/null
RUNNING=$?


if [ "${RUNNING}" -eq 0 ]; then
sudo pm2 start build/app.js --name RP_API -i 2 --wait-ready --listen-timeout 10000
fi;
