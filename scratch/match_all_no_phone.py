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
alumnos_g = []
for r in list(wb_g['Sheet1'].iter_rows(values_only=True))[1:]:
    if r[0]:
        alumnos_g.append({
            'nombre': clean_str(r[0]),
            'grupo': clean_str(r[1]),
            'seccion': clean_str(r[2])
        })

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

# Check the 32 missing students from our previous run
# We had 32 students with no_phone in Contactos_Google_Enfermeria_Colegio_Boston.csv
with open(r'C:\Users\hugog\Downloads\Contactos_Google_Enfermeria_Colegio_Boston.csv', 'r', encoding='utf-8-sig') as f:
    current_out = list(csv.DictReader(f))

no_phone_students = []
for r in current_out:
    if not r['Phone 1 - Value'] and not r['Phone 2 - Value']:
        no_phone_students.append(r['First Name'])

print(f'Total students with NO phone in previous CSV: {len(no_phone_students)}')
for nps in no_phone_students:
    print(' ', nps)

print('\nMatching these no-phone students against contacts.csv:')
recovered = {}
for nps in no_phone_students:
    # student name is before ' - '
    s_name = nps.split(' - ')[0]
    s_words = [w for w in norm(s_name).split() if len(w) > 2]
    
    matches = []
    for cr in contacts_rows:
        fn = clean_str(cr.get('First Name', ''))
        ln = clean_str(cr.get('Last Name', ''))
        mn = clean_str(cr.get('Middle Name', ''))
        notes = clean_str(cr.get('Notes', ''))
        row_str = f"{fn} {mn} {ln} {notes}"
        row_norm = norm(row_str)
        
        common_words = [w for w in s_words if w in row_norm]
        is_match = False
        if len(common_words) >= 2:
            if s_words[0] in row_norm and s_words[1] in row_norm:
                is_match = True
            elif len(s_words) >= 3 and (s_words[0] in row_norm or s_words[1] in row_norm) and any(w in row_norm for w in s_words[2:]):
                is_match = True
        if is_match:
            phones = []
            for k, v in cr.items():
                if 'phone' in k.lower() and 'value' in k.lower() and v.strip():
                    cp = clean_phone(v)
                    if cp:
                        phones.append((k, v, cp))
            if phones:
                matches.append((fn, ln, phones))
    if matches:
        recovered[s_name] = matches
        print(f'[RECOVERED] {s_name}:')
        for fn, ln, ph in matches:
            print(f"    '{fn} {ln}' -> {ph}")

print(f'\nTotal successfully recovered from contacts.csv: {len(recovered)} out of {len(no_phone_students)}!')
