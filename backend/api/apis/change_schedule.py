## API to update market schedule

from flask import Blueprint, request, jsonify, session
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

## Change schedule
def change_schedule():
## Make sure user is 'admin' and logged in
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Admin access required"}), 403

    connection = get_connection()
    cursor = connection.cursor()

    if request.method == "GET":
        cursor.execute("SELECT date, is_market_open, day_type, holiday_name, open_time, close_time FROM market_calendar")
        calendar = cursor.fetchall()
        connection.close()

        ## Convert open_time and close_time
        calendar = [
            {
                "date": r["date"].strftime("%Y-%m-%d"),
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
    holiday_name = admin_input.get('holiday_name', '')
    open_time = admin_input.get('open_time', '09:30:00')
    close_time = admin_input.get('close_time', '16:00:00')

    ## Closed day: clear hours, keep holiday name
    if int(is_open) == 0:
        open_time = "00:00:00"
        close_time = "00:00:00"
        if not holiday_name:
            holiday_name = "N/A"

    ## Open day: clear holiday name, restore default hours if needed
    if int(is_open) == 1:
        holiday_name = "N/A"
        if not open_time or open_time == "00:00:00":
            open_time = "09:30:00"
        if not close_time or close_time == "00:00:00":
            close_time = "16:00:00"

    cursor.execute(
        "UPDATE market_calendar SET is_market_open = %s, holiday_name = %s, open_time = %s, close_time = %s WHERE date = %s",
        (is_open, holiday_name, open_time, close_time, date)
    )

    connection.close()

    ## Confirmation message
    return jsonify({
        'success': True,
        'message': f'Schedule has been updated.'
    })