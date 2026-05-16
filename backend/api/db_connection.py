## Create a module to import in APIs for database connection

import pymysql
import pymysql.cursors
import os

## Connect to the database
def get_connection():
    return pymysql.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASS'),
        database=os.environ.get('DB_NAME'),

        ## Returns results as a dictionary
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )
