## API to login to platform

from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from db_connection import get_connection

login_bp = Blueprint('login', __name__)

@login_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    user_name = data.get('user_name')
    password = data.get('password')

    if not all([user_name, password]):
        return jsonify({"success": False, "message": "Username and password are required."}), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT user_id, user_name, role, password FROM user WHERE user_name = %s",
            (user_name,)
        )
        user = cursor.fetchone()

        if user is None or not check_password_hash(user['password'], password):
            return jsonify({"success": False, "message": "Your username or password is incorrect."}), 401

        session['user_id'] = user['user_id']
        session['user_name'] = user['user_name']
        session['role'] = user['role']

        return jsonify({"success": True, "message": f"Welcome {user['user_name']}", "role": user['role']}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()