import re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

input_path = r'D:\OneDrive - Colegio Boston\Escritorio\Catalogo_Completo_Abarrotes_Eleventa.xlsx'
output_path = r'D:\OneDrive - Colegio Boston\Escritorio\Catalogo_Completo_Abarrotes_Eleventa.xlsx'
workspace_path = r'D:\OneDrive - Colegio Boston\Agente IA Boston\Catalogo_Completo_Abarrotes_Eleventa.xlsx'

wb_in = openpyxl.load_workbook(input_path, read_only=True)
ws_in = wb_in.active

def clean_barcode(code_str):
    code = str(code_str).strip()
    # If scientific notation somehow occurred:
    if 'e+' in code.lower():
        try:
            code = f'{float(code):.0f}'
        except:
            pass
    # If 11 digits (UPC-A missing leading zero)
    if len(code) == 11 and code.isdigit():
        code = '0' + code
    elif len(code) == 7 and code.isdigit():
        code = '0' + code
    return code

def clean_description(desc):
    # Fix common typographical artifacts from decoding
    d = desc.strip()
    d = re.sub(r'\s+', ' ', d)
    d = d.replace('Duvaln', 'Duvalin')
    d = d.replace('paal', 'Pañal')
    d = d.replace('Paal', 'Pañal')
    d = d.replace('pia', 'Piña')
    d = d.replace('Pia', 'Piña')
    d = d.replace('champinon', 'Champiñón')
    d = d.replace('Champinon', 'Champiñón')
    return d

