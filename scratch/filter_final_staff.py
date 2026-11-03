from clean_staff_list import docentes_clean, admin_clean, salud_clean, emerg_clean
import re

# Students or duplicates to remove
EXCLUDE_ADMIN = [
    'aldo tinoco cordero', 'frida jacqueline nosti sandoval', 'rachel', 'gaby tinoco',
    'prefectura secundaria prof. rodrigo'  # already in docentes Profr. Rodrigo Castro Prefectura
]

final_admin = []
seen_p = {d['phone'] for d in docentes_clean if d['phone']}

for a in admin_clean:
    low = a['name'].lower()
    if any(ex in low for ex in EXCLUDE_ADMIN):
        continue
    if a['phone'] in seen_p:
        continue
    final_admin.append(a)
    if a['phone']: seen_p.add(a['phone'])

# Filter salud
final_salud = []
for s in salud_clean:
    if s['phone'] in seen_p and s['name'].lower().startswith('miss adriana'):
        continue
    final_salud.append(s)
    if s['phone']: seen_p.add(s['phone'])

print(f"Docentes ({len(docentes_clean)}):")
for d in docentes_clean:
    print(f"  • {d['name']} -> {d['phone']}")

print(f"\nAdministrativos ({len(final_admin)}):")
for a in final_admin:
    print(f"  • {a['name']} -> {a['phone']}")

print(f"\nSalud y Psicología ({len(final_salud)}):")
for s in final_salud:
    print(f"  • {s['name']} -> {s['phone']}")

print(f"\nEmergencias ({len(emerg_clean)}):")
for e in emerg_clean:
    print(f"  • {e['name']} -> {e['phone']}")
