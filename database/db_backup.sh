#!/bin/bash
# JAG Trading Platform - Database Backup Script
# Used during development to backup the local database and transfer to AWS runtime server.
# Configure the variables below before use.

BACKUP_DIR="/var/backups/mysql"
DB_NAME="trading_platform"
DB_USER="your_db_user"
DB_PASS="your_db_password"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"
PEM_KEY="/path/to/your/keypair.pem"
AWS_USER="ubuntu"
AWS_HOST="your_aws_ip"
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
