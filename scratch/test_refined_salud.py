import openpyxl, re, unicodedata, csv, sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

from openpyxl.styles.cell_style import CellStyle
orig_init = CellStyle.__init__
def patched_init(self, *args, **kwargs):
    if 'xfid' in kwargs: kwargs['xfId'] = kwargs.pop('xfid')
    orig_init(self, *args, **kwargs)
CellStyle.__init__ = patched_init

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

wb_g = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\GRUPOS SECUNDARIA Y PREPARATORIA.xlsx', data_only=True)
alumnos_g = []
for r in list(wb_g['Sheet1'].iter_rows(values_only=True))[1:]:
    if r[0]:
        alumnos_g.append({
            'nombre_raw': clean_str(r[0]),
            'grupo': clean_str(r[1]),
            'seccion': clean_str(r[2]),
            'status': clean_str(r[3])
        })

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    c_reader = list(csv.DictReader(f))

# Match contacts from contacts.csv to alumnos_g with sibling awareness
student_phones = defaultdict(lambda: {'madre_tel': '', 'madre_n': '', 'padre_tel': '', 'padre_n': ''})

for r in c_reader:
    fn = clean_str(r.get('First Name', ''))
    ln = clean_str(r.get('Last Name', ''))
    mn = clean_str(r.get('Middle Name', ''))
    full_c = f"{fn} {mn} {ln}".strip()
    
    ph = []
    for pk, pv in r.items():
        if 'phone' in pk.lower() and 'value' in pk.lower() and pv.strip():
            cp = clean_phone(pv)
            if cp: ph.append(cp)
    if not ph: continue
    phone = ph[0]
    
    low = full_c.lower()
    rel = 'Alumno'
    if low.startswith('mama') or 'mamá' in low or 'mama de' in low or 'mamá de' in low:
        rel = 'Mamá'
    elif low.startswith('papa') or 'papá' in low or 'papa de' in low or 'papá de' in low:
        rel = 'Papá'
    elif 'abuel' in low:
        rel = 'Abuelo(a)'
    elif 'tio' in low or 'tío' in low or 'tutor' in low:
        rel = 'Tutor'

    clean_n = re.sub(r'^(Mamá|Mama|Papá|Papa|Abuelita|Abuelito|Abuelo|Abuela)\s*(de)?\s*', '', full_c, flags=re.IGNORECASE)
    clean_n = re.sub(r'\b(S[123][ABC]|[123][ABC]|Prepa|ext)\b', '', clean_n, flags=re.IGNORECASE).strip()
    clean_n = ' '.join(clean_n.split())
    if not clean_n or len(clean_n) < 3: continue
    
    cn_words = set(norm(clean_n).split())
    
    # Check all students in alumnos_g
    # 1. Best match: students that match first name AND surnames
    best_ag = []
    for ag in alumnos_g:
        ag_words = set(norm(ag['nombre_raw']).split())
        overlap = ag_words & cn_words
        if len(overlap) >= 3:
            best_ag.append((len(overlap), ag))
        elif len(overlap) >= 2 and len(ag_words) == 2:
            best_ag.append((len(overlap), ag))
            
    # If no 3-word overlap, fallback to matching both surnames (siblings share parent phone!)
    if not best_ag and rel in ('Mamá', 'Papá', 'Abuelo(a)', 'Tutor'):
        for ag in alumnos_g:
            ag_w = norm(ag['nombre_raw']).split()
            if len(ag_w) >= 2 and ag_w[0] in cn_words and ag_w[1] in cn_words:
                best_ag.append((2, ag))
                
    if best_ag:
        # Sort by overlap
        best_ag.sort(key=lambda x: x[0], reverse=True)
        # If top match has >= 3 words, apply only to top matches with max score
        max_score = best_ag[0][0]
        targets = [x[1] for x in best_ag if x[0] == max_score]
        
        for ag in targets:
            k = norm(ag['nombre_raw'])
            curr = student_phones[k]
            if rel == 'Mamá':
                if not curr['madre_tel']:
                    curr['madre_tel'] = phone
                    curr['madre_n'] = clean_n
            elif rel in ('Papá', 'Abuelo(a)', 'Tutor'):
                if not curr['padre_tel']:
                    curr['padre_tel'] = phone
                    curr['padre_n'] = f"{rel}: {clean_n}"
            elif rel == 'Alumno':
                if not curr['madre_tel'] and not curr['padre_tel']:
                    curr['padre_tel'] = phone
                    curr['padre_n'] = 'Alumno'

print('Testing T1 students with refined matching:')
for ag in alumnos_g:
    if ag['grupo'] in ('T1A', 'T1B'):
        k = norm(ag['nombre_raw'])
        st = student_phones.get(k)
        if st and (st['madre_tel'] or st['padre_tel']):
            print(f"  [FOUND] {ag['grupo']} | {ag['nombre_raw']:35s} -> M: {st['madre_tel']} | P: {st['padre_tel']}")
        else:
            print(f"  [NO]    {ag['grupo']} | {ag['nombre_raw']:35s}")
