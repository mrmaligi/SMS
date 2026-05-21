import sys
import os
import pypdf

# Ensure standard output can print UTF-8 characters on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

pdf_path = "Catalogo LabKey.pdf"
txt_output_path = "extracted_catalog.txt"

if not os.path.exists(pdf_path):
    print(f"Error: {pdf_path} not found")
    sys.exit(1)

print(f"Reading {pdf_path}...")
reader = pypdf.PdfReader(pdf_path)
num_pages = len(reader.pages)
print(f"Total pages: {num_pages}")

with open(txt_output_path, "w", encoding="utf-8") as f_out:
    for i in range(num_pages):
        page_num = i + 1
        text = reader.pages[i].extract_text()
        f_out.write(f"\n================= PAGE {page_num} =================\n")
        if text:
            f_out.write(text)
            f_out.write("\n")
        else:
            f_out.write("[No text extracted from this page]\n")

print(f"Success! Extracted text written to: {txt_output_path}")
