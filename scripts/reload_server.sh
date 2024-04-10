#!/bin/bash
cd /home/ubuntu/rp-api
ifconfig
uname -a
pm2 list
pm2 reload RP_API
