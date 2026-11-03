import csv, sys
sys.stdout.reconfigure(encoding='utf-8')

csv_path = r'c:\Users\hugog\Downloads\Contactos_Google_Enfermeria_Colegio_Boston.csv'

with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f'Total contacts in file: {len(rows)}')
indices = [0, 1, 2, 23, 72, 140, 180, 218, 230, 266, 300, 335]
for idx in indices:
    if idx < len(rows):
        r = rows[idx]
        print(f"[{idx+1:3d}] {r['First Name']}")
        print(f"      P1 ({r['Phone 1 - Label']}): {r['Phone 1 - Value']} | P2 ({r['Phone 2 - Label']}): {r['Phone 2 - Value']}")
        print(f"      Labels: {r['Labels']}")
