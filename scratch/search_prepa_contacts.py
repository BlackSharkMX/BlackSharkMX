import csv, unicodedata, re, sys
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

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

# Let's inspect rows that have "T1", "1ero Prepa", "1er Sem", "Prepa 1"
print('Contacts mentioning Prepa or T1:')
for r in contacts_rows:
    row_txt = ' '.join([v for v in r.values() if v])
    if any(k in row_txt.lower() for k in ['prepa', 't1', '1a', '1b']):
        fn = r.get('First Name', '')
        ln = r.get('Last Name', '')
        ph = [(k, v) for k, v in r.items() if 'phone' in k.lower() and v.strip()]
        if ph:
            print(f"  '{fn} {ln}' -> {ph}")
