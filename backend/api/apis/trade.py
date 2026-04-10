## API to handle buy, sell, and cancel orders
from flask import Blueprint, request, jsonify, session
from db_connection import get_connection

trade_bp = Blueprint('trade', __name__)

## Buy order
@trade_bp.route('/api/buy', methods=['POST'])
def buy():
## Make sure user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json()
    stock_id = data.get('stock_id')
    quantity = int(data.get('quantity'))
    price = float(data.get('price'))

## Requires all fields
    if not all([stock_id, quantity, price]):
        return jsonify({"success": False, "message": "stock_id, quantity, and price are required"}), 400
    
## Qty and price must be greater than 0
    if quantity <= 0 or price <= 0:
        return jsonify({"success": False, "message": "Quantity and price must be greater than 0"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
## Get current stock price
        cursor.execute("SELECT curr_price FROM stock WHERE stock_id = %s", (stock_id,))
        stock = cursor.fetchone()

        if not stock:
            return jsonify({"success": False, "message": "Stock not found"}), 404

        curr_price = float(stock['curr_price'])
        total_cost = quantity * price

## Check available balance
        cursor.execute("SELECT avail_balance FROM account WHERE user_id = %s", (session['user_id'],))
        account = cursor.fetchone()

        if account['avail_balance'] < total_cost:
            return jsonify({"success": False, "message": "Insufficient funds"}), 400

## Default status is completed, set to pending if price is below market price
        if price < curr_price:
            status = 'pending'
        else:
            status = 'completed'

## Add transaction into order table
        cursor.execute(
            "INSERT INTO `order` (user_id, stock_id, order_type, quantity, status, price_at_order) VALUES (%s, %s, %s, %s, %s, %s)",
            (session['user_id'], stock_id, 0, quantity, status, price)
        )

## If successful reduce balance and update holdings
        if status == 'completed':
            cursor.execute(
                "UPDATE account SET avail_balance = avail_balance - %s WHERE user_id = %s",
                (total_cost, session['user_id'])
            )

## Check if stock already in portfolio
            cursor.execute(
                "SELECT holdings_id, shares_owned FROM portfolio WHERE user_id = %s AND stock_id = %s",
                (session['user_id'], stock_id)
            )
            holding = cursor.fetchone()

            if holding:
                cursor.execute(
                    "UPDATE portfolio SET shares_owned = shares_owned + %s WHERE holdings_id = %s",
                    (quantity, holding['holdings_id'])
                )
            else:
                cursor.execute(
                    "INSERT INTO portfolio (user_id, stock_id, shares_owned) VALUES (%s, %s, %s)",
                    (session['user_id'], stock_id, quantity)
                )

        return jsonify({"success": True, "message": f"Buy order {status}", "status": status, "total_cost": float(total_cost)}), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


## Sell order
@trade_bp.route('/api/sell', methods=['POST'])
def sell():

## Make sure user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json()
    stock_id = data.get('stock_id')
    quantity = int(data.get('quantity'))
    price = float(data.get('price'))

## Require all fields
    if not all([stock_id, quantity, price]):
        return jsonify({"success": False, "message": "stock_id, quantity, and price are required"}), 400

## Qty and price must be greater than 0
    if quantity <= 0 or price <= 0:
        return jsonify({"success": False, "message": "Quantity and price must be greater than 0"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
## Get current stock price
        cursor.execute("SELECT curr_price FROM stock WHERE stock_id = %s", (stock_id,))
        stock = cursor.fetchone()

        if not stock:
            return jsonify({"success": False, "message": "Stock not found"}), 404

        curr_price = float(stock['curr_price'])

## Check available holdings
        cursor.execute(
            "SELECT holdings_id, shares_owned FROM portfolio WHERE user_id = %s AND stock_id = %s",
            (session['user_id'], stock_id)
        )
        holding = cursor.fetchone()

        if not holding or holding['shares_owned'] < quantity:
            return jsonify({"success": False, "message": "Insufficient holdings"}), 400

        total_value = quantity * price

## Default status is completed, set to pending if price is above market price
        if price > curr_price:
            status = 'pending'
        else:
            status = 'completed'

## Save transaction to order table
        cursor.execute(
            "INSERT INTO `order` (user_id, stock_id, order_type, quantity, status, price_at_order) VALUES (%s, %s, %s, %s, %s, %s)",
            (session['user_id'], stock_id, 1, quantity, status, price)
        )

## If successful decrease holdings and add to balance
        if status == 'completed':
            if holding['shares_owned'] == quantity:
                cursor.execute(
                    "DELETE FROM portfolio WHERE holdings_id = %s",
                    (holding['holdings_id'],)
                )
            else:
                cursor.execute(
                    "UPDATE portfolio SET shares_owned = shares_owned - %s WHERE holdings_id = %s",
                    (quantity, holding['holdings_id'])
                )

            cursor.execute(
                "UPDATE account SET avail_balance = avail_balance + %s WHERE user_id = %s",
                (total_value, session['user_id'])
            )

        return jsonify({"success": True, "message": f"Sell order {status}", "status": status, "total_value": float(total_value)}), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


## Cancel order
@trade_bp.route('/api/cancel_order', methods=['POST'])
def cancel_order():

## Make sure user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json()
    order_id = data.get('order_id')

## order_id is required
    if not order_id:
        return jsonify({"success": False, "message": "order_id is required"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
## Get the order and confirm it belongs to this user
        cursor.execute(
            "SELECT * FROM `order` WHERE order_id = %s AND user_id = %s",
            (order_id, session['user_id'])
        )
        order = cursor.fetchone()

        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        if order['status'] != 'pending':
            return jsonify({"success": False, "message": "Only pending orders can be cancelled"}), 400

        cursor.execute(
            "UPDATE `order` SET status = 'cancelled' WHERE order_id = %s",
            (order_id,)
        )

        return jsonify({"success": True, "message": "Order cancelled successfully"}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()