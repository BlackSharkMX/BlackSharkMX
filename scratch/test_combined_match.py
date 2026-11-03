import openpyxl, re, unicodedata, sys
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
    if s.endswith('.0'): s = s[:-2]
    # search for 10 digits
    m = re.search(r'(\d{10})', re.sub(r'[^\d]', '', s))
    if m:
        return m.group(1)
    # check 11 digits (e.g. 17724007770)
    m11 = re.search(r'(\d{11})', re.sub(r'[^\d]', '', s))
    if m11:
        return m11.group(1)
    return ''

def extract_parent_and_phone(text):
    if not text: return '', ''
    s = clean_str(text)
    if 'no aplica' in s.lower() or 'sin datos' in s.lower() or '---' in s:
        return '', ''
    # extract phone
    phone = clean_phone(s)
    # extract name: remove digits and phone words
    name = re.sub(r'\b\d{7,}\b', '', s)
    name = re.sub(r'\b(Sra|Sr|Srita)\.?\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[\(\)\-\:\.]', ' ', name)
    name = ' '.join(name.strip().split())
    return name, phone

# 1. Load GRUPOS
wb_g = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\GRUPOS SECUNDARIA Y PREPARATORIA.xlsx', data_only=True)
alumnos_g = []
for r in list(wb_g['Sheet1'].iter_rows(values_only=True))[1:]:
    if r[0]:
        alumnos_g.append({
            'nombre': clean_str(r[0]),
            'grupo': clean_str(r[1]),
            'seccion': clean_str(r[2]),
            'status': clean_str(r[3])
        })

print(f'Total alumnos en GRUPOS: {len(alumnos_g)}')

# 2. Build multi-source DB
db = {}

def add_entry(key_name, madre_n, madre_tel, madre_mail, padre_n, padre_tel, padre_mail, src):
    k = norm(key_name)
    if not k: return
    if k not in db:
        db[k] = {
            'madre_n': madre_n,
            'madre_tel': clean_phone(madre_tel),
            'madre_mail': clean_str(madre_mail),
            'padre_n': padre_n,
            'padre_tel': clean_phone(padre_tel),
            'padre_mail': clean_str(padre_mail),
            'src': src
        }
    else:
        # update if missing phones
        curr = db[k]
        if not curr['madre_tel'] and clean_phone(madre_tel):
            curr['madre_tel'] = clean_phone(madre_tel)
            if madre_n: curr['madre_n'] = madre_n
            if madre_mail: curr['madre_mail'] = clean_str(madre_mail)
        if not curr['padre_tel'] and clean_phone(padre_tel):
            curr['padre_tel'] = clean_phone(padre_tel)
            if padre_n: curr['padre_n'] = padre_n
            if padre_mail: curr['padre_mail'] = clean_str(padre_mail)

# Source A: Bases de datos Boston todos los niveles.xlsx
wb_b = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\Bases de datos Boston todos los niveles.xlsx', data_only=True)
for sname in wb_b.sheetnames:
    ws = wb_b[sname]
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r or not r[0]: continue
        n = clean_str(r[0])
        if 'nombre' in n.lower() or 'alumno' in n.lower(): continue
        madre_n = clean_str(r[1]) if len(r)>1 else ''
        madre_tel = r[2] if len(r)>2 else ''
        madre_mail = r[3] if len(r)>3 else ''
        padre_n = clean_str(r[4]) if len(r)>4 else ''
        padre_tel = r[5] if len(r)>5 else ''
        padre_mail = r[6] if len(r)>6 else ''
        add_entry(n, madre_n, madre_tel, madre_mail, padre_n, padre_tel, padre_mail, f'Bases_de_datos_{sname}')

# Source B: Base de datos alumnos 24-25.xlsx (Concentrado Gral.)
try:
    wb_prev = openpyxl.load_workbook(r'd:\OneDrive - Colegio Boston\Base de datos alumnos 24-25.xlsx', data_only=True)
    ws = wb_prev['Concentrado Gral.']
    for r in list(ws.iter_rows(values_only=True))[4:]:
        if not r or not r[3]: continue
        pat = clean_str(r[3])
        mat = clean_str(r[4]) if len(r)>4 else ''
        nom = clean_str(r[5]) if len(r)>5 else ''
        full_name = f"{pat} {mat} {nom}".strip()
        m_txt = r[8] if len(r)>8 else ''
        p_txt = r[9] if len(r)>9 else ''
        m_mail = r[10] if len(r)>10 else ''
        p_mail = r[11] if len(r)>11 else ''
        mn, mt = extract_parent_and_phone(m_txt)
        pn, pt = extract_parent_and_phone(p_txt)
        add_entry(full_name, mn, mt, m_mail, pn, pt, p_mail, 'Concentrado_Gral_24-25')