def get_pricing_and_department(desc):
    d = desc.lower()
    dept = 'Abarrotes y Despensa'
    p_venta = 24.0
    margin = 0.22

    # Extract size units
    size_ml = 0
    size_g = 0
    size_l = 0.0
    size_kg = 0.0

    m = re.search(r'(\d+)\s*(?:ml|cf)\b', d)
    if m: size_ml = int(m.group(1))
    m = re.search(r'(\d+)\s*(?:g|gr|gms|j)\b', d)
    if m: size_g = int(m.group(1))
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:l|lt|u)\b', d)
    if m: size_l = float(m.group(1))
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|k|dj)\b', d)
    if m: size_kg = float(m.group(1))

    # Bebés y Maternidad
    if any(k in d for k in ['gerber', 'pañal', 'panal', 'huggies', 'kleenbebe', 'mamila', 'toallitas humedas', 'toallita humeda', 'biberon', 'cerelac', 'nan 1', 'nan 2', 'nido infantil']):
        dept = 'Bebés y Maternidad'
        margin = 0.20
        if 'gerber' in d: p_venta = 22.0 if size_g >= 150 else 18.0
        elif any(k in d for k in ['pañal', 'panal']): p_venta = 85.0 if ('etapa' in d or size_g >= 20) else 65.0
        elif 'mamila' in d or 'biberon' in d: p_venta = 38.0
        elif 'toallita' in d: p_venta = 35.0
        else: p_venta = 45.0

    # Vinos y Licores
    elif any(k in d for k in ['teq', 'tequila', 'ron ', 'vodka', 'whisky', 'whiskey', 'brandy', 'cerveza', 'corona', 'victoria', 'modelo', 'tecate', 'xx', 'sol', 'indio', 'ultra', 'caguama', 'caguamon', 'bacardi', 'smirnoff', 'jose cuervo', 'jimador', 'don julio', 'centenario', 'licor']):
        dept = 'Vinos y Licores'
        margin = 0.18
        if any(k in d for k in ['cerveza', 'corona', 'victoria', 'modelo', 'tecate', 'xx', 'sol', 'indio']):
            if 'caguama' in d or 'caguamon' in d or size_l >= 1 or size_ml >= 940: p_venta = 46.0
            elif 'lata' in d or size_ml <= 355: p_venta = 24.0
            else: p_venta = 30.0
        elif any(k in d for k in ['don julio', 'buchanans', 'etiqueta roja', 'black']): p_venta = 480.0
        elif any(k in d for k in ['teq', 'tequila', 'bacardi', 'jimador', 'centenario', 'smirnoff', 'vodka', 'ron ']):
            p_venta = 240.0 if (size_l >= 0.7 or size_ml >= 700) else 150.0
        else:
            p_venta = 85.0

    # Bebidas y Refrescos
    elif any(k in d for k in ['coca', 'pepsi', 'refresco', 'soda', 'jarrito', 'fanta', 'sprite', 'squirt', 'sidral', 'mundet', 'boing', 'jumex', 'jugo', 'del valle', 'nectar', 'gatorade', 'powerade', 'agua', 'bonafont', 'ciel', 'epura', 'electrolit', 'vive 100', 'monster', 'red bull', 'amper', 'volt', 'frutsi', 'tang', 'zuko', 'valle', 'pau pau']):
        dept = 'Bebidas y Refrescos'
        margin = 0.20
        if any(k in d for k in ['agua', 'bonafont', 'ciel', 'epura']):
            if size_l >= 4 or 'galon' in d: p_venta = 44.0
            elif size_l >= 1.5 or size_ml >= 1500: p_venta = 20.0
            elif size_l >= 1 or size_ml >= 1000: p_venta = 16.0
            else: p_venta = 13.0
        elif any(k in d for k in ['gatorade', 'powerade', 'electrolit']):
            p_venta = 30.0 if size_ml <= 600 else 36.0
        elif any(k in d for k in ['monster', 'red bull']):
            p_venta = 46.0
        elif any(k in d for k in ['vive 100', 'volt', 'amper']):
            p_venta = 20.0
        elif any(k in d for k in ['frutsi', 'pau pau', 'boing']):
            p_venta = 10.0 if size_ml <= 250 else 18.0
        elif any(k in d for k in ['tang', 'zuko', 'sobre de polvo']):
            p_venta = 6.5
        else: # Refrescos / Jugos
            if size_l >= 3 or size_ml >= 3000: p_venta = 52.0
            elif size_l >= 2.5 or size_ml >= 2500: p_venta = 45.0
            elif size_l >= 2 or size_ml >= 2000: p_venta = 38.0
            elif size_l >= 1.5 or size_ml >= 1500: p_venta = 30.0
            elif size_l >= 1 or size_ml >= 1000: p_venta = 26.0
            elif size_ml >= 500: p_venta = 21.0
            elif size_ml >= 300 or 'lata' in d: p_venta = 19.0
            elif size_ml > 0 and size_ml <= 250: p_venta = 13.0
            else: p_venta = 20.0

    # Botanas y Frituras
    elif any(k in d for k in ['sabritas', 'doritos', 'ruffles', 'cheetos', 'takis', 'barcel', 'chips', 'frituras', 'tostadas', 'cacahuate', 'cacahuates', 'churritos', 'palomitas', 'totis', 'chicharron', 'semillas']):
        dept = 'Botanas y Frituras'
        margin = 0.22
        if size_g >= 150 or 'comparte' in d or 'familiar' in d: p_venta = 52.0
        elif size_g >= 90: p_venta = 42.0
        elif size_g >= 55: p_venta = 25.0
        elif size_g >= 35: p_venta = 20.0
        elif 'cacahuate' in d: p_venta = 16.0
        elif 'palomitas' in d: p_venta = 22.0
        elif 'tostadas' in d: p_venta = 34.0
        else: p_venta = 22.0

    # Galletas y Pan Dulce
    elif any(k in d for k in ['galleta', 'galletas', 'bimbo', 'marinela', 'gamesa', 'tia rosa', 'marias', 'emperador', 'chokis', 'oreo', 'gansito', 'nito', 'choco roles', 'donitas', 'panque', 'roles', 'mantecadas', 'barritas', 'submarinos', 'polvorones', 'suavicremas', 'pan dulce', 'pan blanco', 'pan integral', 'tortillinas', 'rebanada', 'pan tostado', 'canelitas', 'trikitrakes', 'napolitano', 'colchones']):
        dept = 'Galletas y Pan Dulce'
        margin = 0.22
        if any(k in d for k in ['pan blanco', 'pan integral', 'bimbollos', 'medias noches']):
            p_venta = 54.0 if ('grande' in d or size_g >= 600) else 44.0
        elif any(k in d for k in ['tortillinas', 'tortilla de harina']):
            p_venta = 28.0
        elif any(k in d for k in ['gansito', 'nito', 'choco roles', 'donitas', 'mantecadas', 'barrita', 'barritas', 'submarinos', 'napolitano']):
            p_venta = 24.0
        elif any(k in d for k in ['canelitas', 'trikitrakes', 'polvorones', 'suavicremas']):
            p_venta = 22.0
        elif size_g >= 300 or 'caja' in d: p_venta = 48.0
        elif size_g >= 120: p_venta = 26.0
        else: p_venta = 22.0

    # Lácteos y Derivados
    elif any(k in d for k in ['leche', 'lala', 'alpura', 'nutrileche', 'santa clara', 'yogurt', 'yoghurt', 'yoplait', 'danone', 'queso', 'crema', 'mantequilla', 'margarina', 'huevo', 'yakult', 'lechita']):
        dept = 'Lácteos y Derivados'
        margin = 0.18
        if 'leche' in d or 'lechita' in d:
            if size_ml <= 300: p_venta = 14.0
            elif size_l >= 1 or size_ml >= 1000: p_venta = 30.0
            else: p_venta = 28.0
        elif 'yogurt' in d or 'yoghurt' in d or 'yoplait' in d:
            if size_g >= 800 or size_l >= 1 or size_ml >= 900: p_venta = 46.0
            elif size_g >= 400: p_venta = 28.0
            else: p_venta = 16.0
        elif 'queso' in d:
            p_venta = 62.0 if (size_g >= 350) else 40.0
        elif 'crema' in d:
            p_venta = 44.0 if (size_g >= 400 or size_ml >= 400) else 24.0
        elif 'mantequilla' in d or 'margarina' in d:
            p_venta = 22.0
        elif 'huevo' in d:
            p_venta = 50.0
        else: p_venta = 28.0

    # Limpieza del Hogar
    elif any(k in d for k in ['cloro', 'cloralex', 'fabuloso', 'pinol', 'ariel', 'foca', 'roma', 'ace', 'suavitel', 'downy', 'salvo', 'axion', 'lavatrastes', 'detergente', 'limpiador', 'zote', 'papel higienico', 'servilletas', 'regio', 'petalo', 'suavel', 'kleenex', 'escoba', 'trapeador', 'blanqueador', 'ensueno', 'ajax', 'poett', 'fibra', 'scotch']):
        dept = 'Limpieza del Hogar'
        margin = 0.25
        if 'clor' in d:
            if size_l >= 3.5 or size_ml >= 3500: p_venta = 64.0
            elif size_l >= 1 or size_ml >= 950: p_venta = 24.0
            else: p_venta = 17.0
        elif any(k in d for k in ['ariel', 'foca', 'roma', 'ace', 'detergente']):
            if size_kg >= 2 or size_g >= 2000 or size_l >= 2: p_venta = 92.0
            elif size_kg >= 1 or size_g >= 900 or size_l >= 1: p_venta = 48.0
            elif size_g >= 500: p_venta = 28.0
            else: p_venta = 22.0
        elif 'zote' in d: p_venta = 24.0
        elif any(k in d for k in ['salvo', 'axion', 'lavatrastes']): p_venta = 44.0 if size_ml >= 700 else 28.0
        elif any(k in d for k in ['suavitel', 'downy', 'ensueno']): p_venta = 36.0 if size_l >= 1 else 24.0
        elif any(k in d for k in ['fabuloso', 'pinol', 'ajax', 'limpiador']): p_venta = 28.0 if size_l >= 1 else 20.0
        elif any(k in d for k in ['papel higienico', 'regio', 'petalo', 'suavel']): p_venta = 36.0
        elif 'servilletas' in d: p_venta = 26.0
        else: p_venta = 32.0

    # Cuidado Personal
    elif any(k in d for k in ['shampoo', 'acondicionador', 'caprice', 'sedal', 'head & shoulders', 'pantene', 'vanart', 'palmolive', 'camay', 'zest', 'dove', 'desodorante', 'desod', 'rexona', 'axe', 'gillete', 'gillette', 'obao', 'speed stick', 'colgate', 'pasta dental', 'cepillo', 'toallas femeninas', 'kotex', 'saba', 'rastrillo', 'talco', 'jabon de tocador', 'jabon', 'crema corporal', 'gel ego', 'gel ', 'tinte', 'imedia', 'enjuague']):
        dept = 'Cuidado Personal'
        margin = 0.25
        if 'shampoo' in d or 'acondicionador' in d or 'enjuague' in d:
            p_venta = 72.0 if size_ml >= 650 else (48.0 if size_ml >= 350 else 34.0)
        elif 'desod' in d: p_venta = 52.0
        elif 'tinte' in d: p_venta = 65.0
        elif 'gel' in d: p_venta = 32.0 if size_g >= 400 else 20.0
        elif 'colgate' in d or 'pasta' in d: p_venta = 28.0
        elif 'toalla' in d or 'saba' in d or 'kotex' in d: p_venta = 34.0
        elif 'rastrillo' in d: p_venta = 24.0
        elif 'jabon' in d: p_venta = 19.0
        else: p_venta = 36.0

    # Dulcería y Chocolates
    elif any(k in d for k in ['chocolate', 'chocolates', 'dulce', 'paleta', 'chicle', 'chicles', 'trident', 'clorets', 'bubbaloo', 'duvalin', 'carlos v', 'snickers', 'milky way', 'hershey', 'kisses', 'kitkat', 'tutsi', 'mazapan', 'pelon', 'skwinkles', 'panditas', 'pulparindo', 'lucas', 'ricolino', 'coronado', 'bocadin', 'gomitas', 'caramelo', 'tic tac', 'hall', 'halls', 'choco chispas', 'chocolulkerin']):
        dept = 'Dulcería y Chocolates'
        margin = 0.32
        if any(k in d for k in ['snickers', 'milky way', 'hershey', 'kitkat', 'kisses']):
            p_venta = 44.0 if size_g >= 80 else 24.0
        elif any(k in d for k in ['duvalin', 'mazapan', 'bocadin', 'pelon', 'pulparindo', 'tutsi', 'limoncito']):
            p_venta = 8.0
        elif any(k in d for k in ['trident', 'clorets', 'tic tac', 'halls', 'hall']): p_venta = 14.0
        elif any(k in d for k in ['chicle', 'bubbaloo']): p_venta = 4.0
        elif 'paleta' in d: p_venta = 7.0
        elif size_g >= 150 or 'caja' in d or 'bolsa' in d: p_venta = 48.0
        else: p_venta = 18.0

    # Enlatados y Conservas
    elif any(k in d for k in ['atun', 'sardina', 'sardinas', 'chile', 'chiles', 'herdez', 'la costena', 'costena', 'del fuerte', 'champiñon', 'champiñón', 'champinon', 'elote', 'verduras', 'ensalada', 'frijoles bayos', 'frijoles negros', 'pure de tomate', 'pure', 'calmex', 'dolores', 'tuny']):
        dept = 'Enlatados y Conservas'
        margin = 0.20
        if 'atun' in d: p_venta = 24.0
        elif 'sardina' in d: p_venta = 34.0
        elif 'chile' in d: p_venta = 19.0 if size_g <= 250 else 34.0
        elif 'pure' in d: p_venta = 13.0
        elif 'elote' in d or 'verdura' in d: p_venta = 19.0
        elif 'frijol' in d: p_venta = 22.0
        else: p_venta = 24.0

    # Desechables y Plásticos
    elif any(k in d for k in ['vaso', 'vasos', 'plato', 'platos', 'tenedor', 'cuchara', 'bolsa de plastico', 'bolsa para basura', 'bolsas', 'plastico', 'aluminio', 'papel aluminio', 'reynolds']):
        dept = 'Desechables y Plásticos'
        margin = 0.28
        if 'aluminio' in d: p_venta = 38.0
        elif size_g >= 100 or 'paq' in d: p_venta = 32.0
        else: p_venta = 22.0

    # Cigarros y Tabaco
    elif any(k in d for k in ['cigarro', 'cigarros', 'marlboro', 'pall mall', 'montana', 'boots', 'benson', 'delicados', 'camel', 'chesterfield', 'lucky', 'cajetilla', 'cig ']):
        dept = 'Cigarros y Tabaco'
        margin = 0.12
        p_venta = 82.0 if ('cajetilla' in d or size_g >= 20) else 45.0

    # Farmacia y Salud
    elif any(k in d for k in ['aspirina', 'paracetamol', 'pepto', 'alka seltzer', 'picot', 'sal de uvas', 'curitas', 'alcohol', 'algodon', 'jarabe', 'vitamina', 'vick', 'mentol']):
        dept = 'Farmacia y Salud'
        margin = 0.25
        if 'alka' in d or 'picot' in d or 'sal de uvas' in d: p_venta = 10.0
        elif 'curitas' in d or 'aspirina' in d: p_venta = 15.0
        else: p_venta = 32.0

    # Alimentos para Mascotas
    elif any(k in d for k in ['pedigree', 'dog chow', 'whiskas', 'purina', 'cat chow', 'campeon', 'croquetas', 'perro', 'gato']):
        dept = 'Alimentos para Mascotas'
        margin = 0.20
        p_venta = 68.0 if (size_kg >= 1 or size_g >= 1000) else 35.0

    # Varios y Papelería
    elif any(k in d for k in ['veladora', 'vela', 'cerillos', 'fosforos', 'la central', 'lapiz', 'pluma', 'cuaderno', 'libreta', 'pegamento', 'resistol', 'uhu', 'pila', 'pilas', 'duracell', 'energizer', 'foco']):
        dept = 'Varios y Papelería'
        margin = 0.28
        if 'veladora' in d or 'vela' in d: p_venta = 24.0
        elif 'cerillos' in d or 'fosforos' in d: p_venta = 6.0
        elif 'pila' in d: p_venta = 35.0
        elif 'pegamento' in d or 'uhu' in d: p_venta = 18.0
        else: p_venta = 20.0

    # Abarrotes y Despensa (Resto de despensa: Aceites, Harinas, Arroz, Frijol, Pastas, Salsas, etc.)
    else:
        dept = 'Abarrotes y Despensa'
        margin = 0.18
        if 'aceite' in d:
            p_venta = 52.0 if size_l >= 1 or size_ml >= 900 else 38.0
        elif 'harina' in d:
            p_venta = 26.0 if size_kg >= 1 or size_g >= 900 else 18.0
        elif any(k in d for k in ['arroz', 'frijol', 'lenteja', 'azucar']):
            p_venta = 36.0 if size_kg >= 1 or size_g >= 900 else 22.0
        elif any(k in d for k in ['sopa', 'pasta', 'espagueti', 'fideo', 'codito']):
            p_venta = 12.0
        elif any(k in d for k in ['mayonesa', 'catsup', 'mostaza', 'aderezo']):
            p_venta = 48.0 if size_g >= 600 or size_ml >= 600 else 28.0
        elif any(k in d for k in ['cafe', 'nescafe']):
            p_venta = 95.0 if size_g >= 120 else 48.0
        elif any(k in d for k in ['gelatina', 'pronto', 'dgari']):
            p_venta = 15.0
        elif any(k in d for k in ['knorr', 'consome', 'caldo']):
            p_venta = 16.0
        elif any(k in d for k in ['salsa', 'valentina', 'botanera', 'tamazula']):
            p_venta = 18.0
        else:
            p_venta = 25.0

    p_costo = round(p_venta * (1 - margin), 2)
    return dept, p_costo, p_venta

