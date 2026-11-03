import openpyxl, re, unicodedata, csv, sys, os
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
    s = s.replace('&Oacute;', 'Ó').replace('&Aacute;', 'Á').replace('&Eacute;', 'É').replace('&Iacute;', 'Í').replace('&Uacute;', 'Ú').replace('&Ntilde;', 'Ñ')
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

def clean_email(val):
    if val is None: return ''
    s = clean_str(val).lower()
    if 'no ' in s or 'sin ' in s or '---' in s or '@' not in s:
        return ''
    m = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', s)
    return m.group(0) if m else ''

def extract_parent_and_phone(text):
    if not text: return '', ''
    s = clean_str(text)
    if 'no aplica' in s.lower() or 'sin datos' in s.lower() or '---' in s:
        return '', ''
    phone = clean_phone(s)
    name = re.sub(r'\b\d{7,}\b', '', s)
    name = re.sub(r'\b(Sra|Sr|Srita)\.?\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[\(\)\-\:\.]', ' ', name)
    name = ' '.join(name.strip().split())
    return name, phone

COMPOUND_PREFIXES = [
    'de la rosa', 'de la paz', 'de la luz', 'de la cruz', 'de la o', 'de la cerda',
    'de los santos', 'de los monteros',
    'de santiago', 'de aquino', 'de luis', 'de jesus',
    'del valle', 'del moral', 'del angel', 'del carmen', 'del rio',
    'san martin', 'san juan', 'santa maria',
    'di maggio', 'di\\maggio', 'da silva'
]

def split_apellidos_nombres(raw_name):
    s = clean_str(raw_name)
    s = s.replace('_', '').replace('Di\\Maggio', 'Di Maggio')
    s = re.sub(r'\s+', ' ', s)
    words = s.split(' ')
    lower_s = s.lower()
    
    comp1 = None
    for cp in COMPOUND_PREFIXES:
        if lower_s.startswith(cp + ' '):
            comp1 = s[:len(cp)]
            rest = s[len(cp)+1:].strip()
            break
            
    if comp1:
        lower_rest = rest.lower()
        comp2 = None
        for cp in COMPOUND_PREFIXES:
            if lower_rest.startswith(cp + ' '):
                comp2 = rest[:len(cp)]
                rest2 = rest[len(cp)+1:].strip()
                break
        if comp2:
            ap1, ap2, nombres = comp1, comp2, rest2
        else:
            rest_words = rest.split(' ')
            ap1 = comp1
            ap2 = rest_words[0] if len(rest_words)>0 else ''
            nombres = ' '.join(rest_words[1:])
        return nombres, f"{ap1} {ap2}".strip()

    w0 = words[0]
    rest_after_w0 = ' '.join(words[1:])
    lower_after_w0 = rest_after_w0.lower()
    comp2 = None
    for cp in COMPOUND_PREFIXES:
        if lower_after_w0.startswith(cp + ' '):
            comp2 = rest_after_w0[:len(cp)]
            rest2 = rest_after_w0[len(cp)+1:].strip()
            break
    if comp2:
        ap1, ap2, nombres = w0, comp2, rest2
        return nombres, f"{ap1} {ap2}".strip()

    if len(words) == 2:
        return words[1], words[0]
    elif len(words) == 3:
        return words[2], f"{words[0]} {words[1]}"
    elif len(words) >= 4:
        return ' '.join(words[2:]), f"{words[0]} {words[1]}"
        
    return s, ''

# 1. Load GRUPOS
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

print(f'Total alumnos en GRUPOS: {len(alumnos_g)}')

# 2. Multi-source DB
db = {}

def add_entry(key_name, madre_n, madre_tel, madre_mail, padre_n, padre_tel, padre_mail, src):
    k = norm(key_name)
    if not k: return
    mt = clean_phone(madre_tel)
    pt = clean_phone(padre_tel)
    mm = clean_email(madre_mail)
    pm = clean_email(padre_mail)
    mn = clean_str(madre_n)
    pn = clean_str(padre_n)
    
    if k not in db:
        db[k] = {
            'madre_n': mn,
            'madre_tel': mt,
            'madre_mail': mm,
            'padre_n': pn,
            'padre_tel': pt,
            'padre_mail': pm,
            'src': src
        }
    else:
        curr = db[k]
        if not curr['madre_tel'] and mt: curr['madre_tel'] = mt
        if not curr['madre_n'] and mn: curr['madre_n'] = mn
        if not curr['madre_mail'] and mm: curr['madre_mail'] = mm
        if not curr['padre_tel'] and pt: curr['padre_tel'] = pt
        if not curr['padre_n'] and pn: curr['padre_n'] = pn
        if not curr['padre_mail'] and pm: curr['padre_mail'] = pm

