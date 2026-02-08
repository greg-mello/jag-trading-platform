## API to add stocks to the database

from flask import Blueprint, request, jsonify
import pymysql
from datetime import datetime
from db_connection import get_connection

add_stock_bp = Blueprint("add_stock", __name__)

@add_stock_bp.route('/api/add_stock', methods=['GET', 'POST'])

## Add a stock 
def add_stock():
    if request.method == 'GET':
        return jsonify({
            'message': 'This endpoint if for adding stocks to the database.',
            'required_fields': ['ticker', 'company', 'init_price', 'volume'],
            'example': {
                'ticker': 'AAPL',
                'company': 'Apple Inc',
                'init_price': 150.00,
                'volume': 1000000000
            }
        })

    ## Stock details from front end
    admin_input = request.get_json()
    ticker = admin_input['ticker']
    company = admin_input['company']
    init_price = float(admin_input['init_price'])
    volume = int(admin_input['volume'])

    ## Set curr_price to match init_price
    curr_price = init_price

    ## Calculate market cap
    market_cap = volume * curr_price

    ## Connect to DB and INSERT stock
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "INSERT INTO stock (ticker, company, init_price, curr_price, volume, market_cap) VALUES (%s, %s, %s, %s, %s, %s)",
        (ticker, company, init_price, curr_price, volume, market_cap)
    )

    connection.commit()
    connection.close()

    ## Confirmation message
    return jsonify({
        'success': True,
        'message': f'Added {ticker} - {company}',
        'market_cap': market_cap
    })
