import csv, re, unicodedata, sys
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

# Let's inspect all contacts
staff_candidates = []
family_contacts = []
empty_contacts = []

STAFF_KEYWORDS = [
    'miss', 'profe', 'profesor', 'profra', 'maestro', 'maestra', 'lic', 'ing', 'dr', 'dra',
    'psic', 'psicolog', 'director', 'directora', 'coordinad', 'recepcion', 'admision',
    'boston', 'enfermer', 'caja', 'intendencia', 'mantenimiento', 'chofer', 'transporte',
    'prefect', 'sistemas', 'tienda', 'cafeteria', 'after school', 'tutor', 'seguridad',
    'vigilancia', 'quimic', 'docente', 'titular', 'secretar'
]

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
            if cp: phones.append(f"{k}: {cp} (orig: {v})")
            
    if not full_name and not phones:
        empty_contacts.append(r)
        continue
        
    low = f"{full_name} {org} {title} {notes}".lower()
    
    # Check if explicit staff keyword
    is_keyword_staff = any(kw in low for kw in STAFF_KEYWORDS)
    
    # Check if family
    is_family = False
    if any(low.startswith(p) for p in ['mama', 'mamá', 'papa', 'papá', 'abuel', 'tio', 'tía']):
        is_family = True
    elif 'mamá' in low or 'papá' in low:
        is_family = True
        
    # Check if student with group like 1A, 2B, S1C, etc.
    is_student_roster = bool(re.search(r'\b(s[123][abc]|[123][abc])\b', low)) and not is_keyword_staff
    
    if is_keyword_staff:
        staff_candidates.append({
            'full_name': full_name,
            'org': org,
            'title': title,
            'notes': notes,
            'phones': phones,
            'raw': r,
            'reason': 'keyword'
        })
    elif not is_family and not is_student_roster:
        # Check if single name or adult name without group
        staff_candidates.append({
            'full_name': full_name,
            'org': org,
            'title': title,
            'notes': notes,
            'phones': phones,
            'raw': r,
            'reason': 'no_family_no_group'
        })

print(f'Total candidates found: {len(staff_candidates)}')
for c in staff_candidates:
    p_str = ' | '.join(c['phones']) if c['phones'] else 'NO PHONE'
    extra = f" [Org: {c['org']}]" if c['org'] else ""
    extra += f" [Notes: {c['notes']}]" if c['notes'] else ""
    print(f"  • {c['full_name']}{extra} -> {p_str} ({c['reason']})")
