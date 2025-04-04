from flask import Blueprint, request, jsonify
from pydub import AudioSegment
from pydub.utils import which
import numpy as np
from scipy.io import wavfile
import io

# Make sure pydub knows where ffmpeg is
AudioSegment.converter = which("ffmpeg")
AudioSegment.ffprobe = which("ffprobe")

volume_bp = Blueprint("volume", __name__)

@volume_bp.route('/analyze/volume', methods=["POST"])
def analyze_volume():
    try:
        if 'audio' not in request.files:
            print("❌ No audio in request.")
            return jsonify({"error": "No audio file uploaded"}), 400

        file = request.files['audio']
        print("🔈 Received audio file:", file.filename)

        # Step 1: Convert .m4a to .wav in memory
        audio_data = io.BytesIO(file.read())
        audio = AudioSegment.from_file(audio_data, format="m4a")

        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)

        # Step 2: Analyze volume using scipy
        samplerate, data = wavfile.read(wav_io)
        if data.ndim == 2:
            data = data[:, 0]

        rms = np.sqrt(np.mean(data.astype(np.float64)**2))
        db = 20 * np.log10(rms) if rms > 0 else -float('inf')

        print("✅ Volume calculated:", round(db, 2), "dB")
        return jsonify({"volume": round(db, 2)})

    except Exception as e:
        print("🔥 ERROR in /analyze/volume:", str(e))
        return jsonify({"error": f"Failed to calculate volume: {str(e)}"}), 500
