## API to handle user balances, deposit and withdraw

from flask import Blueprint, request, jsonify, session
from db_connection import get_connection

bank_bp = Blueprint('bank', __name__)


## Deposit function
@bank_bp.route('/api/deposit', methods=['POST'])
def deposit():
## Make sure user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "You must log in to make a transaction"}), 401
    
    input = request.get_json()
    amount = input.get('amount')

## Make sure depost amount is valid
    if not amount or amount <= 0:
        return jsonify({"success": False, "message": "Invalid deposit amount"}), 400
    
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "UPDATE account SET avail_balance = avail_balance + %s WHERE user_id = %s",
            (amount, session['user_id'])
        )
        cursor.execute(
            "SELECT avail_balance FROM account WHERE user_id = %s",
            (session['user_id'],)
        )
        result = cursor.fetchone()
        return jsonify({"success": True, "message": "Deposit successful", "avail_balance": float(result['avail_balance'])}), 200

    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
## End DB connection
    finally:
        cursor.close()
        conn.close()


## Withdraw function
@bank_bp.route('/api/withdraw', methods=['POST'])
def withdraw():
## Make sure user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json()
    amount = data.get('amount')

# Make sure withdrawal amount is valid
    if not amount or amount <= 0:
        return jsonify({"success": False, "message": "Invalid withdrawal amount"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT avail_balance FROM account WHERE user_id = %s",
            (session['user_id'],)
        )
        result = cursor.fetchone()
## Make sure account has sufficient funds
        if result['avail_balance'] < amount:
            return jsonify({"success": False, "message": "Insufficient funds"}), 400

        cursor.execute(
            "UPDATE account SET avail_balance = avail_balance - %s WHERE user_id = %s",
            (amount, session['user_id'])
        )

        cursor.execute(
            "SELECT avail_balance FROM account WHERE user_id = %s",
            (session['user_id'],)
        )
        updated = cursor.fetchone()

        return jsonify({"success": True, "message": "Withdrawal successful", "avail_balance": float(updated['avail_balance'])}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()