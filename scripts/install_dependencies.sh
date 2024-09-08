#!/bin/bash
cd /home/ubuntu/rp-api
sudo yarn


sudo pm2 describe RP_API 2>&1 /dev/null
RUNNING=$?


if [ "${RUNNING}" -eq 1 ]; then
sudo pm2 start build/src/app.js --name RP_API -i 2 --wait-ready --listen-timeout 10000
fi;
