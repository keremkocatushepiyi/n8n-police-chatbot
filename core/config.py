import os
from dotenv import load_dotenv

load_dotenv()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
N8N_POLICY_WEBHOOK_URL = os.getenv("N8N_POLICY_WEBHOOK_URL")