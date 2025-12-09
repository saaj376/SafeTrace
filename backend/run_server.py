import uvicorn
import sys
import os

os.chdir(r"C:\Users\saaja\Downloads\blistering-barnacles\backend")
sys.path.insert(0, r"C:\Users\saaja\Downloads\blistering-barnacles\backend")

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
        port=8000,
        reload=False,
        log_level="info"
    )
