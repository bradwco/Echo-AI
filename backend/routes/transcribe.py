from flask import Blueprint, request, jsonify
import openai, os

openai.api_key = os.getenv("OPENAI_API_KEY")
transcribe_bp = Blueprint('transcribe', __name__)

@transcribe_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    file = request.files.get('audio')
    if not file:
        return jsonify({"error": "No audio file provided"}), 400

    try:
        print(f"Received file: {file.filename}")

        # Save the raw .m4a file
        temp_path = "temp_audio.m4a"
        file.save(temp_path)
        print(f"File saved as {temp_path}")

        # Send directly to Whisper
        with open(temp_path, "rb") as audio_file:
            transcript = openai.Audio.transcribe(model="whisper-1", file=audio_file)

        os.remove(temp_path)

        return jsonify({"transcript": transcript['text']})

    except Exception as e:
        print("❌ Transcription failed:", str(e))
        return jsonify({"error": "Failed to transcribe"}), 500
