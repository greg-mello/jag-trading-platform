## API to register a new user

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from db_connection import get_connection

register_bp = Blueprint('register', __name__)

@register_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    first_name = data.get('first_name')
    last_name = data.get('last_name')
    user_name = data.get('user_name')
    email_address = data.get('email_address')
    password = data.get('password')

    if not all([first_name, last_name, user_name, email_address, password]):
        return jsonify({"success": False, "message": "All fields are required"}), 400

    password_hash = generate_password_hash(password)

    conn = get_connection()
    cursor = conn.cursor()

## Check if username or email is already in use
    ## Check if username or email already exists
    ## Check if username or email already exists
## Check if username or email already exists
    cursor.execute("SELECT user_name, email_address FROM user WHERE user_name = %s OR email_address = %s",
        (user_name, email_address))
    existing = cursor.fetchone()

    if existing:
        if existing['user_name'] == user_name:
            return jsonify({"success": False, "message": "Account already exists. Please log in."}), 409
        else:
            return jsonify({"success": False, "message": "Account already exists. Please log in."}), 409

    try:
        cursor.execute(
            "INSERT INTO user (first_name, last_name, user_name, email_address, password) VALUES (%s, %s, %s, %s, %s)",
            (first_name, last_name, user_name, email_address, password_hash)
        )
        user_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO account (user_id, avail_balance) VALUES (%s, %s)",
            (user_id, 0.00)
        )

        conn.commit()
        return jsonify({"success": True, "message": f"Account created for {user_name}"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()