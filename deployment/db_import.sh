#!/bin/bash
# Auto-import new database backups from db_imports directory

# Load environment variables
source /srv/group-project/.env

IMPORT_DIR="/srv/group-project/db_imports"
PROCESSED_DIR="/srv/group-project/db_imports/processed"
DB_NAME="${DB_NAME}"
DB_USER="${DB_IMPORT_USER}"
DB_PASS="${DB_IMPORT_PASS}"

# Create processed directory if it doesn't exist
mkdir -p $PROCESSED_DIR

# Loop through any new .gz files in the import directory
for FILE in $IMPORT_DIR/*.sql.gz; do
    # Skip if no files found
    [ -e "$FILE" ] || continue

    echo "Importing $FILE"

    # Decompress and import
    gunzip -c $FILE | mysql -u $DB_USER -p$DB_PASS $DB_NAME

    if [ $? -eq 0 ]; then
        echo "Successfully imported $FILE"
        mv $FILE $PROCESSED_DIR/
    else
        echo "Failed to import $FILE"
    fi
done