except Exception as e:
    print('Error loading prev DB:', e)

# Source C: HUGO - DATOS NUEVO INGRESO SEC (2024-2025).xlsx
try:
    wb_hugo = openpyxl.load_workbook(r'd:\OneDrive - Colegio Boston\HUGO - DATOS NUEVO INGRESO SEC (2024-2025).xlsx', data_only=True)
    # Sheet PREPARATORIA
    ws = wb_hugo['PREPARATORIA']
    for r in list(ws.iter_rows(values_only=True))[3:]:
        if not r or not r[1]: continue
        full_name = clean_str(r[1])
        p_txt = r[2] if len(r)>2 else ''
        p_mail = r[3] if len(r)>3 else ''
        m_txt = r[4] if len(r)>4 else ''
        m_mail = r[5] if len(r)>5 else ''
        pn, pt = extract_parent_and_phone(p_txt)
        mn, mt = extract_parent_and_phone(m_txt)
        add_entry(full_name, mn, mt, m_mail, pn, pt, p_mail, 'Hugo_Prepa')
    # Sheet SECUNDARIA
    ws = wb_hugo['SECUNDARIA']
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r or not r[1]: continue
        full_name = clean_str(r[1])
        p_txt = r[2] if len(r)>2 else ''
        m_txt = r[4] if len(r)>4 else ''
        pn, pt = extract_parent_and_phone(p_txt)
        mn, mt = extract_parent_and_phone(m_txt)
        add_entry(full_name, mn, mt, '', pn, pt, '', 'Hugo_Secundaria')
except Exception as e:
    print('Error loading Hugo DB:', e)

print(f'Total entries in combined DB: {len(db)}')

# 3. Match against GRUPOS
has_phone_count = 0
no_phone_count = 0
unmatched_count = 0

grp_results = defaultdict(lambda: {'total': 0, 'has_phone': 0, 'no_phone': 0, 'unmatched': 0})

for ag in alumnos_g:
    grp = ag['grupo']
    grp_results[grp]['total'] += 1
    nag = norm(ag['nombre'])
    
    # lookup
    entry = db.get(nag)
    if not entry:
        # subset matching
        nag_words = set(nag.split())
        best_k = None
        best_common = 0
        for k in db:
            k_words = set(k.split())
            common = len(nag_words & k_words)
            if common >= 2 and len(nag_words - k_words) <= 1 and len(k_words - nag_words) <= 1:
                if common > best_common:
                    best_common = common
                    best_k = k
        if best_k:
            entry = db[best_k]
            
    if not entry:
        unmatched_count += 1
        grp_results[grp]['unmatched'] += 1
    else:
        if entry['madre_tel'] or entry['padre_tel']:
            has_phone_count += 1
            grp_results[grp]['has_phone'] += 1
        else:
            no_phone_count += 1
            grp_results[grp]['no_phone'] += 1

print(f'Results: Has Phone: {has_phone_count}, No Phone: {no_phone_count}, Unmatched: {unmatched_count}')
for g in sorted(grp_results.keys()):
    st = grp_results[g]
    print(f"  {g:5s}: total={st['total']:2d}, has_phone={st['has_phone']:2d}, no_phone={st['no_phone']:2d}, unmatched={st['unmatched']:2d}")

print('\nUnmatched students details:')
for ag in alumnos_g:
    nag = norm(ag['nombre'])
    entry = db.get(nag)
    if not entry:
        nag_words = set(nag.split())
        best_k = None
        best_common = 0
        for k in db:
            k_words = set(k.split())
            common = len(nag_words & k_words)
            if common >= 2 and len(nag_words - k_words) <= 1 and len(k_words - nag_words) <= 1:
                if common > best_common:
                    best_common = common
                    best_k = k
        if best_k:
            entry = db[best_k]
    if not entry:
        print(f"  {ag['grupo']:5s} | {ag['nombre']}")

