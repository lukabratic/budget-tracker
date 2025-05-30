# backend/app.py
from flask import Flask, send_from_directory, jsonify, request, g
from flask_cors import CORS
import pandas as pd
import sqlite3
import io
import os

app = Flask(__name__, static_folder='../frontend/build')
CORS(app) # Enable CORS for all routes (useful during development)

DATABASE = 'budget.db'

# --- Database Setup Functions ---
def get_db():
    """Establishes a database connection or returns the existing one."""
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row # Allows accessing columns by name
    return g.db

def close_db(e=None):
    """Closes the database connection."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initializes the database schema."""
    with app.app_context(): # Ensures we're in the app context to use get_db
        db = get_db()
        cursor = db.cursor()

        # Create Spending table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS spending (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_used TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                category TEXT,
                amount REAL NOT NULL
            );
        ''')

        # Create Income table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS income (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                source TEXT NOT NULL,
                net_income REAL NOT NULL
            );
        ''')
        db.commit()
    print("Database initialized successfully.")

# Register the close_db function to be called after each request
app.teardown_appcontext(close_db)

# Call init_db when the application starts
with app.app_context():
    init_db()


# --- API Routes for Uploads ---

@app.route('/api/upload/spending', methods=['POST'])
def upload_spending():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        try:
            # Read Excel file into pandas DataFrame
            df = pd.read_excel(io.BytesIO(file.read()))

            # Validate columns (case-insensitive for robustness)
            required_cols = ['Card Used', 'Date', 'Description', 'Category', 'Amount']
            df_cols_lower = [col.lower() for col in df.columns]

            for col in required_cols:
                if col.lower() not in df_cols_lower:
                    return jsonify({'error': f'Missing required column: "{col}"'}), 400

            # Map DataFrame columns to database columns (handling case variations)
            col_map = {
                'card used': 'card_used',
                'date': 'date',
                'description': 'description',
                'category': 'category',
                'amount': 'amount'
            }
            # Rename DataFrame columns to match database schema for easier insertion
            # Only rename columns that exist in the DataFrame and are in our map
            df.columns = [col_map.get(col.lower(), col) for col in df.columns]


            db = get_db()
            cursor = db.cursor()

            # --- IMPORTANT CHANGE: Delete existing spending data before inserting new ---
            cursor.execute("DELETE FROM spending;")
            db.commit() # Commit the deletion immediately

            inserted_count = 0

            # Ensure only relevant columns are selected for insertion
            cols_to_insert = ['card_used', 'date', 'description', 'category', 'amount']
            # Filter df to only include columns we want to insert and ensure order
            df_filtered = df[[col for col in cols_to_insert if col in df.columns]]


            for index, row in df_filtered.iterrows():
                try:
                    # Basic type conversion/validation before insertion
                    # Ensure all required fields are present before trying to convert
                    if not all(col in row for col in cols_to_insert):
                        print(f"Skipping row {index} due to missing data: {row.to_dict()}")
                        continue

                    card_used = str(row['card_used'])
                    date_val = str(row['date']) # Store as TEXT, can parse to datetime later if needed
                    description = str(row['description']) if pd.notna(row['description']) else None
                    category = str(row['category']) if pd.notna(row['category']) else None
                    amount = float(row['amount'])

                    cursor.execute(
                        "INSERT INTO spending (card_used, date, description, category, amount) VALUES (?, ?, ?, ?, ?)",
                        (card_used, date_val, description, category, amount)
                    )
                    inserted_count += 1
                except ValueError as ve:
                    print(f"Data type error in row {index}: {ve} - Data: {row.to_dict()}")
                    # Consider adding this row to a list of failed rows to return to user
                except Exception as row_err:
                    print(f"Error inserting row {index}: {row_err} - Data: {row.to_dict()}")
                    # Optionally, log or collect errors for a detailed response

            db.commit()
            return jsonify({'message': f'Spending data uploaded and stored successfully. {inserted_count} rows inserted.'}), 200

        except pd.errors.EmptyDataError:
            return jsonify({'error': 'The uploaded Excel file is empty.'}), 400
        except pd.errors.ParserError:
            return jsonify({'error': 'Could not parse Excel file. Ensure it is a valid .xls or .xlsx format.'}), 400
        except Exception as e:
            print(f"Server error during spending upload: {e}")
            return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500
    return jsonify({'error': 'Something went wrong with the file upload.'}), 500


