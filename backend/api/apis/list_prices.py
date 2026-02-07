from flask import Blueprint, jsonify
from db_connection import get_connection

list_prices_bp = Blueprint("list_prices", __name__)

@list_prices_bp.route('/api/list_prices', methods=["GET"])
def list_prices():

	connection = get_connection()
	cursor = connection.cursor()

	cursor.execute("SELECT stock_id, ticker, curr_price FROM stock")
	stocks = cursor.fetchall()

	connection.close()

	stock_list = []
	for stock in stocks:
		stock_list.append({
			"stock_id": stock["stock_id"],
			"symbol": stock["ticker"],
			"current_price": float(stock["curr_price"])
		})
	
	return jsonify(stock_list)