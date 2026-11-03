import openpyxl, re, unicodedata, csv, sys
sys.stdout.reconfigure(encoding='utf-8')

from test_with_salud import t1_students, db, norm

print('=== T1A and T1B Students Phone Status ===')
for st in t1_students:
    raw = st['nombre_raw']
    grp = st['grupo']
    k = norm(raw)
    entry = db.get(k)
    m_tel = entry['madre_tel'] if entry else ''
    p_tel = entry['padre_tel'] if entry else ''
    m_n = entry['madre_n'] if entry else ''
    p_n = entry['padre_n'] if entry else ''
    src = entry['src'] if entry else 'NONE'
    
    status = f"P1: {m_tel} ({m_n}) | P2: {p_tel} ({p_n}) [src: {src}]" if (m_tel or p_tel) else "NO PHONE"
    print(f"[{grp}] {raw:35s} -> {status}")
