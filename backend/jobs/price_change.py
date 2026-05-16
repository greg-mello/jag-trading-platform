##Python program to update stock prices every hour during market sessions
##Checks time and day to ensure updates only happen during market sessions
##Fetches stock_id, ticker, curr_price from Stocks

import random
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from db_connection import get_connection


##Check if market is in session
def is_market_open():
    curr_datetime = datetime.now()

    ##Check day of week
    if curr_datetime.weekday() > 4:
        return False
    
    ##Check time
    session_open = curr_datetime.replace(hour=9, minute=30, second=0, microsecond=0)
    session_close = curr_datetime.replace(hour=16, minute=0, second=0, microsecond=0)
    return session_open <= curr_datetime <= session_close

##Update stock prices
def update_prices():
    if not is_market_open():
        print(f"Market is closed, prices will not be updated.")
        return

    connection = get_connection()
    cursor = connection.cursor()

    ##Retrieve all stocks
    cursor.execute("SELECT stock_id, ticker, curr_price FROM stock")
    stocks = cursor.fetchall()

    print(f"Updated {len(stocks)} at {datetime.now()}")

    for stock in stocks:
        stock_id = stock['stock_id']
        symbol = stock['ticker']
        current_price = float(stock['curr_price'])

        ##Generate a random change value from -1.5% to +1.5% in range from .01 to 1.5
        ##Randomly decide if its a poitive or negative price change
        percent_change = random.uniform(.01, 1.5)
        if random.choice([True, False]):
            percent_change = -percent_change

        price_change = current_price * (percent_change / 100)
        new_price = current_price + price_change

        ##Prevent value < $00.01
        if new_price < 0.01:
            new_price = 0.01

        ##Format to 2 decimals
        new_price = round(new_price, 2)

        ##Write changes to price_history table
        cursor.execute(
            "INSERT INTO price_history (stock_id, price_at_recorded, recorded_time) VALUES (%s, %s, NOW())",
            (stock_id, new_price)
        )

        ##Write price update to stock table
        cursor.execute(
            "UPDATE stock SET curr_price = %s WHERE stock_id = %s",
            (new_price, stock_id)
        )
        print(f"{symbol}: ${current_price:.2f} -> ${new_price:.2f} ({percent_change:+.2f}%)")
    connection.commit()
    connection.close()
    print("Price update complete.")
##Execute the program
if __name__ == "__main__":
    update_prices()

        
    
