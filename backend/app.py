from flask import Flask
from routes.transcribe import transcribe_bp  # Import your transcribe route
from dotenv import load_dotenv

# Load environment variables (like OPENAI_API_KEY)
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Register routes
app.register_blueprint(transcribe_bp)

# Start the Flask app and make it accessible over the local network
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
