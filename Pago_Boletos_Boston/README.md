# Eventos Boston - Control de Pagos, Abonos y Cooperaciones
**Colegio Boston • Cuernavaca, Morelos**
*Sistema Web Escolar en Google Apps Script para el control de cobros de eventos, excursiones, graduaciones, kermesses y cooperaciones grupales.*

---

## 📌 Datos de la Secuencia de Comandos
- **Script ID:** `1Bt2OC0ZbrIyP_esxlyehhcqXtt-L1ep0n42nyrScwOrxyEYUdxf9o3LZ`
- **Última Versión Desplegada:** Versión 31
- **URL de Despliegue Web:** `https://script.google.com/macros/s/AKfycbwZd0TjHSodk3cqw64LI1VhhzsR0No-Vk7w47f1HEmOLyP7-JIzPzaDmdtsJLdPlReS6g/exec`

---

## 🚀 Novedades de la Versión 31: Tablero de Recaudación por Salón, Inferencia en Vivo, Invitados Externos y Depuración Tolantongo

1. **⚡ Inferencia en Vivo y Autocompletado Instantáneo en Búsqueda:**
   - La barra de búsqueda superior en caja (`input-busqueda-alumno-rapida`) cuenta con un menú flotante de inferencia en tiempo real (`oninput`) que filtra instantáneamente los 219 alumnos activos y participantes externos.
   - Resalta coincidencias por nombre o matrícula, navegable con teclado (`Flecha Abajo`, `Flecha Arriba`, `Enter`) y clic directo.
   - **Asignación universal garantizada:** Cualquier alumno buscado (tenga o no historial contable previo) muestra al instante todos los eventos escolares activos vigentes que le aplican (como la Excursión a Tolantongo para 3° de Secundaria) con saldo $0 abonado, saldo pendiente completo y botón de acción directa **`➕ Cobrar a este evento`**.

2. **📊 Nuevo Apartado en Menú Superior: Tablero de Métricas y Recaudación:**
   - Accesible para Cajero y Administrador desde la barra superior de apartados (`📊 Métricas y Recaudación`).
   - **Indicadores Monetarios Globales (KPIs):** Total Recaudado en efectivo, Meta Financiera esperada, Saldo Restante por cobrar y Progreso de Ocupación de Cupo con desglose de Alumnos Boston vs Externos.
   - **Recaudación por Salón (3°A, 3°B, 3°C e Invitados Externos):**
     - Tarjetas de resumen por salón con total recaudado, saldo faltante, porcentaje de avance y cantidad de alumnos.
     - **Detalle interactivo:** Acordeones desplegables con la lista completa de cada alumno del salón, estatus del boleto (`PAGADO`, `CON ABONO`, `SIN PAGO`, `CORTESÍA`), **lo que lleva abonado**, **lo que le falta por liquidar**, barra visual de progreso y botón **`💳 Cobrar`** directo.

3. **👥 Soporte Integral para Invitados Externos (Primos / Amigos):**
   - Toggle interactivo en la ventanilla de cobro: `[ 🎓 Alumno Colegio Boston ]` vs `[ 👥 Invitado Externo ]`.
   - Permite registrar nuevos invitados externos (Nombre, Teléfono/Correo y Alumno anfitrión de Boston que lo invita) generando matrícula oficial `EXT-XXXXXX`.
   - Ocupan cupo en el evento, pueden recibir abonos, liquidar o solicitar cortesía/descuento, y reciben su comprobante digital por correo electrónico.

4. **🔒 Cerrar o Terminar Evento y Depuración Anual:**
   - En el panel de administración se agregó el **Directorio y Control de Eventos Escolares** con filtros `🟢 Activos` e `📁 Histórico / Cerrados`.
   - **Cerrar Evento:** Bloquea la recepción de nuevos cobros en ventanilla y conserva todo el historial para consulta y auditoría.
   - **Reabrir Evento:** Permite reactivar un evento archivado en cualquier momento.
   - **Eliminar Definitivamente:** Permite depurar eventos obsoletos y sus registros asociados cada año con confirmación de seguridad.
   - **Depuración Tolantongo Ejecutada:** Se eliminaron todos los eventos de prueba anteriores conservando exclusivamente la **Excursión a Tolantongo** (`EV-730628`), configurada específicamente para 3° de Secundaria (`Grados: 3 | Grupos: A, B, C`, Costo: $4,400.00, Cupo: 40) y asignada a todos los cajeros activos.

---

## 🔐 Cuentas y Accesos Predeterminados
La aplicación gestiona sus credenciales en la pestaña **`Usuarios`** de la hoja de cálculo:

