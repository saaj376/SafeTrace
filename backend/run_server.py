import uvicorn
import sys
import os

# Get the directory where this script is located
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

print(f"CWD: {os.getcwd()}")
print(f"sys.path[0]: {sys.path[0]}")

try:
    import main
    print("✓ main imported successfully")
except Exception as e:
    print(f"✗ Failed to import main: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8001,
        reload=False,
        log_level="info"
    )
