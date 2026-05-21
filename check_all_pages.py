import os
import sys
import pypdf

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

folder = r"C:\Users\PC\OneDrive\Desktop\Labkey"
files = [f for f in os.listdir(folder) if f.endswith(".pdf")]

print(f"Total PDFs found: {len(files)}")

scanned_count = 0
digital_count = 0

for filename in files:
    filepath = os.path.join(folder, filename)
    try:
        reader = pypdf.PdfReader(filepath)
        total_pages = len(reader.pages)
        has_text = False
        
        # Check all pages in the PDF for text
        for i in range(total_pages):
            text = reader.pages[i].extract_text()
            if text and text.strip():
                has_text = True
                break
                
        if has_text:
            digital_count += 1
            # Print page count and a snippet of the first text page
            print(f"DIGITAL: {filename} ({total_pages} pages)")
        else:
            scanned_count += 1
            print(f"SCANNED: {filename} ({total_pages} pages)")
            
    except Exception as e:
        print(f"ERROR reading {filename}: {e}")

print(f"\nSummary:\nDigital PDFs (with text): {digital_count}\nScanned PDFs (image-only): {scanned_count}")
