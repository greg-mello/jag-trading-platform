from flask import Blueprint, jsonify
from db_connection import get_connection

list_prices_bp = Blueprint("list_prices", __name__)

@list_prices_bp.route('/api/list_prices', methods=["GET"])
def list_prices():
	try:
		conn = get_connection()
		cursor = conn.cursor()

		cursor.execute("""
				 SELECT s.stock_id, s.ticker, s.company, s.curr_price, s.volume, s.market_cap,
				 		ph_open.price_at_recorded AS open_price,
				 		ph_agg.high,
				 		ph_agg.low
				 FROM stock s
				 LEFT JOIN (
				 	SELECT ph1.stock_id, ph1.price_at_recorded
				 	FROM price_history ph1
				 	INNER JOIN (
				 		SELECT stock_id, MIN(recorded_time) AS first_time
				 		FROM price_history
				 		WHERE DATE(recorded_time) = CURDATE()
				 		GROUP BY stock_id
				 	) ph2 ON ph1.stock_id = ph2.stock_id AND ph1.recorded_time = ph2.first_time
				 ) ph_open ON s.stock_id = ph_open.stock_id
				 LEFT JOIN (
				 	SELECT stock_id,
				 			MAX(price_at_recorded) AS high,
				 			MIN(price_at_recorded) AS low
				 	FROM price_history
				 	WHERE DATE(recorded_time) = CURDATE()
				 	GROUP BY stock_id
				 ) ph_agg ON s.stock_id = ph_agg.stock_id
		""")

		stocks = cursor.fetchall()
		cursor.close()
		conn.close()

		result = []
		for stock in stocks:
			curr = float(stock['curr_price'])
			result.append({
				"stock_id": stock['stock_id'],
				"ticker": stock['ticker'],
				"company": stock['company'],
				"curr_price": curr,
				"volume": stock['volume'],
				"market_cap": float(stock['market_cap']),
				"open_price": float(stock['open_price']) if stock['open_price'] is not None else curr,
				"high": float(stock['high']) if stock['high'] is not None else curr,
				"low": float(stock['low']) if stock['low'] is not None else curr
			})
		
		return jsonify(result), 200
	
	except Exception as e:
		return jsonify({"error": str(e)}), 500