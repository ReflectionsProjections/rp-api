#!/bin/bash
cd /home/ubuntu/rp-api
sudo yarn
if (($(sudo pm2 list | grep -c "RP_API" | grep -v :0) == 0));
then
sudo pm2 start build/app.js --name RP_API -i 2 --wait-ready --listen-timeout 10000
fi;
