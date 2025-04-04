from flask import Blueprint, request, jsonify
import openai
import os
import tempfile
import numpy as np
import nltk
from pydub import AudioSegment
import librosa
import time
import gc
import logging
from functools import lru_cache
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Download NLTK data once at startup
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

openai.api_key = os.getenv("OPENAI_API_KEY")

# Cache for frequently used data
@lru_cache(maxsize=32)
def get_filler_words():
    return {'um', 'uh', 'like', 'you know', 'so', 'actually'}

analyze_bp = Blueprint('analyze', __name__)

def cleanup_temp_files(*files):
    """Safely remove temporary files"""
    for file_path in files:
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except Exception as e:
            logger.warning(f"Failed to remove temp file {file_path}: {str(e)}")

def validate_audio_file(file):
    """Validate the uploaded audio file"""
    if not file:
        return False, "No audio file provided"
    if not file.filename.lower().endswith(('.m4a', '.wav', '.mp3')):
        return False, "Invalid file format. Supported formats: m4a, wav, mp3"
    return True, None

@analyze_bp.route('/analyze_live', methods=['POST'])
def analyze_live():
    start_time = time.time()
    temp_files = []
    
    try:
        # Validate request
        file = request.files.get('audio')
        is_valid, error_msg = validate_audio_file(file)
        if not is_valid:
            return jsonify({"error": error_msg}), 400

        # Create temporary files
        temp_m4a = tempfile.NamedTemporaryFile(delete=False, suffix=".m4a")
        temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        temp_files.extend([temp_m4a.name, temp_wav.name])
        
        # Save and convert audio
        file.save(temp_m4a.name)
        audio = AudioSegment.from_file(temp_m4a.name, format="m4a")
        audio.export(temp_wav.name, format="wav")

        # Load and validate audio
        y, sr = librosa.load(temp_wav.name, sr=None)  # Use native sample rate
        duration_sec = librosa.get_duration(y=y, sr=sr)
        
        if duration_sec < 0.1:
            return jsonify({"error": "Audio file is too short. Minimum audio length is 0.1 seconds."}), 400

        # Calculate volume (optimized)
        volume_db = float(np.mean(librosa.amplitude_to_db(np.abs(y), ref=np.max)))

        # Transcribe audio
        with open(temp_m4a.name, "rb") as audio_file:
            transcript_data = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file,
                language="en"  # Specify language for better performance
            )
            transcript = transcript_data['text']

        # Process transcript
        words = nltk.word_tokenize(transcript)
        word_count = len(words)
        wpm = float(word_count / (duration_sec / 60))

        # Count filler words (optimized)
        filler_words = get_filler_words()
        filler_count = sum(1 for word in words if word.lower() in filler_words)

        # Calculate processing time
        processing_time = time.time() - start_time
        logger.info(f"Analysis completed in {processing_time:.2f} seconds")

        # Clean up
        cleanup_temp_files(*temp_files)
        
        # Force garbage collection
        gc.collect()

        return jsonify({
            'wpm': round(wpm, 2),
            'volume': round(volume_db, 2),
            'fillerCount': int(filler_count),
            'transcript': transcript,
            'processingTime': round(processing_time, 2)
        })

    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        # Ensure cleanup even on error
        cleanup_temp_files(*temp_files)
        return jsonify({
            "error": "An error occurred during analysis",
            "details": str(e)
        }), 500
