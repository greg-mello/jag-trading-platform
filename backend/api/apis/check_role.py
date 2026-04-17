## Small API to allow the front end to check the role of the logged in user.

from flask import Blueprint, jsonify, session

check_role_bp = Blueprint('check_role', __name__)

@check_role_bp.route('/api/check_role', methods=['GET'])
def check_role():
    if 'user_id' not in session:
        return jsonify({"role": "guest"}), 200
    return jsonify({"role": session.get('role', 'user')}), 200