| Rol | Nombre Completo | Usuario | Contraseña Inicial | Estatus |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Dirección / Administrador | `admin` | `BostonAdmin2026*` | Activo |
| **Cajero** | Cajero Principal | `cajero` | `BostonCaja2026*` | Activo |

*Nota: Desde el apartado de **👥 Usuarios y Accesos** (exclusivo Admin), se pueden generar nuevos usuarios con contraseñas seguras autogeneradas (ej. `BstK83!`) y consultar el directorio completo de contraseñas.*

---

## 🚀 Novedades de la Versión 28: Flujo Ágil de Cobro y Cortesía con Descuento

1. **⚡ Flujo Continuo: Búsqueda ➔ Selección de Evento ➔ Cobro:**
   - Al buscar a cualquier alumno en la barra superior y dar clic en **`➕ Cobrar Abono`**, el sistema inyecta al instante sus datos (Grado, Grupo y Alumno seleccionado) en el módulo de cobro sin demoras ni llamadas asíncronas bloqueantes.
   - Se desplaza con scroll suave a la ventanilla de cobro y enfoca el selector de **Evento**. Una vez que el cajero elige el evento, se consulta el saldo en vivo y el cursor salta automáticamente al campo de **Monto a cobrar**.

2. **🏷️ Cortesía con Descuento (Precio Especial para Hijos de Maestros / Personal):**
   - Nuevo switch dedicado **`🏷️ Cortesía con Descuento`** disponible junto al switch de Cortesía 100% ($0.00).
   - Al activarse, despliega un campo para definir el **Precio Especial del Boleto** (tarifa con descuento para hijos de maestros o personal institucional).
   - El balance en vivo (Costo total y Saldo restante) se recalcula de inmediato sobre esta tarifa preferencial ($\text{Resta} = \text{Precio Especial} - \text{Total Abonado}$).
   - Ocupa lugar formal en el cupo del evento y registra el dinero real ingresado en caja y arqueo.
   - El sistema almacena en `Inscripciones` el precio preferencial, de modo que en abonos posteriores el sistema recuerda automáticamente su tarifa especial.

---

## 🎓 Padrón Escolar Activo (Ciclo Oficial 26-27)
El sistema cuenta actualmente con los **219 alumnos activos oficiales** cargados e indexados para cobro y búsqueda rápida:

| Grado y Salón | Cantidad de Alumnos | Rango de Matrículas |
| :---: | :---: | :---: |
| **1° A** | 24 alumnos | `S1A-01` a `S1A-24` |
| **1° B** | 25 alumnos | `S1B-01` a `S1B-25` |
| **1° C** | 24 alumnos | `S1C-01` a `S1C-24` |
| **2° A** | 28 alumnos | `S2A-01` a `S2A-28` |
| **2° B** | 27 alumnos | `S2B-01` a `S2B-27` |
| **2° C** | 26 alumnos | `S2C-01` a `S2C-26` |
| **3° A** | 21 alumnos | `S3A-01` a `S3A-21` |
| **3° B** | 22 alumnos | `S3B-01` a `S3B-22` |
| **3° C** | 22 alumnos | `S3C-01` a `S3C-22` |
| **TOTAL** | **219 alumnos activos** | **9 salones oficiales** |

*Bajas y Egresados:* 229 registros históricos pertenecientes a egresados o respaldos anteriores fueron dados de baja del sistema en general, protegiendo las auditorías contables previas.

---

## 🚀 Novedades de la Versión 27: Padrón Oficial 26-27 e Indexación para Búsqueda

1. **⚡ Carga Directa e Inmediata en la Base de Datos:**
   - Se procesaron e importaron directamente las 3 listas oficiales del ciclo escolar vigente: `CONTRASEÑAS 1° GRADO 26-27`, `CONTRASEÑAS 2° GRADO 26-27` y `CONTRASEÑA 3° GRADO 26-27`.
   - Se descartaron por completo las hojas históricas de egresados (`EGRESADOS 24-25`) y respaldos de ciclos anteriores (`25-26`).

2. **🔍 Búsqueda Rápida Totalmente Habilitada:**
   - La barra de búsqueda superior en caja (`input-busqueda-alumno-rapida`) consulta en tiempo real cualquiera de los 219 alumnos por nombre, apellido o matrícula institucional (ej. `S1A-01`, `S3C-22`).
   - Muestra badge de estatus (`Activo` o `Baja`) y botón directo para precargar al alumno en la ventanilla de cobro.

