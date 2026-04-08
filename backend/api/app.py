from flask import Flask, jsonify, send_from_directory
import os
from apis.list_prices import list_prices_bp
from apis.add_stock import add_stock_bp
from apis.change_hours import change_hours_bp
from apis.change_schedule import change_schedule_bp
from apis.register import register_bp
from apis.login import login_bp
from apis.logout import logout_bp
from apis.bank import bank_bp

app = Flask(__name__)
app.secret_key = 'gfCBds65sTd8gs$'

## Show all stocks and prices
app.register_blueprint(list_prices_bp)
## Add a new stock to the database
app.register_blueprint(add_stock_bp)
## Change business hours
app.register_blueprint(change_hours_bp)
## Change schedule
app.register_blueprint(change_schedule_bp)
## Register new user
app.register_blueprint(register_bp)
## User login
app.register_blueprint(login_bp)
## User logout
app.register_blueprint(logout_bp)
## Balance, Deposit and Withdraw
app.register_blueprint(bank_bp)

## Serve static frontend files
@app.route('/')
def serve_index():
    return send_from_directory('/srv/group-project/web', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    web_dir = '/srv/group-project/web'
    if os.path.exists(os.path.join(web_dir, path)):
        return send_from_directory(web_dir, path)
    return jsonify({"error": "not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)
