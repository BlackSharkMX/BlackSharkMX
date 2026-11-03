import csv, unicodedata, re, sys
sys.stdout.reconfigure(encoding='utf-8')

def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-zA-Z0-9\s]', ' ', s)
    return ' '.join(s.lower().split())

missing_16 = [
    'Arriaga Esquivel Regina',
    'De Aquino Hernández Hanne',
    'Gutiérrez Ávila Raúl',
    'Hernández Aguirre Emilio',
    'Maldonado Aguilar Carlos Eduardo',
    'Quiroz Hernández Eric Adalid',
    'Rosete Ruíz Andree Sebastian',
    'Torres Inchaurregui Ruiz Leonardo Paolo',
    'Benítez García Damián',
    'Camara Jiménez Renato Zayd',
    'Martínez Montaño Iñaki Sebastian',
    'Rodríguez Salazar German Michel',
    'Sánchez García Santiago Manuel',
    'Torres Figueroa Miranda',
    'Vázquez Brigs Camila'
]

with open(r'C:\Users\hugog\Downloads\contacts.csv', 'r', encoding='utf-8', errors='replace') as f:
    contacts_rows = list(csv.DictReader(f))

for m in missing_16:
    print(f'=== Searching for: {m} ===')
    words = [w for w in norm(m).split() if len(w) > 3]
    matches = []
    for r in contacts_rows:
        row_txt = norm(' '.join([str(v) for v in r.values() if v]))
        matched = [w for w in words if w in row_txt]
        non_generic = [w for w in matched if w not in ('garcia', 'hernandez', 'sanchez', 'martinez', 'rodriguez')]
        if non_generic:
            fn = r.get('First Name', '')
            ln = r.get('Last Name', '')
            ph = [(k, v) for k, v in r.items() if 'phone' in k.lower() and v.strip()]
            matches.append((fn, ln, ph, non_generic))
    if matches:
        for fn, ln, ph, mg in matches[:5]:
            print(f'   Match on {mg}: "{fn}" "{ln}" -> {ph}')
    else:
        print('   No match.')