3. **🛡️ Depuración Integral de Bajas:**
   - Los alumnos no pertenecientes a las listas actualizadas 26-27 quedaron formalmente dados de baja en el sistema. Quienes no registraban pagos fueron depurados del padrón y quienes tenían historial contable conservan su registro histórico bajo la etiqueta `Baja`.

---

## 🚀 Novedades de la Versión 20: Alcance por Salón y Cupo Ilimitado

1. **🎯 Alcance de Participación Dinámico por Grados y Grupos:**
   - Al crear o modificar eventos desde el panel de Administración, se puede establecer si el evento aplica para **TODOS los grados y grupos** o únicamente para **grados y/o grupos específicos** (ej. solo 3° de Secundaria para Paquete Graduación, o solo 1° A y 1° B).
   - Incluye switch interactivo y accesos rápidos "Todos" / "Ninguno" para grados (1°, 2°, 3°) y grupos (A, B, C).
   - Se almacena de manera estructurada en la columna `Alcance` (Columna D) de la hoja `Eventos`.

2. **♾️ Cupo Meta Ilimitado:**
   - Indicar `0` o dejar el campo de cupo en blanco ahora define oficialmente un evento **"Sin límite"** (cupo ilimitado).
   - En el Dashboard de Auditoría y tarjetas informativas, se muestra como "Sin límite" evitando multiplicaciones erróneas por cero.

3. **⚡ Carga Inteligente y Filtrado Automático por Evento:**
   - **En Caja y Cobros:** Al seleccionar un evento, los selectores de Grado y Grupo se adaptan automáticamente para mostrar **únicamente** los salones participantes. Si el evento es para un solo grado o grupo, se preselecciona de forma automática.
   - **En Listas de Salón:** El concentrado de salón restringe los selectores de Grado y Grupo a los que aplican para el evento seleccionado.
   - **En Módulo de Logística (Impresión):** Al generar las listas de asistencia para camiones o transportes, se filtran e imprimen exclusivamente las hojas de los salones correspondientes al alcance del evento.

4. **🔍 Buscador Rápido de Expediente de Alumno:**
   - Barra de búsqueda superior en caja que permite localizar al alumno por nombre o matrícula y consultar al instante su desglose histórico consolidado de abonos en todos los eventos escolares, con opción de imprimir su Estado de Cuenta Individual.

---

## 📑 Módulos y Apartados del Sistema

1. **💳 Caja y Cobros:**
   - Selección de Evento escolar con badge informativo del alcance y cupo.
   - Selectores adaptativos de Grado y Grupo según el alcance del evento.
   - Balance en tiempo real del alumno (Costo total, Abonos previos, Resta pendiente).
   - Prevención estricta de sobrepagos.
   - Switch de **Cortesía Institucional** ($0 de saldo restante).
   - Calculadora instantánea de cambio en efectivo.
   - Generación de folio oficial (`FOLIO-XXXXXX` o `CORT-XXXXXX`) y envío de comprobante digital formateado por correo institucional vía Gmail.

2. **📋 Listas de Salón:**
   - Concentrado de alumnos por salón restringido al alcance del evento.
   - Badges de estado (`PAGADO`, `CON ABONO`, `SIN PAGO`, `CORTESÍA`).
   - Buscador rápido interactivo por nombre.
   - Impresión con membrete oficial del Colegio Boston o exportación a PDF.

3. **💰 Mi Caja y Arqueo:**
   - Resumen del efectivo en custodia del cajero activo.
   - Desglose detallado de transacciones pendientes de entrega.
   - Generación de Comprobante Oficial de Arqueo de Caja con líneas de firma y reinicio de caja a $0.00.

4. **🎪 Eventos y Costos (Admin):**
   - Alta de eventos escolares con configuración de Costo, Cupo (0 = Sin límite), Cajero y Alcance de participación (Todos o Grados/Grupos específicos).
   - Edición en vivo de eventos existentes (alcance, cupo, costo y nombre).
   - Asignación múltiple de eventos a cajeros adicionales.

5. **👥 Usuarios y Accesos (Admin):**
   - Directorio oficial de usuarios con opción de copiar contraseñas al portapapeles.
   - Alta de nuevos cajeros/administradores con generador automático de contraseñas seguras.

6. **📊 Auditoría Global y Logística (Admin):**
   - KPIs: Recaudación neta, Alumnos con abono, Meta financiera (soporta cupo ilimitado) y Total cancelado.
   - Anulación de cobros con motivo oficial y reversa automática de balances.
   - Módulo de Logística: Listas de asistencia agrupadas por salón listas para autobuses/excursiones, respetando el alcance del evento.
