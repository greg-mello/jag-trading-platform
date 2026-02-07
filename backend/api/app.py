from flask import Flask, jsonify
from apis.list_prices import list_prices_bp

app = Flask(__name__)

app.register_blueprint(list_prices_bp)

if __name__ == '__main__':
    app.run(debug=True)
