import csv, sys
sys.stdout.reconfigure(encoding='utf-8')

csv_path = r'c:\Users\hugog\Downloads\Contactos_Google_Enfermeria_Colegio_Boston.csv'

with open(csv_path, 'r', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))

t1a_found = []
t1a_missing = []
t1b_found = []
t1b_missing = []

for r in rows:
    dept = r.get('Organization Department', '')
    fn = r.get('First Name', '')
    p1 = r.get('Phone 1 - Value', '')
    p2 = r.get('Phone 2 - Value', '')
    p1_lbl = r.get('Phone 1 - Label', '')
    p2_lbl = r.get('Phone 2 - Label', '')
    
    if 'T1A' in dept:
        if p1 or p2:
            t1a_found.append((fn, p1_lbl, p1, p2_lbl, p2))
        else:
            t1a_missing.append(fn)
    elif 'T1B' in dept:
        if p1 or p2:
            t1b_found.append((fn, p1_lbl, p1, p2_lbl, p2))
        else:
            t1b_missing.append(fn)

print(f"=== PREPARATORIA T1A: {len(t1a_found)} con teléfono, {len(t1a_missing)} pendientes ===")
print("\nCon teléfono:")
for item in t1a_found:
    print(f"  ✓ {item[0]} | Tel 1 ({item[1]}): {item[2]} | Tel 2 ({item[3]}): {item[4]}")
print("\nPendientes (no registrados en teléfono de salud ni bases):")
for item in t1a_missing:
    print(f"  ✗ {item}")

print(f"\n=== PREPARATORIA T1B: {len(t1b_found)} con teléfono, {len(t1b_missing)} pendientes ===")
print("\nCon teléfono:")
for item in t1b_found:
    print(f"  ✓ {item[0]} | Tel 1 ({item[1]}): {item[2]} | Tel 2 ({item[3]}): {item[4]}")
print("\nPendientes (no registrados en teléfono de salud ni bases):")
for item in t1b_missing:
    print(f"  ✗ {item}")
