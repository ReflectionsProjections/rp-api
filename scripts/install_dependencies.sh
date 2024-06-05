#!/bin/bash
cd /home/ubuntu/rp-api
sudo yarn
sudo pm2 start app.js --name RP_API -i 2 --wait-ready --listen-timeout 10000
