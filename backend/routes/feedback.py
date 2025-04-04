from flask import Blueprint, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

# Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Define the feedback blueprint
feedback_bp = Blueprint('feedback', __name__)

def analyze_text_for_feedback(transcript):
    """Sends transcript text to Gemini API for AI feedback."""
    model = genai.GenerativeModel("gemini-1.5-flash")  # Use the new model

    try:
        # AI Prompt for analyzing transcript
        prompt = f"""
        Provide feedback on the following text:
        - Give a score from 1 to 10 for how well the person spoke.
        - Mention specific filler words used in the speech.
        - Suggest improvements for clarity and fluency.
        - Ensure the feedback is concise, no more than 150 words.
        \n{transcript}
        """

        # Send the prompt to Gemini
        response = model.generate_content([prompt], stream=False)

        # Handle missing or empty responses
        if not response or not response.text:
            return 5, "No feedback from AI."

        ai_feedback = response.text

        # Extract score from AI feedback (assuming it's mentioned in the feedback)
        match = re.search(r'\b(10|\d)\b', ai_feedback)
        score = int(match.group()) if match else 5  # Default to 5 if no score found

        return score, ai_feedback

    except Exception as e:
        return 5, f"Error processing AI feedback: {str(e)}"


@feedback_bp.route('/ai_feedback', methods=["POST"])
def ai_feedback():
    """Accepts transcript and returns AI feedback."""
    try:
        # Extract transcript from the request
        data = request.get_json()
        transcript = data.get("transcript")

        if not transcript:
            return jsonify({"error": "No transcript provided"}), 400

        # Get AI feedback for the transcript
        score, ai_feedback = analyze_text_for_feedback(transcript)

        # Return the feedback and score
        return jsonify({"score": score, "aiFeedback": ai_feedback})

    except Exception as e:
        return jsonify({"error": f"Error processing feedback: {str(e)}"}), 500