from flask import Flask, jsonify
import pymysql

app = Flask(__name__)

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'tradingapp',
    'password': 'tradingpass123',
    'database': 'trading_platform'
}

# Test endpoint
@app.route('/api/test')
def test():
    return jsonify({'message': 'Flask API is working!', 'status': 'success'})

# Test database connection
@app.route('/api/db-test')
def db_test():
    try:
        connection = pymysql.connect(**db_config)
        connection.close()
        return jsonify({'message': 'Database connection successful!', 'status': 'success'})
    except Exception as e:
        return jsonify({'message': f'Database error: {str(e)}', 'status': 'error'})

if __name__ == '__main__':
    app.run(debug=True)
