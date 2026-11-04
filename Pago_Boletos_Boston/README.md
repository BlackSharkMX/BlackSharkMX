# Eventos Boston - Control de Pagos, Abonos y Cooperaciones
**Colegio Boston • Cuernavaca, Morelos**
*Sistema Web Escolar en Google Apps Script para el control de cobros de eventos, excursiones, graduaciones, kermesses y cooperaciones grupales.*

---

## 📌 Datos de la Secuencia de Comandos
- **Script ID:** `1Bt2OC0ZbrIyP_esxlyehhcqXtt-L1ep0n42nyrScwOrxyEYUdxf9o3LZ`
- **Última Versión Desplegada:** Versión 24
- **URL de Despliegue Web:** `https://script.google.com/macros/s/AKfycbwZd0TjHSodk3cqw64LI1VhhzsR0No-Vk7w47f1HEmOLyP7-JIzPzaDmdtsJLdPlReS6g/exec`

---

## 🔐 Cuentas y Accesos Predeterminados
La aplicación gestiona sus credenciales en la pestaña **`Usuarios`** de la hoja de cálculo:

| Rol | Nombre Completo | Usuario | Contraseña Inicial | Estatus |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Dirección / Administrador | `admin` | `BostonAdmin2026*` | Activo |
| **Cajero** | Cajero Principal | `cajero` | `BostonCaja2026*` | Activo |

*Nota: Desde el apartado de **👥 Usuarios y Accesos** (exclusivo Admin), se pueden generar nuevos usuarios con contraseñas seguras autogeneradas (ej. `BstK83!`) y consultar el directorio completo de contraseñas.*

---

## 🎓 Novedades de la Versión 24: Sincronización de Grupos, Bajas y Nuevas Matrículas Oficiales

1. **🔄 Sincronización Directa de Listas Escolares:**
   - Módulo automatizado para actualizar el padrón de alumnos desde la hoja de cálculo institucional del ciclo escolar vigente (`1cfQ1ni8TuszbAhiW-jEB-Dk2Q7xSBVtUPjBrNP80I_I` / pestaña `Grupos` o por `gid=25493851`).
   - Disponible directamente desde la interfaz web del sistema en **👥 Usuarios y Accesos -> 🎓 Actualizar Grupos y Matrículas Escolares** y desde el menú superior nativo de la hoja de cálculo (`🎓 Eventos Boston` -> `🔄 Sincronizar Grupos y Matrículas Escolares`).

2. **🏷️ Generación de Matrículas Institucionales Oficiales:**
   - Algoritmo de nomenclatura institucional homologado con Boston Medical: `S` (Secundaria) + `[1-3]` (Grado) + `[A-C]` (Grupo) + `-[01-25]` (Número de lista alfabético consecutivo).
   - Ejemplos: `S1A-01` ... `S1A-21`, `S2B-01` ... `S2B-21`, `S3C-01` ... `S3C-19`.

3. **🛡️ Depuración Segura y Resguardo de Historial Contable (Bajas):**
   - Identificación de alumnos retirados o no presentes en las listas nuevas:
     - Si el alumno **no tiene pagos registrados**, se depura de la lista activa.
     - Si el alumno **cuenta con pagos o abonos previos** en `Historial_Abonos`, se conserva su registro histórico bajo el estatus `"Inactivo / Baja"`, preservando la integridad contable y auditorías sin que aparezca en los selectores de cobro activo de caja.

4. **⚡ Migración Automática de Folios e Historial:**
   - Si un alumno ya contaba con pagos previos bajo una matrícula anterior o formato preliminar, el sistema actualiza automáticamente los registros en `Historial_Abonos` y en `Inscripciones` hacia su nueva matrícula oficial, manteniendo intactos sus estados de cuenta y saldos acumulados.

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
