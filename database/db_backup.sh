#!/bin/bash
# bash script to backup the trading_platform database and transfer to AWS
BACKUP_DIR="/var/backups/mysql"
DB_NAME="trading_platform"
DB_USER="tradingapp"
DB_PASS="tradingpass123"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"
PEM_KEY="/srv/group-project/greg/jagkp.pem"
AWS_USER="ubuntu"
AWS_HOST="34.233.94.216"
AWS_DEST="/srv/group-project/db_imports"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Dump database
mysqldump --no-tablespaces -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

echo "Database backup completed: ${BACKUP_FILE}.gz"

# Transfer to AWS
scp -i $PEM_KEY ${BACKUP_FILE}.gz $AWS_USER@$AWS_HOST:$AWS_DEST

if [ $? -eq 0 ]; then
    echo "Backup successfully transferred to AWS"
else
    echo "Transfer to AWS failed"
fi