#!/bin/bash
cd /srv/group-project
git fetch origin
git reset --hard origin/main
sudo systemctl restart apache2
echo "Deployed from GitHub and restarted Apache"
