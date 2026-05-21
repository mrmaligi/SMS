import csv
import os

csv_path = "LabKey Inventory Database_MAIN - Sheet1.csv"
sql_path = "seed.sql"

if not os.path.exists(csv_path):
    print(f"Error: {csv_path} not found")
    exit(1)

print("Parsing CSV...")
with open(csv_path, mode="r", encoding="utf-8") as f:
    reader = csv.reader(f)
    header = next(reader)
    
    insert_statements = []
    for row in reader:
        if not row or len(row) < 4:
            continue
        sku = row[0].strip()
        description = row[1].strip().replace("'", "''")  # Escape single quotes for PostgreSQL
        stock = row[2].strip()
        category = row[3].strip()
        
        try:
            stock_val = int(stock)
        except ValueError:
            stock_val = 0
            
        if not sku:
            continue
            
        statement = f"('{sku}', '{description}', '{category}', {stock_val})"
        insert_statements.append(statement)

print(f"Generating {sql_path}...")
with open(sql_path, "w", encoding="utf-8") as f_out:
    f_out.write("-- LabKey Inventory Catalog Seed Script\n")
    f_out.write("INSERT INTO products (sku, name, category, current_stock)\nVALUES\n")
    f_out.write(",\n".join(insert_statements))
    f_out.write("\nON CONFLICT (sku) DO UPDATE SET\n")
    f_out.write("  name = EXCLUDED.name,\n")
    f_out.write("  category = EXCLUDED.category,\n")
    f_out.write("  current_stock = EXCLUDED.current_stock;\n")

print("Done!")