wb_out = openpyxl.Workbook()
ws_out = wb_out.active
ws_out.title = 'Productos'

headers = ['Codigo', 'Descripcion', 'Precio Costo', 'Precio Venta', 'Departamento', 'Cantidad Actual', 'Se Vende Por']
ws_out.append(headers)

# Styling headers
header_fill = PatternFill(start_color='1F4E79', end_color='1F4E79', fill_type='solid')
header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')

for col_idx in range(1, len(headers) + 1):
    cell = ws_out.cell(row=1, column=col_idx)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal='center', vertical='center')

count = 0
dept_summary = {}

for row in ws_in.iter_rows(min_row=2, values_only=True):
    raw_code = row[0]
    raw_desc = row[1]
    if not raw_code or not raw_desc:
        continue

    code = clean_barcode(raw_code)
    desc = clean_description(raw_desc)
    dept, p_costo, p_venta = get_pricing_and_department(desc)
    dept_summary[dept] = dept_summary.get(dept, 0) + 1

    r = count + 2
    c1 = ws_out.cell(row=r, column=1, value=str(code))
    c1.number_format = '@' # explicit text format
    c2 = ws_out.cell(row=r, column=2, value=str(desc))
    c3 = ws_out.cell(row=r, column=3, value=p_costo)
    c3.number_format = '$#,##0.00'
    c4 = ws_out.cell(row=r, column=4, value=p_venta)
    c4.number_format = '$#,##0.00'
    c5 = ws_out.cell(row=r, column=5, value=str(dept))
    c6 = ws_out.cell(row=r, column=6, value=100)
    c7 = ws_out.cell(row=r, column=7, value='Unidad/Pza')

    count += 1

wb_out.save(output_path)
wb_out.save(workspace_path)

print(f'Successfully processed {count} products.')
print('Department breakdown:')
for d, c in sorted(dept_summary.items(), key=lambda x: x[1], reverse=True):
    print(f'  - {d:25}: {c:5} productos')
