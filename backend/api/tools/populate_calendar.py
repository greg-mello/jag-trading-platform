## populate_calendar.py
from datetime import date, timedelta
from db_connection import get_connection

def populate_calendar(year):
    connection = get_connection()
    cursor = connection.cursor()
    
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    current_date = start_date
    
    while current_date <= end_date:
        # Determine day type
        weekday = current_date.weekday()  # 0=Monday, 6=Sunday
        
        if weekday < 5:  # Monday-Friday
            day_type = 'Weekday'
            is_open = 1
            open_time = '09:30:00'
            close_time = '16:00:00'
            holiday_name = 'N/A'
        else:  # Weekend
            day_type = 'Weekend'
            is_open = 0
            open_time = None
            close_time = None
            holiday_name = 'N/A'
        
        # Insert into database
        cursor.execute("""
            INSERT INTO market_calendar (date, is_market_open, day_type, holiday_name, open_time, close_time)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                is_market_open = VALUES(is_market_open),
                day_type = VALUES(day_type)
        """, (current_date, is_open, day_type, holiday_name, open_time, close_time))
        
        current_date += timedelta(days=1)
    
    connection.commit()
    connection.close()
    print(f"Calendar populated for {year}")

if __name__ == "__main__":
    populate_calendar(2026)