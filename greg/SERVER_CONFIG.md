# IFT 401 Capstone Server Specs & Configuration

## Host Specifications
- **OS:** Ubuntu Server 24.04.3 LTS
- **MoBo:** MSI Z170A GAMING M5
- **CPU:** Intel Core i5-6600K
- **RAM:** 2 x 8GB DDR4 @ 3200 MHz
- **Hypervisor:** KVM w/ Virt-Manager
- **Storage:** Samsung 850 EVO (256 GB)

## VM Specifications
- **OS:** Ubuntu Server 24.04.3 LTS
- **CPU:** 2 Cores
- **RAM:** 6 GB
- **Disk:** 50 GB

---

## Launch – 1/14/2026

### INITIAL SETUP
Created the Ubuntu Server VM

- **Update packages**
  - Ran `sudo apt update && sudo apt upgrade`

- **Set correct time – group based out of EST**
  - Ran `sudo timedatectl set-timezone EST`

- **Added Users - assigned randomly generated alphanumeric passwords**
  - jose – 96it8wg8
  - arjie – 887idmo2

- **Set user accounts to force password change on next login**
  - Ran `sudo passwd -e username`

- **Created a shared project folder**
  - Ran `sudo mkdir -p /srv/group-project`

- **Created a new user group**
  - Ran `sudo groupadd projectgroup`

- **Added users to the new group**
  - Ran `sudo usermod -aG projectgroup username`

- **Change group owner**
  - Ran `sudo chown -R root:projectgroup /srv/group-project`

- **Give group read/write/execute permissions**
  - Ran `sudo chmod -R 2775 /srv/group-project`

---

## 1/15/2026

- **Adjusted time zone settings to accommodate daylight savings settings**
  - Ran `sudo timedatectl set-timezone America/New_York`

- **Installed tailscale**

- **Created github repo and invited team members**
  - Gmello1987/ift401

- **Installed xfce4**

- **Installed xrdp**

- **Sent tailscale invites to users**

- **Installed VSCode**

- **Confirmed python is installed**


### WEBSERVER

- **Installed Apache2**
  - Configured Apache to serve the website that will be stored in `/srv/group-project/web`
  - Created a test html file in `/srv/group-project/web` and confirmed it is accessible at the tailscale IP `http://100.72.22.18` from any machine running tailscale
  - *Can configure `tailscale funnel` to make the site safely accessible externally*

### DATABASE

- **Installed MySQL**
  - Ran `sudo mysql_secure_installation` to secure the fresh MySQL install
  - Ran MySQL and set a new root password `groupproject1234` using `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'groupproject1234'; FLUSH PRIVILEGES;`
  - Created the database `trading_platform`
  - Created the non-root user `tradingapp` with password `tradingpass123`
  - Assigned database access permission to `tradingapp`: `GRANT ALL PRIVILEGES ON trading_platform.* TO 'tradingapp'@'localhost';`

- **Installed phpMyAdmin for web-based database management**
  - `sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl -y`
  - phpMyAdmin created a database for preferences etc at `/usr/share/doc/phpmyadmin`

- **Installed libpache2-mod-php8.3**
  - necessary for Apache to work with phpMyAdmin

**To connect to the database from the server command prompt:**
- Run `mysql -u tradingapp -p` and enter password `tradingpass123`

**To connect to the database from phpMyAdmin:**
- Website on PC with tailscale active go to `http://100.72.22.18/phpmyadmin`
- Username: `tradingapp`
- Password: `tradingpass123`

### BACKUPS

- **Created full VM backup**
  - stored on host machine at /plex/Project-Server-Backups/

- **Configured autmatic backups of /srv/group-project folder**
  - created script for backup at /usr/local/bin/backup-project.sh
  - configured cron job to run daily at 5:00 AM
  - saves to /var/backups/group-project/
  - keeps backups for 7 days then automatically deletes oldest backup
  - backup logs kept at /var/log/backup-project.log

---

## 1/17/2026

- **Adjusted MySQL to work with MySQL workbench**
  - changed bind-address from 127.0.0.1 to 0.0.0.0 in mysqld.conf
  - made second ruleset for USER:tradingapp
  - MySQL now listens on port 3306

- **Setup Node.js**
  - installed node.js
  - installed express
  - installed mysql2 to connect with database
  - installs cors to communicate with frontend
  - installed body-parser for processing JSON data in requests
  - installed pm2 to keep node.js running at all times
    **will create a systemd service later for this task**
  
- **Configure reverse proxy for frontend/backend communication**
  - enabled apache modules a2enmod proxy and a2enmod proxy_http


---

## 1/19/2026

## Backend Changes

- **Changed from Node.js to python**
  - Uninstalled Node.js, npm, and pm2
  - Removed npm packages
  - Removed Apache reverse proxy config (not needed for python)
  - Disabled Apache proxy modules (proxy, proxy_http)

- **Configured Python/Flask**
  - Installed Flask `sudo apt install python3-flask python3-pymysql`
  - Installed mod_wsgi `sudo apt install libapache2-mod-wsgi-py3`
  - Enabled wsgi module in Apache
  - Created Flask application at `/srv/group-project/backend/app.py`
  - Created WSGI entry point at `/srv/group-project/backend/app.wsgi`
  - Configured Apache to serve Flask app via mod_wsgi
  - Tested Flask and MySQL API endpoints succesfuly
      `Flask - http://100.72.22.18/api/test` 
      `MySQL - http://100.72.22.18/api/db-test`

- **Full VM Image Backup**
  - Full backup to /plex/Project-Server-Backups

- **Git Setup**
  - Went through initial git setup
  - `git init` in /srv/group-project
  - Created `/srv/group-project/git.ignore`
  - Ran initial git add and commit
  - Added user and email for git tracking
    - have all team members run these 2 commands with name and email.
    - `git config --global user.name "FirstName"`
    - `git config --global user.email "FirstName@local"`
  - Linked git repo to github @ `https://github.com/gmello1987/ift401.git`
  - Generated token and saved to keyring

- **Adjusted Folder and App Permissions**
  - Changed owner of `/srv/group-project` to greg from root
  - Added MySQL and Apcache to group:`group-project`
    * Avoides read/write issues in the future


## To Do
- Link git repo to git.hub
- Cronjob for git repo backup before each push
- use systemd to auto start flask when system starts
- work on database specific backups


## Group ideas
- encryption of senstitive fake data in database
- let arjie know about about python backend
- talk to the group about names that will be used for different things need to be implemented in various places i.e table names, functions, requests

## Git Guide
  - Create a branch with `git checkout -b yourname-feature`
  - Add changes `git add <file-or-folder>`
  - Commit changes `git commit -m "description of what was done"`
  - Pull latest changes from master `git checkout master` -> `git pull`
  - Merge branch with master `git checkout master` -> `git merge yourname-feature`
  - Check status `git status`
  