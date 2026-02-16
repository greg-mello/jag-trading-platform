from flask import Flask, jsonify
from apis.list_prices import list_prices_bp
from apis.add_stock import add_stock_bp
from apis.change_hours import change_hours_bp
from apis.change_schedule import change_schedule_bp

app = Flask(__name__)

## Show all stocks and prices
app.register_blueprint(list_prices_bp)

## Add a new stock to the database
app.register_blueprint(add_stock_bp)

## Change business hours
app.register_blueprint(change_hours_bp)

## Change schedule
app.register_blueprint(change_schedule_bp)

if __name__ == '__main__':
    app.run(debug=True)
