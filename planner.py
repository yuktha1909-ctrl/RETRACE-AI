import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=os.getenv("NEBIUS_API_KEY")
)

tasks = """
1. Task: Finish the frontend
   Deadline: October 3
   Priority: HIGH
   Reason: Part of finishing the working application

2. Task: Complete the documentation
   Deadline: October 5
   Priority: MEDIUM
   Reason: Required for submission

3. Task: Test the login system and fix any bugs
   Deadline: Not specified
   Priority: HIGH
   Reason: Important for testing the application

4. Task: Prepare the presentation
   Deadline: Not specified
   Priority: MEDIUM
   Reason: Part of the submission requirements

5. Task: Create a demo video less than 3 minutes
   Deadline: Not specified
   Priority: MEDIUM
   Reason: Part of the submission requirements

6. Task: Ensure the GitHub repository is public and contains a README and an open-source license
   Deadline: Not specified
   Priority: MEDIUM
   Reason: Part of the submission requirements
"""

prompt = f"""
You are the RETRACE AI Planner Agent.

Convert the extracted tasks below into a practical action plan.

Rules:
1. Put HIGH priority tasks before MEDIUM and LOW priority tasks.
2. Tasks with earlier explicit deadlines should come first.
3. Do not invent deadlines.
4. If a deadline is "Not specified", keep it as "Not specified".
5. Identify dependencies only when they are clearly implied.
6. Keep the plan concise.
7. Do not explain your reasoning.

Return exactly this format:

===== RETRACE ACTION PLAN =====

1. Task: ...
   Priority: ...
   Deadline: ...
   Dependency: ...
   Action: ...

2. Task: ...
   Priority: ...
   Deadline: ...
   Dependency: ...
   Action: ...

Tasks:
{tasks}
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

print("\n===== RETRACE PLANNER =====\n")

content = response.choices[0].message.content

if content:
    print(content)
else:
    print("The model did not return a final plan.")
    print("Finish reason:", response.choices[0].finish_reason)