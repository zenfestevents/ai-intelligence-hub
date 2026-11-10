import sys
from google import genai

url, prompt = sys.argv[1], " ".join(sys.argv[2:])
client = genai.Client()
interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input=[
        {"type": "text", "text": prompt},
        {"type": "video", "uri": url},
    ],
)
print(interaction.output_text)