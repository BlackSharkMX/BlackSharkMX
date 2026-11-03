import csv, re, unicodedata, sys
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

print(f'Total contacts in contacts.csv: {len(contacts_rows)}')

# Let's inspect unique labels across all rows
labels_set = set()
for r in contacts_rows:
    lbl = r.get('Labels', '')
    if lbl:
        for l in lbl.split(':::'):
            labels_set.add(l.strip())
print('Labels found in contacts.csv:', sorted(labels_set))