# Source A: Bases de datos Boston todos los niveles.xlsx
wb_b = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\Bases de datos Boston todos los niveles.xlsx', data_only=True)
for sname in wb_b.sheetnames:
    ws = wb_b[sname]
    rows = list(ws.iter_rows(values_only=True))
    for r in rows:
        if not r or not r[0]: continue
        n = clean_str(r[0])
        if 'nombre' in n.lower() or 'alumno' in n.lower(): continue
        mn = clean_str(r[1]) if len(r)>1 else ''
        mt = r[2] if len(r)>2 else ''
        mm = r[3] if len(r)>3 else ''
        pn = clean_str(r[4]) if len(r)>4 else ''
        pt = r[5] if len(r)>5 else ''
        pm = r[6] if len(r)>6 else ''
        add_entry(n, mn, mt, mm, pn, pt, pm, f'Bases_de_datos_{sname}')

# Source B: Base de datos alumnos 24-25.xlsx
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
    pass

# Source C: HUGO - DATOS NUEVO INGRESO SEC (2024-2025).xlsx
try:
    wb_hugo = openpyxl.load_workbook(r'd:\OneDrive - Colegio Boston\HUGO - DATOS NUEVO INGRESO SEC (2024-2025).xlsx', data_only=True)
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
    pass

# Source D: C:\Users\hugog\Downloads\contacts.csv (Salud Escolar Phone Contacts)
try:
    with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
        c_reader = list(csv.DictReader(f))
        
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
        
        # match against alumnos_g to find correct student
        target_ag = None
        cn_words = [w for w in norm(clean_n).split() if len(w) > 2]
        if len(cn_words) >= 2:
            for ag in alumnos_g:
                ag_norm = norm(ag['nombre_raw'])
                ag_words = ag_norm.split()
                # If both surnames match or first surname + first name match
                if len(ag_words) >= 2 and ag_words[0] in cn_words and ag_words[1] in cn_words:
                    target_ag = ag
                    break
                elif len(ag_words) >= 3 and ag_words[0] in cn_words and any(w in cn_words for w in ag_words[2:]):
                    target_ag = ag
                    break
        elif len(cn_words) == 1 and cn_words[0] in ('taylor',):
            for ag in alumnos_g:
                if 'taylor' in norm(ag['nombre_raw']):
                    target_ag = ag
                    break
                    
        if target_ag:
            k = norm(target_ag['nombre_raw'])
            if k not in db:
                db[k] = {'madre_n': '', 'madre_tel': '', 'madre_mail': '', 'padre_n': '', 'padre_tel': '', 'padre_mail': '', 'src': 'contacts.csv'}
            curr = db[k]
            if rel == 'Mamá':
                if not curr['madre_tel']:
                    curr['madre_tel'] = phone
                    # if no name or empty, extract name if available
                    if not curr['madre_n']:
                        curr['madre_n'] = clean_n
            elif rel in ('Papá', 'Abuelo(a)', 'Tutor'):
                if not curr['padre_tel']:
                    curr['padre_tel'] = phone
                    if not curr['padre_n']:
                        curr['padre_n'] = f"{rel}: {clean_n}"
            elif rel == 'Alumno':
                # if no phone at all, assign
                if not curr['madre_tel'] and not curr['padre_tel']:
                    curr['padre_tel'] = phone
                    curr['padre_n'] = 'Alumno'
except Exception as e:
    print('Error on contacts.csv:', e)

print(f'Total students in DB after Salud: {len(db)}')

# Check statistics across all 341 students
by_grp = defaultdict(lambda: {'total': 0, 'has_phone': 0, 'no_phone': 0})
total_with_phone = 0
total_no_phone = 0

for ag in alumnos_g:
    grp = ag['grupo']
    by_grp[grp]['total'] += 1
    nag = norm(ag['nombre_raw'])
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

    if entry and (entry.get('madre_tel') or entry.get('padre_tel')):
        by_grp[grp]['has_phone'] += 1
        total_with_phone += 1
    else:
        by_grp[grp]['no_phone'] += 1
        total_no_phone += 1

print(f'\nTOTAL WITH PHONE: {total_with_phone} / 341 ({total_with_phone/341*100:.1f}%)')
print(f'TOTAL NO PHONE:   {total_no_phone} / 341')
print('\nBreakdown by group:')
for g in sorted(by_grp.keys()):
    st = by_grp[g]
    print(f"  {g:5s}: Total={st['total']:2d} | With Phone={st['has_phone']:2d} | No Phone={st['no_phone']:2d}")

print('\n=== T1A and T1B Detailed Status ===')
for ag in alumnos_g:
    if ag['grupo'] in ('T1A', 'T1B'):
        raw = ag['nombre_raw']
        grp = ag['grupo']
        nag = norm(raw)
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

        m_tel = entry['madre_tel'] if entry else ''
        p_tel = entry['padre_tel'] if entry else ''
        m_n = entry['madre_n'] if entry else ''
        p_n = entry['padre_n'] if entry else ''
        src = entry['src'] if entry else 'NONE'
        
        status = f"P1: {m_tel} ({m_n}) | P2: {p_tel} ({p_n}) [src: {src}]" if (m_tel or p_tel) else "NO PHONE"
        print(f"[{grp}] {raw:35s} -> {status}")

