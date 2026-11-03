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

from openpyxl.styles.cell_style import CellStyle
orig_init = CellStyle.__init__
def patched_init(self, *args, **kwargs):
    if 'xfid' in kwargs: kwargs['xfId'] = kwargs.pop('xfid')
    orig_init(self, *args, **kwargs)
CellStyle.__init__ = patched_init

wb_g = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\GRUPOS SECUNDARIA Y PREPARATORIA.xlsx', data_only=True)
t1_names = [r[0] for r in wb_g['Sheet1'].iter_rows(values_only=True) if r[1] in ('T1A', 'T1B')]

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

print(f'Total contacts in contacts.csv: {len(contacts_rows)}')
print(f'Total T1 students: {len(t1_names)}')

found_in_contacts = {}

for t in t1_names:
    t_words = [w for w in norm(t).split() if len(w) > 2]
    matches = []
    for r in contacts_rows:
        row_txt = norm(' '.join([str(v) for v in r.values() if v]))
        matched_words = [w for w in t_words if w in row_txt]
        # if both surname words match or surname + firstname
        if len(matched_words) >= 2:
            phones = [(k, v) for k, v in r.items() if 'phone' in k.lower() and v.strip()]
            fn = r.get('First Name', '')
            ln = r.get('Last Name', '')
            notes = r.get('Notes', '')
            matches.append((fn, ln, phones, notes))
    if matches:
        found_in_contacts[t] = matches

print(f'T1 students found in contacts.csv: {len(found_in_contacts)} / {len(t1_names)}')
for t, m in found_in_contacts.items():
    print(f'=== {t} ===')
    for fn, ln, ph, nt in m:
        print(f'   Name: "{fn}" "{ln}" | Phones: {ph}')
