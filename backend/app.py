# backend/app.py
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS # Import CORS for development if your frontend is on a different port

app = Flask(__name__, static_folder='../frontend/build') # Point to the build directory of your React app
CORS(app) # Enable CORS for all routes (useful during development)

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """
    Serves the React frontend application.
    For any path not explicitly defined by Flask, it attempts to serve
    a file from the 'frontend/build' directory. If the path is empty
    or refers to the root, it serves 'index.html'.
    """
    if path != "" and app.static_folder is not None:
        return send_from_directory(app.static_folder, path)
    elif app.static_folder is not None:
        return send_from_directory(app.static_folder, 'index.html')
    else:
        # Fallback if static_folder is not set (should not happen with current setup)
        return "Error: Frontend build directory not found.", 500

# Example API route (optional, for demonstration)
@app.route('/api/data')
def get_data():
    """
    An example API endpoint that returns some JSON data.
    You can expand this to serve your budget, spending, and income data.
    """
    return jsonify({
        "message": "Data from Flask backend!",
        "budget": {
            "income": 3000,
            "expenses": 2000,
            "remaining": 1000
        },
        "spending": [
            {"category": "Groceries", "amount": 150},
            {"category": "Entertainment", "amount": 80},
            {"category": "Utilities", "amount": 120}
        ],
        "income": [
            {"source": "Salary", "amount": 2500},
            {"source": "Freelance", "amount": 500}
        ]
    })

if __name__ == '__main__':
    # In a production environment, you would typically use a WSGI server like Gunicorn.
    # For development, you can run it directly.
    app.run(debug=True, port=5000)
