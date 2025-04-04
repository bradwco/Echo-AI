from flask import Blueprint, request, jsonify
import openai
import os
import tempfile
import numpy as np
import nltk
from pydub import AudioSegment
import librosa

nltk.download('punkt')
openai.api_key = os.getenv("OPENAI_API_KEY")

analyze_bp = Blueprint('analyze', __name__)

@analyze_bp.route('/analyze_live', methods=['POST'])
def analyze_live():
    try:
        file = request.files.get('audio')
        if not file:
            return jsonify({"error": "No audio file provided"}), 400

        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as temp_m4a:
            file.save(temp_m4a.name)

        wav_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
        audio = AudioSegment.from_file(temp_m4a.name, format="m4a")
        audio.export(wav_path, format="wav")

        y, sr = librosa.load(wav_path)
        duration_sec = librosa.get_duration(y=y, sr=sr)
        if duration_sec < 0.1:
            return jsonify({"error": "Audio file is too short. Minimum audio length is 0.1 seconds."}), 500

        volume_db = float(np.mean(librosa.amplitude_to_db(np.abs(y))))

        with open(temp_m4a.name, "rb") as audio_file:
            transcript_data = openai.Audio.transcribe(model="whisper-1", file=audio_file)
            transcript = transcript_data['text']

        words = nltk.word_tokenize(transcript)
        word_count = len(words)
        wpm = float(word_count / (duration_sec / 60))

        filler_words = ['um', 'uh', 'like', 'you know', 'so', 'actually']
        filler_count = int(sum(1 for word in words if word.lower() in filler_words))

        return jsonify({
            'wpm': round(wpm, 2),
            'volume': round(volume_db, 2),
            'fillerCount': filler_count,
            'transcript': transcript
        })

    except Exception as e:
        print("❌ Analysis failed:", str(e))
        return jsonify({"error": str(e)}), 500
