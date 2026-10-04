import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=os.getenv("NEBIUS_API_KEY")
)

messy_information = """
Our project submission is coming up soon.

The team needs to finish the frontend by October 3.
The documentation should be completed by October 5.
We still need to test the login system and fix any bugs.
The presentation needs to be prepared before the final submission.
The demo video should be less than 3 minutes.
Someone should check that the GitHub repository is public
and contains a README and an open-source license.

The most important things are finishing the working application,
testing it, and making sure the submission requirements are satisfied.
"""

prompt = f"""
Extract all actionable tasks from the information below.

IMPORTANT RULES:
1. Only use deadlines explicitly stated in the information.
2. NEVER invent, guess, or calculate a deadline.
3. If a task has no explicit deadline, write:
   Deadline: Not specified
4. Priority must be HIGH, MEDIUM, or LOW.
5. Use the importance stated in the information to determine priority.
6. Do not explain your reasoning.
7. Return ONLY the numbered task list.

Use exactly this format:

1. Task: ...
   Deadline: ...
   Priority: HIGH/MEDIUM/LOW
   Reason: ...

2. Task: ...
   Deadline: ...
   Priority: HIGH/MEDIUM/LOW
   Reason: ...

Information:
{messy_information}
"""

response = client.chat.completions.create(
    model="nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    messages=[
        {
            "role": "user",
            "content": prompt
        }
    ],
    max_tokens=8000
)

print("\n===== RETRACE AI TASK EXTRACTION =====\n")

content = response.choices[0].message.content

if content:
    print(content)
else:
    print("The model did not return a final answer.")
    print("Finish reason:", response.choices[0].finish_reason)