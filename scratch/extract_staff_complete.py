import csv, re, unicodedata, sys
from collections import OrderedDict

sys.stdout.reconfigure(encoding='utf-8')

def clean_str(s):
    if s is None: return ''
    return str(s).strip()

def clean_phone(val):
    if val is None: return ''
    s = str(val).strip()
    if ':::' in s: s = s.split(':::')[0].strip()
    if s.endswith('.0'): s = s[:-2]
    digits = re.sub(r'[^\d]', '', s)
    if digits.startswith('52') and len(digits) == 12: digits = digits[2:]
    if len(digits) == 10: return digits
    if len(digits) == 11 and digits.startswith('1'): return '+' + digits
    if len(digits) > 10 and digits.startswith('777'): return digits[:10]
    m = re.search(r'\b(\d{10})\b', digits)
    if m: return m.group(1)
    if len(digits) >= 7: return digits
    return ''

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

# Define explicit staff entries or patterns
docentes = []
administrativos = []
salud_psico = []
emergencias = []

# Known student roster markers to exclude
STUDENT_NAMES_IN_CONTACTS = [
    'alejandro castaneda', 'alejandro sanchez', 'alessandra sanchez', 'alondra trujillo',
    'andree sebastian', 'andres emiliano', 'david eduardo coria', 'eduardo coria',
    'jesus adrian gallardo', 'santiago rodriguez duron', 'matteo jeronimo', 'padme sofia',
    'frida selene rubio', 'luis tellez', 'kaleb cortez', 'mariana jaimez', 'matias rafael',
    'ana sofia fiz', 'aranza dominguez', 'danae guadalupe nava', 'devany danae', 'danna valeria',
    'ethan arturo', 'joshua samuel diaz', 'carlos manuel lopez'
]

seen_names = set()

for r in contacts_rows:
    fn = clean_str(r.get('First Name', ''))
    ln = clean_str(r.get('Last Name', ''))
    mn = clean_str(r.get('Middle Name', ''))
    org = clean_str(r.get('Organization Name', ''))
    title = clean_str(r.get('Organization Title', ''))
    notes = clean_str(r.get('Notes', ''))
    full_name = f"{fn} {mn} {ln}".strip()
    
    # get phones
    phones = []
    for k, v in r.items():
        if 'phone' in k.lower() and 'value' in k.lower() and v.strip():
            cp = clean_phone(v)
            if cp: phones.append(cp)
            
    if not full_name and not phones: continue
    
    # exclude family
    low = full_name.lower()
    if any(low.startswith(p) for p in ['mama', 'mamá', 'papa', 'papá', 'abuel', 'tio', 'tía']):
        continue
    if 'mamá de' in low or 'papá de' in low or 'abuelita' in low or 'abuelito' in low:
        continue
    if 'hermano yaretzi' in low:
        continue
        
    # exclude student names with groups
    norm_n = unicodedata.normalize('NFKD', low)
    norm_n = ''.join(c for c in norm_n if not unicodedata.combining(c))
    if any(st in norm_n for st in STUDENT_NAMES_IN_CONTACTS):
        continue
    if re.search(r'\b(s[123][abc]|[123][abc])\b', norm_n) and not any(kw in norm_n for kw in ['profe', 'profr', 'miss', 'psic', 'tutor']):
        continue

    p_val = phones[0] if phones else ''
    entry = {
        'name': full_name,
        'phone': p_val,
        'org': org,
        'title': title,
        'notes': notes,
        'raw': r
    }
    
    # Avoid duplicate exact name + phone
    dedup_key = (norm_n, p_val)
    if dedup_key in seen_names:
        continue
    seen_names.add(dedup_key)
    
    # Classification
    if any(kw in norm_n for kw in ['enfermer', 'psicolog', 'psico', 'salud']):
        salud_psico.append(entry)
    elif any(kw in norm_n for kw in ['bomberos', 'cruz roja', 'emergencia', 'seguridad publica', 'mecanico']):
        emergencias.append(entry)
    elif any(kw in norm_n for kw in ['profe', 'profr', 'profesor', 'profra', 'maestr', 'miss', 'teacher', 'tutor 3', 'tutora 2']):
        docentes.append(entry)
    elif any(kw in norm_n for kw in ['director', 'recepcion', 'admision', 'caja', 'fidel', 'luisita', 'jessy', 'jessi', 'male', 'cafeteria', 'after school', 'comida', 'itacate', 'prefectura']):
        administrativos.append(entry)
    else:
        # Check others
        if any(kw in norm_n for kw in ['lic. sergio', 'sedano', 'tinoco', 'sandoval', 'jarquin', 'rachel']):
            administrativos.append(entry)

print(f"=== 1. PLANTILLA DOCENTE ({len(docentes)} contactos) ===")
for d in docentes:
    print(f"  • {d['name']:35s} | Tel: {d['phone']}")

print(f"\n=== 2. PERSONAL ADMINISTRATIVO Y DIRECTIVO ({len(administrativos)} contactos) ===")
for a in administrativos:
    print(f"  • {a['name']:35s} | Tel: {a['phone']}")

print(f"\n=== 3. SALUD ESCOLAR Y PSICOLOGÍA ({len(salud_psico)} contactos) ===")
for s in salud_psico:
    print(f"  • {s['name']:35s} | Tel: {s['phone']}")

print(f"\n=== 4. SERVICIOS DE EMERGENCIA ({len(emergencias)} contactos) ===")
for e in emergencias:
    print(f"  • {e['name']:35s} | Tel: {e['phone']}")
