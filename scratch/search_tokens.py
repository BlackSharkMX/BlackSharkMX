import csv, unicodedata, re, sys
sys.stdout.reconfigure(encoding='utf-8')

def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-zA-Z0-9\s]', ' ', s)
    return ' '.join(s.lower().split())

tokens = [
    'arriaga', 'esquivel',
    'aquino',
    'maldonado',
    'quiroz',
    'rosete',
    'inchaurregui',
    'benitez',
    'camara',
    'montano',
    'brigs'
]

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

print('Searching for tokens in contacts.csv:')
for tok in tokens:
    matches = []
    for r in contacts_rows:
        row_txt = norm(' '.join([str(v) for v in r.values() if v]))
        if tok in row_txt:
            fn = r.get('First Name', '')
            ln = r.get('Last Name', '')
            ph = [(k, v) for k, v in r.items() if 'phone' in k.lower() and v.strip()]
            matches.append((fn, ln, ph))
    if matches:
        print(f"\nToken: '{tok}' ({len(matches)} matches):")
        for fn, ln, ph in matches:
            print(f"  '{fn}' '{ln}' -> {ph}")
    else:
        print(f"\nToken: '{tok}': NO MATCH")
