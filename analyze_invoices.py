import os
import sys
import pypdf

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

folder = r"C:\Users\PC\OneDrive\Desktop\Labkey"
files = [f for f in os.listdir(folder) if f.endswith(".pdf")]

print(f"Found {len(files)} PDFs in {folder}")

for filename in files[:5]:
    filepath = os.path.join(folder, filename)
    print(f"\n================= FILE: {filename} =================")
    try:
        reader = pypdf.PdfReader(filepath)
        print(f"Total pages: {len(reader.pages)}")
        text = reader.pages[0].extract_text()
        if text:
            print(text[:1200])
        else:
            print("[No text extracted from the first page]")
    except Exception as e:
        print(f"Error reading file: {e}")
