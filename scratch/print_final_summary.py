import openpyxl, os

FILE_PATH = r"D:\OneDrive - Colegio Boston\Agente IA Boston\Documentos\Calificaciones Informática - Preparatoria 08-09-2026.xlsx"

wb = openpyxl.load_workbook(FILE_PATH, data_only=False)
ws = wb["Alumnos Primero A"]

print(f"=== REPORTE FINAL 1 A PREPARATORIA - SEGUNDO PERIODO ===")
print(f"{'#':2} | {'Alumno':38} | {'Cuaderno':9} | {'Classroom':9} | {'Formula / Promedio'}")
print("-" * 80)
for r in range(4, 28):
    name = ws.cell(r, 1).value
    n = ws.cell(r, 14).value
    o = ws.cell(r, 15).value
    p = ws.cell(r, 16).value
    print(f"{r-3:2d} | {name:38} | {str(n):9} | {str(o):9} | {p}")
