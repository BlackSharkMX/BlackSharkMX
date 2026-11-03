import csv, re, unicodedata, sys, os
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# Run clean_staff_list logic to get the exact clean staff contacts
from clean_staff_list import docentes_clean, admin_clean, salud_clean, emerg_clean

EXCLUDE_ADMIN = [
    'aldo tinoco cordero', 'frida jacqueline nosti sandoval', 'rachel', 'gaby tinoco',
    'prefectura secundaria prof. rodrigo'
]

seen_p = set()

# Process Docentes
final_docentes = []
for d in docentes_clean:
    p = d['phone']
    name = d['name']
    if 'admisiones boston' in name.lower():
        continue
    if p: seen_p.add(p)
    final_docentes.append(d)

# Process Administrativos
final_admin = []
# Add Admisiones Boston Miss Sky to Admin
for d in docentes_clean:
    if 'admisiones boston' in d['name'].lower():
        final_admin.append(d)
        if d['phone']: seen_p.add(d['phone'])

for a in admin_clean:
    low = a['name'].lower()
    if any(ex in low for ex in EXCLUDE_ADMIN): continue
    if a['phone'] in seen_p: continue
    final_admin.append(a)
    if a['phone']: seen_p.add(a['phone'])

# Process Salud y Psicologia
final_salud = []
for s in salud_clean:
    if s['phone'] in seen_p and s['name'].lower().startswith('miss adriana'):
        continue
    final_salud.append(s)
    if s['phone']: seen_p.add(s['phone'])

print(f'Total Docentes: {len(final_docentes)}')
print(f'Total Admin: {len(final_admin)}')
print(f'Total Salud: {len(final_salud)}')
print(f'Total Emergencias: {len(emerg_clean)}')

# Now append to Google Contacts CSV
csv_path = r'c:\Users\hugog\Downloads\Contactos_Google_Enfermeria_Colegio_Boston.csv'
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    existing_contacts = list(csv.DictReader(f))
    headers = list(existing_contacts[0].keys())

print(f'Existing student contacts in CSV: {len(existing_contacts)}')

new_staff_rows = []

def make_staff_row(name, phone, org_title, category_label, notes=''):
    r = {h: '' for h in headers}
    r['First Name'] = name
    r['Organization Name'] = 'Colegio Boston'
    r['Organization Title'] = org_title
    r['Organization Department'] = category_label
    r['Labels'] = f"* myContacts ::: {category_label}"
    r['Notes'] = f"{name} - {org_title} Colegio Boston\n{notes}".strip()
    if phone:
        r['Phone 1 - Label'] = 'Mobile'
        r['Phone 1 - Value'] = phone
    return r

# Add Docentes
for d in final_docentes:
    title = 'Docente / Profesor(a)'
    if 'director' in d['name'].lower() or 'dirección' in d['name'].lower():
        title = 'Dirección Escolar'
    elif 'tutor' in d['name'].lower():
        title = 'Tutoría Docente'
    new_staff_rows.append(make_staff_row(d['name'], d['phone'], title, 'Plantilla Docente'))

# Add Admin
for a in final_admin:
    title = 'Personal Administrativo'
    if 'recepción' in a['name'].lower():
        title = 'Recepción'
    elif 'admision' in a['name'].lower():
        title = 'Admisiones'
    elif 'cafeteria' in a['name'].lower() or 'cafetería' in a['name'].lower():
        title = 'Cafetería Escolar'
    elif 'prefectura' in a['name'].lower():
        title = 'Prefectura'
    elif 'lic. sergio' in a['name'].lower():
        title = 'Dirección / Administración'
    new_staff_rows.append(make_staff_row(a['name'], a['phone'], title, 'Personal Administrativo'))

# Add Salud y Psicologia
for s in final_salud:
    title = 'Salud Escolar y Psicología'
    if 'enfermer' in s['name'].lower():
        title = 'Enfermería Escolar'
    elif 'psico' in s['name'].lower():
        title = 'Psicopedagogía y Psicología'
    new_staff_rows.append(make_staff_row(s['name'], s['phone'], title, 'Salud Escolar y Psicología'))

# Add Emergencias (only if phone or title)
for e in emerg_clean:
    new_staff_rows.append(make_staff_row(e['name'], e['phone'], 'Servicio de Emergencia', 'Servicios de Emergencia'))

print(f'Total new staff contacts to append: {len(new_staff_rows)}')

all_contacts = existing_contacts + new_staff_rows
print(f'Total combined contacts: {len(all_contacts)}')

# Write out updated CSV to both paths
out_paths = [
    r'd:\OneDrive - Colegio Boston\Agente IA Boston\direccion_academica\gestion_escolar\Contactos_Google_Enfermeria_Colegio_Boston.csv',
    r'c:\Users\hugog\Downloads\Contactos_Google_Enfermeria_Colegio_Boston.csv'
]

for p in out_paths:
    with open(p, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(all_contacts)
    print(f'Saved updated CSV with staff to: {p}')
