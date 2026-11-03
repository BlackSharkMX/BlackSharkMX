import openpyxl, os, unicodedata, subprocess, time

FILE_PATH = r"D:\OneDrive - Colegio Boston\Agente IA Boston\Documentos\Calificaciones Informática - Preparatoria 08-09-2026.xlsx"

STUDENTS_1A = [
    (4, 'Arriaga Esquivel Regina', ['regina', 'arriaga']),
    (5, 'Béquer González Fernanda', ['fernanda', 'bequer', 'buquer']),
    (6, 'Cruz Elizaola Iker', ['iker', 'cruz']),
    (7, 'De Aquino Hernández Hanne', ['hanne', 'aquino']),
    (8, 'Demeza Astudillo Daniel', ['daniel', 'demeza']),
    (9, 'Domínguez Ríos Sara Elena', ['sara', 'dominguez']),
    (10, 'Dorantes Quevedo Sofía', ['sofia', 'dorantes']),
    (11, 'Estrada Márquez Ethan Arturo', ['ethan', 'estrada']),
    (12, 'Gutiérrez Ávila Raúl', ['raul gutierrez', 'avila']),
    (13, 'Hernández Aguirre Emilio', ['emilio', 'aguirre']),
    (14, 'Maldonado Aguilar Carlos Eduardo', ['carlos', 'maldonado']),
    (15, 'Mejía Aguilar Raúl Jasiel', ['raul mejia', 'jasiel']),
    (16, 'Merino Bazaldua Marco Aurelio', ['marco', 'merino', 'marco aurelio']),
    (17, 'Molina Lozano Mateo', ['mateo', 'molina']),
    (18, 'Ortega Manzanero Karen Sofía', ['karen', 'ortega']),
    (19, 'Pérez Ramírez Luis Obviam', ['obviam', 'luis obviam', 'perez ramirez']),
    (20, 'Quiroz Hernández Eric Adalid', ['eric', 'quiroz', 'adalid']),
    (21, 'Rodríguez Durán Santiago', ['santiago duron', 'duron', 'duran', 'santiago duran']),
    (22, 'Rosete Ruíz Andree Sebastian', ['rosete', 'rossete', 'andree', 'sebastian rosete']),
    (23, 'Rubio Pérez Frida Selene', ['frida', 'rubio']),
    (24, 'Salgado Avilez Isis Mariana', ['isis', 'salgado']),
    (25, 'Tinoco Cordero Aldo', ['aldo', 'tinoco']),
    (26, 'Torres Inchaurregui Ruiz Leonardo Paolo', ['leonardo', 'paolo', 'torres']),
    (27, 'Zamora Bretón Juan Carlo', ['zamora', 'juan carlo'])
]

def clean(text):
    if not text:
        return ""
    return "".join(c for c in unicodedata.normalize('NFD', str(text).lower()) if unicodedata.category(c) != 'Mn')

def find_student(query):
    q = clean(query)
    # Check aliases
    for r, name, aliases in STUDENTS_1A:
        for alias in aliases:
            if clean(alias) in q or q in clean(alias):
                return r, name
                
    # Substring search in full name
    matches = []
    for r, name, aliases in STUDENTS_1A:
        n = clean(name)
        if all(part in n for part in q.split()):
            matches.append((r, name))
            
    if len(matches) == 1:
        return matches[0]
    return matches

def record_notebook_grades(student_query, grades_val=10.0, sheet_name="Alumnos Primero A"):
    match = find_student(student_query)
    if isinstance(match, list):
        if not match:
            return False, f"No se encontró a ningún alumno con '{student_query}'"
        return False, f"Múltiples coincidencias para '{student_query}': {[m[1] for m in match]}"
        
    row_idx, full_name = match
    
    subprocess.run(["powershell", "-Command", "Stop-Process -Name 'excel' -Force -ErrorAction SilentlyContinue"], capture_output=True)
    time.sleep(1)
    
    wb = openpyxl.load_workbook(FILE_PATH)
    ws = wb[sheet_name]
    
    val = float(grades_val) if isinstance(grades_val, (int, float)) else 10.0
    ws.cell(row_idx, 14).value = val
    ws.cell(row_idx, 16).value = f"=AVERAGE(N{row_idx}:O{row_idx})"
        
    wb.save(FILE_PATH)
    subprocess.Popen(["powershell", "-Command", f"Start-Process 'excel.exe' '{FILE_PATH}'"])
    
    classroom_val = ws.cell(row_idx, 15).value
    return True, f"Registrado para {full_name} (Fila {row_idx}): Cuaderno={val}, Classroom={classroom_val}"
