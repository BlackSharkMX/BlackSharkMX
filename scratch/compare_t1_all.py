import csv, openpyxl, re, unicodedata, sys
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
            'nombre_raw': clean_str(r[0]),
            'grupo': clean_str(r[1])
        })

with open(r'C:\Users\hugog\Downloads\Contactos_Google_Enfermeria_Colegio_Boston.csv', 'r', encoding='utf-8-sig') as f:
    current_out = {r['First Name'].split(' - ')[0]: r for r in csv.DictReader(f)}

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

# Let's inspect each T1 student
for st in t1_students:
    raw = st['nombre_raw']
    grp = st['grupo']
    # check in current_out
    cur_entry = None
    for k, v in current_out.items():
        if norm(raw).split()[-1] in norm(k) or norm(raw).split()[0] in norm(k):
            # check words overlap
            if len(set(norm(raw).split()) & set(norm(k).split())) >= 2:
                cur_entry = v
                break
                
    has_prev_phone = bool(cur_entry and (cur_entry.get('Phone 1 - Value') or cur_entry.get('Phone 2 - Value')))
    
    # search contacts.csv
    # match patterns:
    # 1. both surnames
    words = [w for w in norm(raw).split() if len(w) > 2]
    pat = words[0]
    mat = words[1] if len(words) > 1 else ''
    nom = words[2:] if len(words) > 2 else []
    
    matched_cr = []
    for cr in contacts_rows:
        fn = clean_str(cr.get('First Name', ''))
        ln = clean_str(cr.get('Last Name', ''))
        mn = clean_str(cr.get('Middle Name', ''))
        full_c = f"{fn} {mn} {ln}"
        c_norm = norm(full_c)
        
        ph = []
        for pk, pv in cr.items():
            if 'phone' in pk.lower() and 'value' in pk.lower() and pv.strip():
                cp = clean_phone(pv)
                if cp: ph.append((pk, pv, cp))
        if not ph: continue
        
        # Match condition
        if pat in c_norm and mat in c_norm:
            matched_cr.append((full_c, ph))
        elif pat in c_norm and any(n in c_norm for n in nom):
            matched_cr.append((full_c, ph))
            
    status = "HAD PHONE" if has_prev_phone else "WAS EMPTY"
    new_status = f"FOUND {len(matched_cr)} IN CONTACTS.CSV" if matched_cr else "NOT IN CONTACTS.CSV"
    
    print(f"{grp} | {raw} | Prev: {status} | Contacts: {new_status}")
    if matched_cr:
        for fc, ph in matched_cr:
            p_str = ', '.join([p[2] for p in ph])
            print(f"      -> '{fc}' => {p_str}")
