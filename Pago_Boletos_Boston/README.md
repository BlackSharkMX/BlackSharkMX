# Eventos Boston - Control de Pagos, Abonos y Cooperaciones
**Colegio Boston • Cuernavaca, Morelos**
*Sistema Web Escolar en Google Apps Script para el control de cobros de eventos, excursiones, graduaciones, kermesses y cooperaciones grupales.*

---

## 📌 Datos de la Secuencia de Comandos
- **Script ID:** `1Bt2OC0ZbrIyP_esxlyehhcqXtt-L1ep0n42nyrScwOrxyEYUdxf9o3LZ`
- **Última Versión Desplegada:** Versión 18
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

## 📑 Módulos y Apartados del Sistema

1. **💳 Caja y Cobros:**
   - Selección de Evento escolar, Grado (1°, 2°, 3° de Secundaria) y Grupo (A, B, C).
   - Balance en tiempo real del alumno (Costo total, Abonos previos, Resta pendiente).
   - Prevención estricta de sobrepagos.
   - Switch de **Cortesía Institucional** ($0 de saldo restante).
   - Calculadora instantánea de cambio en efectivo.
   - Generación de folio oficial (`FOLIO-XXXXXX` o `CORT-XXXXXX`) y envío de comprobante digital formateado por correo institucional vía Gmail.

2. **📋 Listas de Salón:**
   - Concentrado de alumnos por salón con badges de estado (`PAGADO`, `CON ABONO`, `SIN PAGO`, `CORTESÍA`).
   - Buscador rápido interactivo por nombre.
   - Impresión con membrete oficial del Colegio Boston o exportación a PDF.

3. **💰 Mi Caja y Arqueo:**
   - Resumen del efectivo en custodia del cajero activo.
   - Desglose detallado de transacciones pendientes de entrega.
   - Generación de Comprobante Oficial de Arqueo de Caja con líneas de firma y reinicio de caja a $0.00.

4. **🎪 Eventos y Costos (Admin):**
   - Alta de eventos escolares (Nombre, Costo alumno, Cupo meta, Cajero inicial).
   - Edición en vivo de eventos activos.
   - Asignación múltiple de eventos a cajeros adicionales.

5. **👥 Usuarios y Accesos (Admin):**
   - Directorio oficial de usuarios con opción de copiar contraseñas al portapapeles.
   - Alta de nuevos cajeros/administradores con generador automático de contraseñas seguras.

6. **📊 Auditoría Global y Logística (Admin):**
   - KPIs: Recaudación neta, Alumnos con abono, Meta financiera y Total cancelado.
   - Anulación de cobros con motivo oficial y reversa automática de balances.
   - Módulo de Logística: Listas de asistencia agrupadas por salón listas para autobuses/excursiones.
