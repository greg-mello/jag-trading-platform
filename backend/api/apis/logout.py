## API to log users out of their accounts

from flask import Blueprint, jsonify, session

logout_bp = Blueprint('logout', __name__)

@logout_bp.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200