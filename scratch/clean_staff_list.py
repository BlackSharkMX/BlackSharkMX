import csv, re, unicodedata, sys
from collections import defaultdict

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

from extract_staff_complete import docentes, administrativos, salud_psico, emergencias

# Deduplicate by phone number or by clean name
def deduplicate_entries(entries):
    by_phone = defaultdict(list)
    no_phone = []
    for e in entries:
        p = e['phone']
        if p:
            by_phone[p].append(e)
        else:
            no_phone.append(e)
            
    deduped = []
    for p, group in by_phone.items():
        # Pick best name: the longest, most formal name
        group.sort(key=lambda x: (
            'profr.' in x['name'].lower() or 'prof.' in x['name'].lower() or 'director' in x['name'].lower(),
            len(x['name'])
        ), reverse=True)
        best = group[0]
        # Clean double spaces
        best['name'] = re.sub(r'\s+', ' ', best['name'])
        deduped.append(best)
        
    for e in no_phone:
        e['name'] = re.sub(r'\s+', ' ', e['name'])
        # check if not already present
        if not any(d['name'].lower() == e['name'].lower() for d in deduped):
            deduped.append(e)
            
    deduped.sort(key=lambda x: x['name'])
    return deduped

docentes_clean = deduplicate_entries(docentes)
admin_clean = deduplicate_entries(administrativos)
salud_clean = deduplicate_entries(salud_psico)
emerg_clean = deduplicate_entries(emergencias)

print(f"=== 1. PLANTILLA DOCENTE ({len(docentes_clean)} contactos únicos) ===")
for d in docentes_clean:
    print(f"  • {d['name']:40s} | Tel: {d['phone']}")

print(f"\n=== 2. PERSONAL ADMINISTRATIVO Y DIRECTIVO ({len(admin_clean)} contactos únicos) ===")
for a in admin_clean:
    print(f"  • {a['name']:40s} | Tel: {a['phone']}")

print(f"\n=== 3. SALUD ESCOLAR Y PSICOLOGÍA ({len(salud_clean)} contactos únicos) ===")
for s in salud_clean:
    print(f"  • {s['name']:40s} | Tel: {s['phone']}")

print(f"\n=== 4. SERVICIOS INSTITUCIONALES Y EMERGENCIAS ({len(emerg_clean)} contactos únicos) ===")
for e in emerg_clean:
    print(f"  • {e['name']:40s} | Tel: {e['phone']}")
