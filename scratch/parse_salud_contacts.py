import csv, re, unicodedata, sys
sys.stdout.reconfigure(encoding='utf-8')

def clean_str(s):
    if s is None: return ''
    return str(s).strip()

def norm(s):
    s = clean_str(s)
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-zA-Z0-9\s]', ' ', s)
    return ' '.join(s.lower().split())

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

parsed_salud = []

for r in contacts_rows:
    fn = clean_str(r.get('First Name', ''))
    ln = clean_str(r.get('Last Name', ''))
    mn = clean_str(r.get('Middle Name', ''))
    full_name = f"{fn} {mn} {ln}".strip()
    
    phones = []
    for k, v in r.items():
        if 'phone' in k.lower() and 'value' in k.lower() and v.strip():
            cp = clean_phone(v)
            if cp: phones.append(cp)
    if not phones: continue
    
    # Classify relationship
    # e.g. Mamá, Papá, Abuelo, Abuela, Alumno
    low = full_name.lower()
    rel = 'Alumno'
    if low.startswith('mama') or 'mamá' in low or 'mama de' in low or 'mamá de' in low:
        rel = 'Mamá'
    elif low.startswith('papa') or 'papá' in low or 'papa de' in low or 'papá de' in low:
        rel = 'Papá'
    elif 'abuel' in low:
        rel = 'Abuelo(a)'
    elif 'tio' in low or 'tío' in low or 'tutor' in low:
        rel = 'Tutor'
        
    # Extract student name
    # remove relation prefixes
    clean_n = re.sub(r'^(Mamá|Mama|Papá|Papa|Abuelita|Abuelito|Abuelo|Abuela)\s*(de)?\s*', '', full_name, flags=re.IGNORECASE)
    # remove trailing group indicators like 2A, 2B, 2C, S1A, S1B, S1C, Prepa, 1C
    clean_n = re.sub(r'\b(S[123][ABC]|[123][ABC]|Prepa|ext)\b', '', clean_n, flags=re.IGNORECASE).strip()
    clean_n = ' '.join(clean_n.split())
    
    parsed_salud.append({
        'orig_name': full_name,
        'clean_student': clean_n,
        'rel': rel,
        'phone': phones[0]
    })

print(f'Total parsed phone contacts from contacts.csv: {len(parsed_salud)}')
for p in parsed_salud[:20]:
    print(f"  [{p['rel']:9s}] {p['clean_student']} (orig: '{p['orig_name']}') -> {p['phone']}")
