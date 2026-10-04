import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=os.getenv("NEBIUS_API_KEY")
)

response = client.chat.completions.create(
    model="nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    messages=[
        {
            "role": "user",
            "content": "You are RETRACE AI. Explain in one sentence what you can help a user accomplish."
        }
    ],
    max_tokens=100
)

print("\nRETRACE AI:")
print(response.choices[0].message.content)