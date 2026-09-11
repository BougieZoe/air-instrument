import os
import sys
import json
import anthropic

# THE DESIGN AGENT CORE
# --------------------
# Goal: Distill high-level design intent into Zoe-native design tokens.

MANIFESTO_PATH = "../IDENTITY.md"
TOKENS_PATH = "../src/styles/tokens.css"

def load_manifesto():
    with open(os.path.join(os.path.dirname(__file__), MANIFESTO_PATH), "r") as f:
        return f.read()

def load_tokens():
    with open(os.path.join(os.path.dirname(__file__), TOKENS_PATH), "r") as f:
        return f.read()

def process_design_request(intent):
    manifesto = load_manifesto()
    current_tokens = load_tokens()
    
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    
    prompt = f"""You are the ZOE OS DESIGN AGENT. Your role is to act as the "Aesthetic Authority" and "Gatekeeper" of the Zoe OS soul.

IDENTITY CONTEXT (MANIFESTO):
{manifesto}

CURRENT DESIGN TOKENS (CSS VARIABLES):
{current_tokens}

DESIGN INTENT:
"{intent}"

YOUR TASK:
1. Audit the intent against the Manifesto. If it introduces "Noise", "Generic Startup Vibes", or "Bubbly UI", reject it and suggest a "Calm" alternative.
2. If approved, propose a surgical update to the Design Tokens (CSS variables) to realize this intent.
3. You MUST stay within the "Stark Palette" (Black, White, Gray) with Nothing Red (#FF0033) as the only functional accent.
4. Focus on precision: adjust blur, border-radius (keep sharp), spacing, and typography weights.

OUTPUT FORMAT (JSON ONLY):
{{
  "audit": "Your reasoning based on the Manifesto.",
  "status": "APPROVED" | "REJECTED_WITH_ALTERNATIVE",
  "suggested_tokens": {{
    "--variable-name": "new-value",
    ...
  }},
  "rationale": "Why these specific changes maintain Aesthetic Authority."
}}"""

    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 design_agent.py \"Design Intent\"")
        sys.exit(1)
    
    intent = sys.argv[1]
    print(f"--- ZOE_DESIGN_AGENT // ANALYZING_INTENT: {intent} ---")
    
    result = process_design_request(intent)
    print(result)
