## API to handle portfolio and transaction history
from flask import Blueprint, request, jsonify, session
from db_connection import get_connection

portfolio_bp = Blueprint('portfolio', __name__)

## Get user portfolio
@portfolio_bp.route('/api/portfolio', methods=['GET'])
def portfolio():
## Make sure user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT p.holdings_id, p.stock_id, s.ticker, s.company,
                   p.shares_owned, s.curr_price,
                   ROUND(p.shares_owned * s.curr_price, 2) AS total_value
            FROM portfolio p
            JOIN stock s ON p.stock_id = s.stock_id
            WHERE p.user_id = %s
        """, (session['user_id'],))

        holdings = cursor.fetchall()

## Convert decimals to float
        for h in holdings:
            h['curr_price'] = float(h['curr_price'])
            h['total_value'] = float(h['total_value'])

        return jsonify({"success": True, "portfolio": holdings}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


## Get transaction history
@portfolio_bp.route('/api/transaction_history', methods=['GET'])
def transaction_history():
## Make sure user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT o.order_id, o.stock_id, s.ticker, s.company,
                   o.order_type, o.quantity, o.status,
                   o.timestamp, o.price_at_order
            FROM `order` o
            JOIN stock s ON o.stock_id = s.stock_id
            WHERE o.user_id = %s
            ORDER BY o.timestamp DESC
        """, (session['user_id'],))

        orders = cursor.fetchall()

## Convert decimals, order_type and time
        for o in orders:
            o['price_at_order'] = float(o['price_at_order'])
            o['order_type'] = 'buy' if o['order_type'] == 0 else 'sell'
            o['timestamp'] = o['timestamp'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({"success": True, "transactions": orders}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()