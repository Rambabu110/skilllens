import os
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

for m in ["gemini-2.5-flash", "gemini-flash-latest"]:
    try:
        model = genai.GenerativeModel(m)
        resp = model.generate_content("Say hello in JSON: {\"message\": \"hello\"}")
        print(f"{m} SUCCESS: {resp.text}")
        break
    except Exception as e:
        print(f"{m} ERROR: {e}")
