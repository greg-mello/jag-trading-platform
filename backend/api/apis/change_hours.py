## API to update market hours 

from flask import Blueprint, request, jsonify
import pymysql
from datetime import datetime
from db_connection import get_connection

change_hours_bp = Blueprint("change_hours", __name__)

@change_hours_bp.route('/api/change_hours', methods=["GET", "POST"])

## Change hours
def change_hours():

    connection = get_connection()
    cursor = connection.cursor()

    if request.method == "GET":
        cursor.execute("SELECT date, is_market_open, day_type, holiday_name, open_time, close_time FROM market_calendar")
        calendar = cursor.fetchall()
        connection.close()
        return jsonify({
            'success': True,
            'schedule': calendar
        })

    ## Add schedule details from input
    admin_input = request.get_json()
    date = admin_input['date']
    open_time = admin_input['open_time']
    close_time = admin_input['close_time']

    cursor.execute(
        "UPDATE market_calendar SET open_time = %s, close_time = %s WHERE date = %s",
        (open_time, close_time, date)
    )

    connection.commit()
    connection.close()

    ## Confirmation message
    return jsonify({
        'success': True,
        'message': f'New hours for {date}: {open_time} - {close_time}'
    })
