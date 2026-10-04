import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=os.getenv("NEBIUS_API_KEY")
)

previous_information = """
Project submission requirements:

The frontend must be completed by October 3.
The documentation must be completed by October 5.
The login system must be tested and bugs must be fixed.
The presentation must be prepared before final submission.
The demo video must be less than 3 minutes.
The GitHub repository must be public and contain a README
and an open-source license.
"""

updated_information = """
Project submission requirements:

The frontend must be completed by October 7.
The documentation must be completed by October 5.
The login system must be tested and bugs must be fixed.
The presentation must be prepared before final submission.
The demo video must be less than 3 minutes.
The GitHub repository must be public and contain a README
and an open-source license.
"""

prompt = f"""
You are the RETRACE AI Change Detection Agent.

Compare the previous information with the updated information.

Identify only information that changed.

Rules:
1. Do not invent changes.
2. If something is unchanged, do not list it.
3. Clearly show the previous value and new value.
4. Explain the impact of the change on the action plan.
5. Keep the answer concise.
6. Do not show reasoning.

Use exactly this format:

===== WHAT CHANGED? =====

1. Changed item: ...
   Previous: ...
   New: ...
   Impact: ...

Previous information:
{previous_information}

Updated information:
{updated_information}
"""

response = client.chat.completions.create(
    model="nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    messages=[
        {
            "role": "user",
            "content": prompt
        }
    ],
    max_tokens=4000
)

print("\n===== RETRACE CHANGE DETECTOR =====\n")

content = response.choices[0].message.content

if content:
    print(content)
else:
    print("The model did not return a change report.")
    print("Finish reason:", response.choices[0].finish_reason)