import pathlib
import sys
import os

# Enable test-only auth bypass for this pytest process.
os.environ.setdefault("TEST_AUTH_ENABLED", "true")
os.environ.setdefault("TEST_AUTH_SECRET", "e2e-test-secret")


# Ensure `backend/` is on PYTHONPATH so `import app...` works.
BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

