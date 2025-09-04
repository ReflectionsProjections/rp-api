#!/bin/bash
cd /home/ubuntu/rp-api
sudo yarn

# Load configuration json into cloudwatch agent & restart cloudwatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/home/ubuntu/rp-api/cloudwatch-agent-config.json
sudo systemctl restart amazon-cloudwatch-agent.service

# Check if pm2 RP_API running
sudo pm2 describe RP_API 2>&1 /dev/null
RUNNING=$?

# If not running, start
if [ "${RUNNING}" -eq 1 ]; then
mkdir -p logs
sudo pm2 start ecosystem.config.cjs
fi;
