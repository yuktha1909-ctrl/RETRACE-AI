import os

from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = FastAPI(title="RETRACE AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=os.getenv("NEBIUS_API_KEY")
)

MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"


@app.get("/")
def home():
    return {
        "message": "RETRACE AI backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": MODEL
    }


@app.post("/analyze")
async def analyze(text: str = Form(...)):

    prompt = f"""
You are RETRACE AI.

Extract actionable tasks from the information below.

Rules:
- Only use deadlines explicitly stated.
- Never invent a deadline.
- If no deadline is given, write "Not specified".
- Priority must be HIGH, MEDIUM, or LOW.
- Do not explain your reasoning.

Format:

1. Task: ...
   Deadline: ...
   Priority: ...
   Reason: ...

Information:

{text}
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=4000
    )

    return {
        "result": response.choices[0].message.content
    }