@app.route('/api/upload/income', methods=['POST'])
def upload_income():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        try:
            df = pd.read_excel(io.BytesIO(file.read()))

            required_cols = ['Date', 'Source', 'Net Income']
            df_cols_lower = [col.lower() for col in df.columns]

            for col in required_cols:
                if col.lower() not in df_cols_lower:
                    return jsonify({'error': f'Missing required column: "{col}"'}), 400

            col_map = {
                'date': 'date',
                'source': 'source',
                'net income': 'net_income'
            }
            df.columns = [col_map.get(col.lower(), col) for col in df.columns]

            db = get_db()
            cursor = db.cursor()

            # --- IMPORTANT CHANGE: Delete existing income data before inserting new ---
            cursor.execute("DELETE FROM income;")
            db.commit() # Commit the deletion immediately

            inserted_count = 0

            cols_to_insert = ['date', 'source', 'net_income']
            df_filtered = df[[col for col in cols_to_insert if col in df.columns]]

            for index, row in df_filtered.iterrows():
                try:
                    if not all(col in row for col in cols_to_insert):
                        print(f"Skipping row {index} due to missing data: {row.to_dict()}")
                        continue

                    date_val = str(row['date'])
                    source = str(row['source'])
                    net_income = float(row['net_income'])

                    cursor.execute(
                        "INSERT INTO income (date, source, net_income) VALUES (?, ?, ?)",
                        (date_val, source, net_income)
                    )
                    inserted_count += 1
                except ValueError as ve:
                    print(f"Data type error in row {index}: {ve} - Data: {row.to_dict()}")
                except Exception as row_err:
                    print(f"Error inserting row {index}: {row_err} - Data: {row.to_dict()}")

            db.commit()
            return jsonify({'message': f'Income data uploaded and stored successfully. {inserted_count} rows inserted.'}), 200

        except pd.errors.EmptyDataError:
            return jsonify({'error': 'The uploaded Excel file is empty.'}), 400
        except pd.errors.ParserError:
            return jsonify({'error': 'Could not parse Excel file. Ensure it is a valid .xls or .xlsx format.'}), 400
        except Exception as e:
            print(f"Server error during income upload: {e}")
            return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500
    return jsonify({'error': 'Something went wrong with the file upload.'}), 500


# --- NEW API Route to fetch spending data ---
@app.route('/api/spending_records', methods=['GET'])
def get_spending_records():
    db = get_db()
    cursor = db.cursor()
    # Fetch all spending records, ordered by date descending
    spending_data = cursor.execute("SELECT * FROM spending ORDER BY date DESC").fetchall()
    # Convert Row objects to dictionaries for JSON serialization
    return jsonify([dict(row) for row in spending_data]), 200

# --- NEW API Route to fetch income data ---
@app.route('/api/income_records', methods=['GET'])
def get_income_records():
    db = get_db()
    cursor = db.cursor()
    # Fetch all income records, ordered by date descending
    income_data = cursor.execute("SELECT * FROM income ORDER BY date DESC").fetchall()
    # Convert Row objects to dictionaries for JSON serialization
    return jsonify([dict(row) for row in income_data]), 200


# --- Existing API route (optional, for demonstration) ---
@app.route('/api/data')
def get_data():
    db = get_db()
    cursor = db.cursor()

    spending_data = cursor.execute("SELECT * FROM spending ORDER BY date DESC LIMIT 10").fetchall()
    income_data = cursor.execute("SELECT * FROM income ORDER BY date DESC LIMIT 10").fetchall()

    return jsonify({
        "message": "Data from Flask backend!",
        "spending_records": [dict(row) for row in spending_data],
        "income_records": [dict(row) for row in income_data]
    })


# --- Serve React App (remains the same) ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
