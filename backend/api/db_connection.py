## Create a module to import in APIs for database connection

import pymysql
import pymysql.cursors

## Connect to the databse
def get_connection():
    return pymysql.connect(
        host='localhost',
        user='tradingapp',
        password='tradingpass123',
        database='trading_platform',
        
        ## Returns results as a dictionary
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

