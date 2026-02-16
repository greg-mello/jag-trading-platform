## API to update market hours 

from flask import Blueprint, request, jsonify
import pymysql
from datetime import datetime, timedelta
from db_connection import get_connection

change_schedule_bp = Blueprint("change_schedule", __name__)

## Convert from timedelta
def json_time(x):
    if isinstance(x, timedelta):
        total = int(x.total_seconds())
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        return f"{h:02d}:{m:02d}:{s:02d}"
    return x

@change_schedule_bp.route('/api/change_schedule', methods=["GET", "POST"])

## Change hours
def change_schedule():

    connection = get_connection()
    cursor = connection.cursor()

    if request.method == "GET":
        cursor.execute("SELECT date, is_market_open, day_type, holiday_name, open_time, close_time FROM market_calendar")
        calendar = cursor.fetchall()
        connection.close()

        ## Convert open_time and close_time 
        calendar = [
            {
                "date": r["date"],
                "is_market_open": r["is_market_open"],
                "day_type": r["day_type"],
                "holiday_name": r["holiday_name"],
                "open_time": json_time(r["open_time"]),
                "close_time": json_time(r["close_time"]),
            }
            for r in calendar
        ]

        return jsonify({
            'success': True,
            'schedule': calendar
        })

    ## Add schedule details from input
    admin_input = request.get_json()
    date = admin_input['date']
    is_open = admin_input['is_market_open']
    day_type = admin_input['day_type']
    holiday_name = admin_input['holiday_name']
    open_time = admin_input['open_time']
    close_time = admin_input['close_time']

    cursor.execute(
        "UPDATE market_calendar SET is_market_open = %s, holiday_name = %s, open_time = %s, close_time = %s WHERE date = %s",
        (is_open, holiday_name, open_time, close_time, date)
    )

    connection.commit()
    connection.close()

    ## Confirmation message
    return jsonify({
        'success': True,
        'message': f'Schedule has been updated.'
    })
