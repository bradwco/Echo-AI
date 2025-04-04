from flask import Blueprint, request, jsonify
import openai
import os

# Load OpenAI API key from environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")

# Create a Blueprint for the transcribe route
transcribe_bp = Blueprint('transcribe', __name__)

@transcribe_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    # Get the audio file from the request
    file = request.files.get('audio')
    if not file:
        print("No audio file provided.")
        return jsonify({"error": "No audio file provided"}), 400

    try:
        print(f"Received file: {file.filename}")  # Log the file name

        # Save the file locally for processing
        file_path = f"temp_{file.filename}"
        file.save(file_path)
        print(f"File saved locally as {file_path}")

        # Open the file for reading and send it to Whisper for transcription
        with open(file_path, "rb") as audio_file:
            print("Starting transcription with Whisper API...")
            
            # Use the older method for transcription with OpenAI v0.28
            transcript = openai.Audio.transcribe(
                model="whisper-1",  # Specify the Whisper model
                file=audio_file
            )

        # Log the successful transcription
        print("Transcription completed successfully.")

        # Return the transcription result
        return jsonify({"transcript": transcript['text']})
    
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return jsonify({"error": "Failed to transcribe"}), 500
