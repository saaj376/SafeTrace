import sys
import os
print(f'Python: {sys.executable}')
print(f'CWD: {os.getcwd()}')
print(f'main.py exists: {os.path.exists("main.py")}')
try:
    import main
    print('✓ main imports OK')
except Exception as e:
    print(f'✗ main import error: {e}')
    import traceback
    traceback.print_exc()
