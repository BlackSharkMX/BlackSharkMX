import openpyxl, unicodedata, re
from collections import defaultdict

def clean_str(s):
    if not s: return ''
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
sheet_g = wb_g['Sheet1']

wb_b = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\Bases de datos Boston todos los niveles.xlsx', data_only=True)
db_entries = []
for sname in wb_b.sheetnames:
    ws = wb_b[sname]
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r or not r[0]: continue
        n = clean_str(r[0])
        if 'nombre' in n.lower() or 'alumno' in n.lower(): continue
        db_entries.append({
            'sheet': sname,
            'nombre': n,
            'madre': clean_str(r[1]) if len(r)>1 else '',
            'tel_m': clean_str(r[2]) if len(r)>2 else '',
            'padre': clean_str(r[4]) if len(r)>4 else '',
            'tel_p': clean_str(r[5]) if len(r)>5 else '',
        })

grp_stats = defaultdict(lambda: {'total': 0, 'has_phone': 0, 'no_phone': 0, 'unmatched': 0})

for r in list(sheet_g.iter_rows(values_only=True))[1:]:
    if not r[0]: continue
    name = clean_str(r[0])
    grp = clean_str(r[1])
    nag = norm(name)
    grp_stats[grp]['total'] += 1
    
    found = [d for d in db_entries if norm(d['nombre']) == nag]
    if not found:
        nag_words = set(nag.split())
        best_d = None
        best_common = 0
        for d in db_entries:
            nd_words = set(norm(d['nombre']).split())
            common = len(nag_words & nd_words)
            if common >= 2 and len(nag_words - nd_words) <= 1 and len(nd_words - nag_words) <= 1:
                if common > best_common:
                    best_common = common
                    best_d = d
        if best_d:
            found = [best_d]
            
    if not found:
        grp_stats[grp]['unmatched'] += 1
    else:
        d = found[0]
        tm = d['tel_m']
        tp = d['tel_p']
        has_tm = bool(re.search(r'\d{7,}', tm))
        has_tp = bool(re.search(r'\d{7,}', tp))
        if has_tm or has_tp:
            grp_stats[grp]['has_phone'] += 1
        else:
            grp_stats[grp]['no_phone'] += 1

print('Group Stats:')
for g in sorted(grp_stats.keys()):
    st = grp_stats[g]
    tot = st['total']
    hp = st['has_phone']
    np = st['no_phone']
    um = st['unmatched']
    print(f"  {g:5s}: total={tot:2d}, has_phone={hp:2d}, no_phone={np:2d}, unmatched={um:2d}")
