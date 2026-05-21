import os
import shutil

src = "temp-app"
dst = "."

if not os.path.exists(src):
    print(f"Error: {src} directory not found.")
    exit(1)

print("Moving files from temp-app to root...")
for item in os.listdir(src):
    s = os.path.join(src, item)
    d = os.path.join(dst, item)
    try:
        if os.path.isdir(s):
            if os.path.exists(d):
                shutil.rmtree(d)
            shutil.move(s, d)
        else:
            if os.path.exists(d):
                os.remove(d)
            shutil.move(s, d)
        print(f"Moved: {item}")
    except Exception as e:
        print(f"Error moving {item}: {e}")

try:
    os.rmdir(src)
    print("Cleaned up temp-app folder.")
except Exception as e:
    print(f"Error removing temp-app: {e}")

print("Done!")
