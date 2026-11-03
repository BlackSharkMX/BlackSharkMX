import csv, openpyxl, re, unicodedata, sys
sys.stdout.reconfigure(encoding='utf-8')

def clean_str(s):
    if s is None: return ''
    s = str(s).strip()
    s = s.replace('&oacute;', 'ó').replace('&aacute;', 'á').replace('&eacute;', 'é').replace('&iacute;', 'í').replace('&uacute;', 'ú').replace('&ntilde;', 'ñ')
    return s

def norm(s):
    s = clean_str(s)
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-zA-Z0-9\s]', ' ', s)
    return ' '.join(s.lower().split())

def clean_phone(val):
    if val is None: return ''
    s = str(val).strip()
    # take first number if :::
    if ':::' in s:
        s = s.split(':::')[0].strip()
    if s.endswith('.0'): s = s[:-2]
    digits = re.sub(r'[^\d]', '', s)
    if digits.startswith('52') and len(digits) == 12:
        digits = digits[2:]
    if len(digits) == 10:
        return digits
    if len(digits) == 11 and digits.startswith('1'):
        return '+' + digits
    if len(digits) > 10 and digits.startswith('777'):
        return digits[:10]
    m = re.search(r'\b(\d{10})\b', digits)
    if m:
        return m.group(1)
    if len(digits) >= 7:
        return digits
    return ''

from openpyxl.styles.cell_style import CellStyle
orig_init = CellStyle.__init__
def patched_init(self, *args, **kwargs):
    if 'xfid' in kwargs: kwargs['xfId'] = kwargs.pop('xfid')
    orig_init(self, *args, **kwargs)
CellStyle.__init__ = patched_init

wb_g = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\GRUPOS SECUNDARIA Y PREPARATORIA.xlsx', data_only=True)
t1_students = []
for r in list(wb_g['Sheet1'].iter_rows(values_only=True))[1:]:
    if r[0] and r[1] in ('T1A', 'T1B'):
        t1_students.append({
            'nombre': clean_str(r[0]),
            'grupo': clean_str(r[1]),
            'seccion': clean_str(r[2])
        })

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

print(f'Checking {len(t1_students)} students from T1A and T1B...')

results = {}

for st in t1_students:
    s_name = st['nombre']
    s_norm = norm(s_name)
    s_words = [w for w in s_norm.split() if len(w) > 2]
    
    # find all matching contacts
    matched_entries = []
    for cr in contacts_rows:
        fn = clean_str(cr.get('First Name', ''))
        ln = clean_str(cr.get('Last Name', ''))
        mn = clean_str(cr.get('Middle Name', ''))
        notes = clean_str(cr.get('Notes', ''))
        row_str = f"{fn} {mn} {ln} {notes}"
        row_norm = norm(row_str)
        
        # Count matched key words
        common_words = [w for w in s_words if w in row_norm]
        
        # Need strong match: at least 2 words (e.g. both surnames or surname + name)
        # Avoid generic false positives like just 'Santiago' or just 'Rodriguez'
        is_match = False
        if len(common_words) >= 2:
            # check if both words are surnames (first 2 words of student)
            if s_words[0] in row_norm and s_words[1] in row_norm:
                is_match = True
            elif len(s_words) >= 3 and (s_words[0] in row_norm or s_words[1] in row_norm) and any(w in row_norm for w in s_words[2:]):
                is_match = True
                
        if is_match:
            # extract phones
            phones = []
            for k, v in cr.items():
                if 'phone' in k.lower() and 'value' in k.lower() and v.strip():
                    cp = clean_phone(v)
                    if cp:
                        phones.append((k, v, cp))
            if phones:
                matched_entries.append({
                    'fn': fn,
                    'ln': ln,
                    'phones': phones,
                    'notes': notes
                })
    results[s_name] = matched_entries

found_count = sum(1 for v in results.values() if v)
print(f'Total T1 students matched with phone in contacts.csv: {found_count} / {len(t1_students)}')

for st in t1_students:
    n = st['nombre']
    entries = results[n]
    if entries:
        print(f"\n[OK] {st['grupo']} | {n}:")
        for e in entries:
            ph_str = ', '.join([f"{p[2]} (orig: {p[1]})" for p in e['phones']])
            print(f"     Contact: '{e['fn']} {e['ln']}' -> {ph_str}")
    else:
        print(f"[MISSING] {st['grupo']} | {n}")
