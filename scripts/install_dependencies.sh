#!/bin/bash
cd /home/ubuntu/rp-api
sudo yarn


sudo pm2 describe RP_API 2>&1 /dev/null
RUNNING=$?

if [ "${RUNNING}" -eq 1 ]; then
mkdir -p logs
sudo pm2 start ecosystem.config.js
fi;
