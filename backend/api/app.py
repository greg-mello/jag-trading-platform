from flask import Flask, jsonify
from apis.list_prices import list_prices_bp
from apis.add_stock import add_stock_bp

app = Flask(__name__)

app.register_blueprint(list_prices_bp)

app.register_blueprint(add_stock_bp)

if __name__ == '__main__':
    app.run(debug=True)
