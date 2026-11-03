import openpyxl, subprocess, time
from openpyxl.styles import Font, Alignment, PatternFill

FILE_PATH = r"D:\OneDrive - Colegio Boston\Agente IA Boston\Documentos\Calificaciones Informática - Preparatoria 08-09-2026.xlsx"

subprocess.run(["powershell", "-Command", "Stop-Process -Name 'excel' -Force -ErrorAction SilentlyContinue"], capture_output=True)
time.sleep(1)

wb = openpyxl.load_workbook(FILE_PATH)
ws = wb["Alumnos Primero A"]

# Row 11: Ethan Arturo Estrada Márquez
row_idx = 11

# Col N (14): Calificación del cuaderno
cell_n = ws.cell(row_idx, 14)
cell_n.value = "PENDIENTE"
cell_n.font = Font(name="Arial", size=10, bold=True, color="FFC00000") # Dark red for pending
cell_n.alignment = Alignment(horizontal="center", vertical="center")
cell_n.fill = PatternFill(fill_type="solid", start_color="FFFFF2CC", end_color="FFFFF2CC") # Light yellow warning fill

# Col P (16): Formula for Promedio: If number, average; else PENDIENTE
cell_p = ws.cell(row_idx, 16)
cell_p.value = f'=IF(ISNUMBER(N{row_idx}), AVERAGE(N{row_idx}:O{row_idx}), "PENDIENTE")'
cell_p.font = Font(name="Arial", size=10, bold=True, color="FFC00000")
cell_p.alignment = Alignment(horizontal="center", vertical="center")
cell_p.fill = PatternFill(fill_type="solid", start_color="FFFFF2CC", end_color="FFFFF2CC")

wb.save(FILE_PATH)
subprocess.Popen(["powershell", "-Command", f"Start-Process 'excel.exe' '{FILE_PATH}'"])
print("Successfully marked Ethan Estrada as PENDIENTE!")
