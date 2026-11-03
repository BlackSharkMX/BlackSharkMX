import openpyxl, re, sys

# Set UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

from openpyxl.styles.cell_style import CellStyle
orig_init = CellStyle.__init__
def patched_init(self, *args, **kwargs):
    if 'xfid' in kwargs: kwargs['xfId'] = kwargs.pop('xfid')
    orig_init(self, *args, **kwargs)
CellStyle.__init__ = patched_init

wb_g = openpyxl.load_workbook(r'C:\Users\hugog\Downloads\GRUPOS SECUNDARIA Y PREPARATORIA.xlsx', data_only=True)
sheet_g = wb_g['Sheet1']
raw_rows = list(sheet_g.iter_rows(values_only=True))[1:]

# Compound particles for surnames
COMPOUND_PREFIXES = [
    'de la rosa', 'de la paz', 'de la luz', 'de la cruz', 'de la o', 'de la cerda',
    'de los santos', 'de los monteros',
    'de santiago', 'de aquino', 'de luis', 'de jesus',
    'del valle', 'del moral', 'del angel', 'del carmen', 'del rio',
    'san martin', 'san juan', 'santa maria',
    'di maggio', 'di\\maggio', 'da silva'
]

def split_apellidos_nombres(raw_name):
    # Clean up
    s = raw_name.strip()
    s = s.replace('_', '')
    s = re.sub(r'\s+', ' ', s)
    s = s.replace('Di\\Maggio', 'Di Maggio')
    
    words = s.split(' ')
    lower_s = s.lower()
    
    # Check if starts with compound prefix
    # 1. First surname compound?
    comp1 = None
    for cp in COMPOUND_PREFIXES:
        if lower_s.startswith(cp + ' '):
            comp1 = s[:len(cp)]
            rest = s[len(cp)+1:].strip()
            break
            
    if comp1:
        # Check if second surname is also compound
        lower_rest = rest.lower()
        comp2 = None
        for cp in COMPOUND_PREFIXES:
            if lower_rest.startswith(cp + ' '):
                comp2 = rest[:len(cp)]
                rest2 = rest[len(cp)+1:].strip()
                break
        if comp2:
            ap1 = comp1
            ap2 = comp2
            nombres = rest2
        else:
            rest_words = rest.split(' ')
            ap1 = comp1
            ap2 = rest_words[0]
            nombres = ' '.join(rest_words[1:])
        return nombres, f"{ap1} {ap2}".strip()

    # If first surname is not compound, check if second surname is compound
    w0 = words[0]
    rest_after_w0 = ' '.join(words[1:])
    lower_after_w0 = rest_after_w0.lower()
    comp2 = None
    for cp in COMPOUND_PREFIXES:
        if lower_after_w0.startswith(cp + ' '):
            comp2 = rest_after_w0[:len(cp)]
            rest2 = rest_after_w0[len(cp)+1:].strip()
            break
    if comp2:
        ap1 = w0
        ap2 = comp2
        nombres = rest2
        return nombres, f"{ap1} {ap2}".strip()

    # Standard cases without compound prefixes:
    # If 2 words: [Paterno] [Nombre]
    if len(words) == 2:
        return words[1], words[0]
    # If 3 words: [Paterno] [Materno] [Nombre]
    elif len(words) == 3:
        return words[2], f"{words[0]} {words[1]}"
    # If 4 words: [Paterno] [Materno] [Nombre1] [Nombre2]
    elif len(words) == 4:
        return f"{words[2]} {words[3]}", f"{words[0]} {words[1]}"
    # If 5 words: [Paterno] [Materno] [Nombre1] [Nombre2] [Nombre3]
    elif len(words) >= 5:
        return ' '.join(words[2:]), f"{words[0]} {words[1]}"
        
    return s, ''

print('Testing name splitting:')
for r in raw_rows:
    if not r[0]: continue
    orig = str(r[0]).strip()
    nombres, apellidos = split_apellidos_nombres(orig)
    full = f"{nombres} {apellidos}".strip()
    # Check if weird
    if not nombres or not apellidos or len(nombres.split()) > 3:
        print(f"CHECK: '{orig}' -> Nombres: '{nombres}' | Apellidos: '{apellidos}' -> Full: '{full}'")
