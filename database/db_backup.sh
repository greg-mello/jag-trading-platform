#!/bin/bash

# bash script to backup the trading_platform database

BACKUP_DIR="/var/backups/mysql"
DB_NAME="trading_platform"
DB_USER="tradingapp"
DB_PASS="tradingpass123"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"

#Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

#Dump database
mysqldump --no-tablespaces -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

#Compress the backup
gzip $BACKUP_FILE

echo "Database backup completed: ${BACKUP_FILE}.gz"