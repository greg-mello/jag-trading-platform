import sys
import os

sys.path.insert(0, '/srv/group-project/backend/api')

# Load environment variables from .env file
env_path = '/srv/group-project/.env'
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, _, value = line.partition('=')
                os.environ.setdefault(key.strip(), value.strip())

from app import app as application
