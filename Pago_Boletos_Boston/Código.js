// ============================================================================
// EVENTOS BOSTON - SISTEMA INTEGRAL DE PAGOS, ABONOS Y COOPERACIONES
// Colegio Boston - Cuernavaca, Morelos
// ============================================================================

/**
 * Servir la aplicación Web
 */
function doGet(e) {
  try {
    // Endpoint de inspección para diagnóstico de la base de datos
    if (e && e.parameter && e.parameter.action === 'inspect') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var out = {
        ssName: ss ? ss.getName() : null,
        ssId: ss ? ss.getId() : null,
        sheets: []
      };
      if (ss) {
        ss.getSheets().forEach(function(s) {
          out.sheets.push({
            name: s.getName(),
            gid: s.getSheetId(),
            rows: s.getLastRow(),
            cols: s.getLastColumn()
          });
        });
      }
      return ContentService.createTextOutput(JSON.stringify(out, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Eventos Boston | Pagos, Abonos y Cooperaciones')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(error) {
    return HtmlService.createHtmlOutput('<h3>Error al cargar Eventos Boston:</h3><p>' + error.message + '</p>');
  }
}

// ============================================================================
// 1. GESTIÓN DE BASE DE DATOS Y USUARIOS / ACCESOS
// ============================================================================

/**
 * Obtiene o inicializa la hoja de Usuarios con credenciales base seguras
 */
function obtenerHojaUsuarios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Usuarios");
  
  if (!sheet) {
    sheet = ss.insertSheet("Usuarios");
    sheet.appendRow(["ID_Usuario", "Nombre", "Rol", "Usuario", "Password", "Estatus", "Fecha_Creacion"]);
    
    // Formato de encabezado
    sheet.getRange(1, 1, 1, 7)
      .setFontWeight("bold")
      .setBackground("#0b1f3f")
      .setFontColor("#ffffff");
      
    // Usuarios predeterminados seguros para el Colegio Boston
    sheet.appendRow(["ADM-001", "Dirección / Administrador", "Admin", "admin", "BostonAdmin2026*", "Activo", new Date()]);
    sheet.appendRow(["CJ-101", "Cajero Principal", "Cajero", "cajero", "BostonCaja2026*", "Activo", new Date()]);
  } else {
    // Si la hoja existe pero está vacía
    if (sheet.getLastRow() < 1) {
      sheet.appendRow(["ID_Usuario", "Nombre", "Rol", "Usuario", "Password", "Estatus", "Fecha_Creacion"]);
      sheet.appendRow(["ADM-001", "Dirección / Administrador", "Admin", "admin", "BostonAdmin2026*", "Activo", new Date()]);
      sheet.appendRow(["CJ-101", "Cajero Principal", "Cajero", "cajero", "BostonCaja2026*", "Activo", new Date()]);
    }
  }
  return sheet;
}

/**
 * Generador institucional de contraseñas seguras y legibles
 */
function generarPasswordSegura() {
  var charsMayus = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var charsMinus = "abcdefghjkmnpqrstuvwxyz";
  var charsNum = "23456789";
  var simbolos = ["!", "@", "#", "*", "$"];
  
  function rand(str) {
    return str.charAt(Math.floor(Math.random() * str.length));
  }
  
  var simb = simbolos[Math.floor(Math.random() * simbolos.length)];
  return "Bst" + rand(charsMayus) + rand(charsMinus) + rand(charsNum) + rand(charsNum) + simb;
}

/**
 * Obtener lista de usuarios para el selector del Login (sin exponer contraseñas)
 */
function obtenerUsuariosLogin() {
  try {
    var sheet = obtenerHojaUsuarios();
    var data = sheet.getDataRange().getValues();
    var usuarios = [];
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][3]) {
        var estatus = data[i][5] ? data[i][5].toString().trim() : "Activo";
        if (estatus.toLowerCase() === "inactivo") continue;
        
        usuarios.push({
          id: data[i][0] ? data[i][0].toString() : "U-" + i,
          nombre: data[i][1].toString().trim(),
          rol: data[i][2] ? data[i][2].toString().trim() : "Cajero",
          usuario: data[i][3].toString().trim()
        });
      }
    }
    
    // Si no hubiera usuarios cargados, proveer los defaults
    if (usuarios.length === 0) {
      usuarios = [
        { id: "ADM-001", nombre: "Dirección / Administrador", rol: "Admin", usuario: "admin" },
        { id: "CJ-101", nombre: "Cajero Principal", rol: "Cajero", usuario: "cajero" }
      ];
    }
    
    return { success: true, usuarios: usuarios };
  } catch(e) {
    return { 
      success: false, 
      message: e.message,
      usuarios: [
        { id: "ADM-001", nombre: "Dirección / Administrador", rol: "Admin", usuario: "admin" },
        { id: "CJ-101", nombre: "Cajero Principal", rol: "Cajero", usuario: "cajero" }
      ]
    };
  }
}

/**
 * Obtener listado de usuarios con contraseñas (exclusivo para panel de administración)
 */
function obtenerUsuariosAdmin() {
  var sheet = obtenerHojaUsuarios();
  var data = sheet.getDataRange().getValues();
  var lista = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][3]) {
      lista.push({
        id: data[i][0] ? data[i][0].toString() : "",
        nombre: data[i][1].toString(),
        rol: data[i][2] ? data[i][2].toString() : "Cajero",
        usuario: data[i][3].toString(),
        password: data[i][4] ? data[i][4].toString() : "••••",
        estatus: data[i][5] ? data[i][5].toString() : "Activo",
        fecha: data[i][6] ? new Date(data[i][6]).toLocaleDateString() : "N/A"
      });
    }
  }
  return lista;
}

/**
 * Registro de nuevo usuario (Cajero o Admin) con contraseña automática o manual
 */
function registrarNuevoUsuario(nombre, usuario, rol, password) {
  var sheet = obtenerHojaUsuarios();
  var data = sheet.getDataRange().getValues();
  var userBuscado = usuario.trim().toLowerCase();
  
  // Validar si el usuario ya existe
  for (var i = 1; i < data.length; i++) {
    if (data[i][3] && data[i][3].toString().trim().toLowerCase() === userBuscado) {
      return { success: false, message: "El usuario '" + usuario + "' ya se encuentra registrado." };
    }
  }
  
  // Si no se proporcionó contraseña, generar una automáticamente
  var passFinal = (password && password.trim() !== "") ? password.trim() : generarPasswordSegura();
  var rolFinal = (rol === "Admin") ? "Admin" : "Cajero";
  var prefijo = (rolFinal === "Admin") ? "ADM-" : "CJ-";
  var idUsuario = prefijo + new Date().getTime().toString().slice(-4);
  
  try {
    sheet.appendRow([idUsuario, nombre.trim(), rolFinal, usuario.trim(), passFinal, "Activo", new Date()]);
    return { 
      success: true, 
      message: "Usuario '" + nombre + "' registrado con éxito.",
      idUsuario: idUsuario,
      passwordGenerada: passFinal
    };
  } catch(e) {
    return { success: false, message: "Error al registrar usuario: " + e.message };
  }
}

/**
 * Autenticación de usuarios
 */
function login(usuario, password) {
  var sheet = obtenerHojaUsuarios();
  var data = sheet.getDataRange().getValues();
  var usuarioInput = usuario.trim().toLowerCase();
  var passInput = password.trim();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][3] && data[i][4]) {
      var userDB = data[i][3].toString().trim().toLowerCase();
      var nombreDB = data[i][1].toString().trim().toLowerCase();
      var passDB = data[i][4].toString().trim();
      var estatusDB = data[i][5] ? data[i][5].toString().trim().toLowerCase() : "activo";
      
      if (estatusDB === "inactivo") continue;
      
      // Permitir login tanto por nombre de usuario como por nombre completo
      if ((userDB === usuarioInput || nombreDB === usuarioInput) && passDB === passInput) {
        return { 
          success: true, 
          rol: data[i][2] ? data[i][2].toString().trim() : "Cajero", 
          nombre: data[i][1].toString().trim(), 
          id: data[i][0] ? data[i][0].toString().trim() : "U-" + i,
          usuario: data[i][3].toString().trim()
        };
      }
    }
  }
  return { success: false, message: "Usuario o contraseña incorrectos." };
}

// Mantener compatibilidad con registrarNuevoCajero
function registrarNuevoCajero(nombre, usuario, password) {
  return registrarNuevoUsuario(nombre, usuario, "Cajero", password);
}

// ============================================================================
// 2. GESTIÓN DE EVENTOS Y ASIGNACIONES
// ============================================================================

/**
 * Obtener lista de cajeros disponibles para asignación
 */
function getCajeros() {
  var sheet = obtenerHojaUsuarios();
  var data = sheet.getDataRange().getValues();
  var cajeros = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === "Cajero") {
      cajeros.push({ id: data[i][0], nombre: data[i][1] });
    }
  }
  return cajeros;
}

/**
 * Obtener todos los eventos activos
 */
function getTodosEventosActivos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Eventos");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var eventos = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][6] === "Activo") {
      eventos.push({ 
        id: data[i][0], 
        nombre: data[i][1], 
        costo: parseFloat(data[i][4]) || 0, 
        cupo: parseInt(data[i][5]) || 0 
      });
    }
  }
  return eventos;
}

/**
 * Obtener eventos asignados al cajero (o todos si es Admin)
 */
function getEventosCajero(idCajero, rol) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var sheetAsig = ss.getSheetByName("Asignaciones");
  
  if (!sheetEventos) return [];
  var eventos = sheetEventos.getDataRange().getValues();
  var asignaciones = sheetAsig ? sheetAsig.getDataRange().getValues() : [];
  
  var listaEventos = [];
  for (var i = 1; i < eventos.length; i++) {
    if (eventos[i][6] === "Activo") {
      if (rol === "Admin") {
        listaEventos.push({ id: eventos[i][0], nombre: eventos[i][1], costo: parseFloat(eventos[i][4]) || 0 });
      } else {
        for (var j = 1; j < asignaciones.length; j++) {
          if (asignaciones[j][1] == eventos[i][0] && asignaciones[j][2] == idCajero) {
            listaEventos.push({ id: eventos[i][0], nombre: eventos[i][1], costo: parseFloat(eventos[i][4]) || 0 });
            break;
          }
        }
      }
    }
  }
  return listaEventos;
}

/**
 * Crear nuevo evento desde panel Admin
 */
function crearNuevoEvento(nombre, costo, cupo, idCajeroAsignado) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var idEvento = "EV-" + new Date().getTime().toString().slice(-6);
  var fechaActual = new Date().toISOString().split('T')[0];
  try {
    sheetEventos.appendRow([idEvento, nombre, fechaActual, "Todos", parseFloat(costo), parseInt(cupo), "Activo"]);
    
    if (idCajeroAsignado) {
      var sheetAsignaciones = ss.getSheetByName("Asignaciones");
      var idAsignacion = "ASG-" + new Date().getTime().toString().slice(-6);
      sheetAsignaciones.appendRow([idAsignacion, idEvento, idCajeroAsignado]);
    }
    return { success: true, message: "Evento '" + nombre + "' creado con éxito." };
  } catch(e) {
    return { success: false, message: "Error al crear evento: " + e.message };
  }
}

/**
 * Modificar evento existente
 */
function modificarEvento(idEvento, nuevoNombre, nuevoCosto, nuevoCupo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var data = sheetEventos.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == idEvento) {
      sheetEventos.getRange(i + 1, 2).setValue(nuevoNombre);
      sheetEventos.getRange(i + 1, 5).setValue(parseFloat(nuevoCosto));
      sheetEventos.getRange(i + 1, 6).setValue(parseInt(nuevoCupo));
      return { success: true, message: "Evento actualizado con éxito." };
    }
  }
  return { success: false, message: "Evento no encontrado." };
}

/**
 * Asignar evento a cajero adicional
 */
function asignarEventoACajero(idEvento, idCajero) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetAsignaciones = ss.getSheetByName("Asignaciones");
  var data = sheetAsignaciones.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == idEvento && data[i][2] == idCajero) {
      return { success: false, message: "Este cajero ya tiene asignado este evento previamente." };
    }
  }
  var idAsignacion = "ASG-" + new Date().getTime().toString().slice(-6);
  try {
    sheetAsignaciones.appendRow([idAsignacion, idEvento, idCajero]);
    return { success: true, message: "Evento asignado correctamente al cajero." };
  } catch(e) {
    return { success: false, message: "Error al asignar: " + e.message };
  }
}

// ============================================================================
// 3. GESTIÓN DE ALUMNOS, BALANCES Y COBROS
// ============================================================================

/**
 * Obtener alumnos filtrados por Grado y Grupo
 */
function getAlumnos(grado, grupo) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clientes");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var filtrados = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][3].toString() == grado.toString() && data[i][4].toString().trim().toUpperCase() == grupo.toString().trim().toUpperCase()) {
      filtrados.push({ id: data[i][0], nombre: data[i][1], email: data[i][5] || "" });
    }
  }
  return filtrados;
}

/**
 * Consultar balance en tiempo real del alumno para un evento
 */
function getEstadoAlumno(idEvento, idCliente, costoTotal) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  if (!abonosSheet) {
    return { costoTotal: parseFloat(costoTotal) || 0, montoPagado: 0, resta: parseFloat(costoTotal) || 0, historial: [], cortesia: false };
  }
  
  var dataAbonos = abonosSheet.getDataRange().getValues();
  var totalAbonado = 0;
  var historial = [];
  var esCortesia = false;
  
  for (var i = 1; i < dataAbonos.length; i++) {
    if (dataAbonos[i][1] == idEvento && dataAbonos[i][2] == idCliente) {
      var montoTexto = dataAbonos[i] && dataAbonos[i][3] ? dataAbonos[i][3].toString().toUpperCase() : "";
      if (montoTexto.includes("CANCELADO")) continue;
      
      if (montoTexto.includes("CORTES")) esCortesia = true;
      
      var monto = parseFloat(dataAbonos[i][3]) || 0;
      totalAbonado += monto;
      historial.push({ 
        monto: monto, 
        fecha: dataAbonos[i][4] ? new Date(dataAbonos[i][4]).toLocaleString() : "N/A" 
      });
    }
  }
  return {
    costoTotal: parseFloat(costoTotal) || 0,
    montoPagado: totalAbonado,
    resta: esCortesia ? 0 : Math.max((parseFloat(costoTotal) || 0) - totalAbonado, 0),
    historial: historial,
    cortesia: esCortesia
  };
}

/**
 * Registrar pago o cortesía institucional y enviar comprobante por correo
 */
function registrarPago(idEvento, nombreEvento, idCliente, nombreCliente, emailCliente, montoAbono, costoTotal, idCajero, grado, grupo, esCortesia) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var inscripcionesSheet = ss.getSheetByName("Inscripciones");
  
  montoAbono = esCortesia ? 0 : (parseFloat(montoAbono) || 0);
  costoTotal = parseFloat(costoTotal) || 0;
  var estadoActual = getEstadoAlumno(idEvento, idCliente, costoTotal);
  var nuevoTotalPagado = estadoActual.montoPagado + montoAbono;
  var estadoPagado = esCortesia ? "Cortesía" : (nuevoTotalPagado >= costoTotal ? "Total" : "Parcial");
  
  var timestamp = new Date().getTime().toString().slice(-6);
  var idAbono = esCortesia ? "CORT-" + timestamp : "FOLIO-" + timestamp;
  var fechaHora = new Date();
  
  var montoBD = esCortesia ? "CORTESÍA" : montoAbono;
  var estatusCorteBD = esCortesia ? "N/A (Cortesía)" : "Pendiente";
  
  // Guardar abono individual
  abonosSheet.appendRow([idAbono, idEvento, idCliente, montoBD, fechaHora, idCajero, estatusCorteBD]);
  
  // Actualizar o crear inscripción acumulada
  var dataInsc = inscripcionesSheet.getDataRange().getValues();
  var filaEncontrada = -1;
  for (var i = 1; i < dataInsc.length; i++) {
    if (dataInsc[i][1] == idEvento && dataInsc[i][2] == idCliente) {
      filaEncontrada = i + 1;
      break;
    }
  }
  
  if (filaEncontrada !== -1) {
    inscripcionesSheet.getRange(filaEncontrada, 5).setValue(nuevoTotalPagado);
    inscripcionesSheet.getRange(filaEncontrada, 6).setValue(estadoPagado);
  } else {
    var idInscripcion = "INS-" + timestamp;
    inscripcionesSheet.appendRow([idInscripcion, idEvento, idCliente, costoTotal, nuevoTotalPagado, estadoPagado]);
  }
  
  // Envío de correo electrónico con formato institucional de Eventos Boston
  if (emailCliente && emailCliente.includes("@") && !esCortesia) {
    var asunto = "Comprobante Digital de Pago - Folio: " + idAbono + " | Colegio Boston";
    var restaFinal = Math.max(costoTotal - nuevoTotalPagado, 0);
    var cuerpoHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; border: 2px solid #0b1f3f; padding: 25px; max-width: 520px; border-radius:12px; margin: 0 auto; color: #2d3748; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #c59b27; text-transform: uppercase;">Colegio Boston • Cuernavaca</div>
          <h2 style="color: #0b1f3f; margin: 4px 0 0 0; font-size: 22px; font-weight: 800;">EVENTOS BOSTON</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Comprobante Digital de Pago y Abono Escolar</p>
        </div>
        <div style="text-align: center; background-color: #f8fafc; border: 1.5px dashed #cbd5e1; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
          <span style="font-size: 12px; color: #64748b; font-weight: 700; display: block; text-transform: uppercase; letter-spacing: 1px;">Número de Folio Oficial</span>
          <strong style="color: #c83e2b; font-size: 26px; font-family: monospace; letter-spacing: 1.5px;">${idAbono}</strong>
        </div>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 16px;">
          <tr><td style="padding: 6px 0; color: #64748b; width: 38%;"><strong>Concepto / Evento:</strong></td><td style="padding: 6px 0; font-weight: bold; color: #0b1f3f;">${nombreEvento}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Alumno:</strong></td><td style="padding: 6px 0; font-weight: 600;">${nombreCliente}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Grado y Grupo:</strong></td><td style="padding: 6px 0;">${grado}° Secundaria - Sección "${grupo}"</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Fecha y Hora:</strong></td><td style="padding: 6px 0;">${fechaHora.toLocaleString()}</td></tr>
        </table>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; border-left: 6px solid #16a34a;">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #16a34a; font-weight: 800; font-size: 15px;">Monto Recibido hoy:</td><td style="text-align: right; color: #16a34a; font-weight: 800; font-size: 20px;">$${montoAbono}.00 MXN</td></tr>
            <tr><td style="color: #64748b; padding-top: 8px;">Total Acumulado Pagado:</td><td style="text-align: right; padding-top: 8px; font-weight: bold; color: #0b1f3f;">$${nuevoTotalPagado}.00 / $${costoTotal}.00</td></tr>
            <tr><td style="color: #dc2626; font-weight: bold; padding-top: 6px;">Saldo Restante Pendiente:</td><td style="text-align: right; color: #dc2626; font-weight: bold; font-size: 15px; padding-top: 6px;">$${restaFinal}.00 MXN</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          Este comprobante electrónico es emitido por el sistema institucional del Colegio Boston. Conserve su número de folio para aclaraciones.
        </div>
      </div>
    `;
    try { 
      GmailApp.sendEmail(emailCliente, asunto, "", { htmlBody: cuerpoHtml }); 
    } catch(e) { 
      Logger.log("Error al enviar email: " + e.message); 
    }
  }
  
  return { success: true, folio: idAbono };
}

// ============================================================================
// 4. CONCENTRADOS Y REPORTES DE GRUPO
// ============================================================================

/**
 * Obtener concentrado de estatus del grupo (quién pagó, con abono, cortesía, o debe)
 */
function obtenerConcentradoEstatusGrupo(idEvento, grado, grupo, costoTotal) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientesSheet = ss.getSheetByName("Clientes").getDataRange().getValues();
  var abonosSheet = ss.getSheetByName("Historial_Abonos").getDataRange().getValues();
  costoTotal = parseFloat(costoTotal) || 0;
  
  var montosAbonadosPorAlumno = {};
  var cortesias = {};
  
  for (var j = 1; j < abonosSheet.length; j++) {
    if (abonosSheet[j][1] == idEvento) {
      var valStr = abonosSheet[j][3].toString().toUpperCase();
      if (valStr.includes("CANCELADO")) continue;
      
      var idAl = abonosSheet[j][2].toString().trim();
      if (valStr.includes("CORTES")) cortesias[idAl] = true;
      
      var monto = parseFloat(abonosSheet[j][3]) || 0;
      if (!montosAbonadosPorAlumno[idAl]) montosAbonadosPorAlumno[idAl] = 0;
      montosAbonadosPorAlumno[idAl] += monto;
    }
  }
  
  var resultadoConcentrado = [];
  for (var i = 1; i < clientesSheet.length; i++) {
    var alGrado = clientesSheet[i][3].toString().trim();
    var alGrupo = clientesSheet[i][4].toString().trim().toUpperCase();
    
    if (alGrado == grado.toString().trim() && alGrupo == grupo.toString().trim().toUpperCase()) {
      var idAlumno = clientesSheet[i][0].toString().trim();
      var nombreAlumno = clientesSheet[i][1].toString();
      var totalAbonado = montosAbonadosPorAlumno[idAlumno] || 0;
      var esCortesia = cortesias[idAlumno] || false;
      var restante = esCortesia ? 0 : Math.max(costoTotal - totalAbonado, 0);
      
      var estatusText = "No ha pagado";
      if (esCortesia) {
        estatusText = "CORTESÍA";
      } else if (totalAbonado > 0) {
        estatusText = (restante <= 0) ? "PAGADO" : "Con Abono";
      }
      
      resultadoConcentrado.push({
        id: idAlumno,
        nombre: nombreAlumno,
        abonado: totalAbonado,
        restante: restante,
        estatus: estatusText
      });
    }
  }
  
  resultadoConcentrado.sort(function(a, b) { 
    return a.nombre.localeCompare(b.nombre); 
  });
  return resultadoConcentrado;
}

/**
 * Obtener lista de logística (alumnos inscritos agrupados por salón)
 */
function obtenerListaLogistica(idEvento) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inscripciones = ss.getSheetByName("Inscripciones").getDataRange().getValues();
  var alumnos = ss.getSheetByName("Clientes").getDataRange().getValues();
  
  var dictAlumnos = {};
  for (var i = 1; i < alumnos.length; i++) {
    if (alumnos[i][0]) { 
      dictAlumnos[alumnos[i][0]] = { 
        nombre: alumnos[i][1], 
        grado: alumnos[i][3], 
        grupo: alumnos[i][4] 
      }; 
    }
  }
  
  var listaResultado = [];
  for (var j = 1; j < inscripciones.length; j++) {
    if (inscripciones[j][1] == idEvento) {
      var idAl = inscripciones[j][2];
      var totalCobrado = parseFloat(inscripciones[j][3]) || 0;
      var totalAbonado = parseFloat(inscripciones[j][4]) || 0;
      var estatusText = inscripciones[j][5].toString();
      var esCortesia = estatusText.toUpperCase().includes("CORTES");
      var restante = esCortesia ? 0 : Math.max(totalCobrado - totalAbonado, 0);
      
      if ((totalAbonado > 0 || esCortesia) && dictAlumnos[idAl]) {
        listaResultado.push({
          id: idAl,
          nombre: dictAlumnos[idAl].nombre,
          grado: dictAlumnos[idAl].grado,
          grupo: dictAlumnos[idAl].grupo,
          abonado: totalAbonado,
          restante: restante,
          estatus: esCortesia ? "CORTESÍA" : ((estatusText === "Total" || restante <= 0) ? "PAGADO" : "Con Abono")
        });
      }
    }
  }
  
  listaResultado.sort(function(a, b) {
    if (a.grado != b.grado) return a.grado - b.grado;
    if (a.grupo != b.grupo) return a.grupo.toString().localeCompare(b.grupo.toString());
    return a.nombre.toString().localeCompare(b.nombre.toString());
  });
  return listaResultado;
}

// ============================================================================
// 5. CORTE Y ARQUEO DE CAJA
// ============================================================================

/**
 * Obtener efectivo pendiente de entrega para el cajero activo
 */
function obtenerEfectivoPendienteCajero(idCajero) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var clientesSheet = ss.getSheetByName("Clientes").getDataRange().getValues();
  var eventosSheet = ss.getSheetByName("Eventos").getDataRange().getValues();
  var dataAbonos = abonosSheet.getDataRange().getValues();
  
  var dictAlumnos = {}; 
  for (var i = 1; i < clientesSheet.length; i++) dictAlumnos[clientesSheet[i][0]] = clientesSheet[i][1];
  var dictEventos = {}; 
  for (var k = 1; k < eventosSheet.length; k++) dictEventos[eventosSheet[k][0]] = eventosSheet[k][1];
  
  var desglose = [];
  var granTotal = 0;
  
  for (var j = 1; j < dataAbonos.length; j++) {
    if (dataAbonos[j][5] == idCajero) {
      var montoTexto = dataAbonos[j][3].toString();
      if (montoTexto.includes("CANCELADO")) continue;
      
      var estatusCorte = dataAbonos[j][6] ? dataAbonos[j][6].toString().trim() : "Pendiente";
      if (estatusCorte === "Entregado" || estatusCorte.includes("N/A")) continue;
      
      var montoVal = parseFloat(montoTexto) || 0;
      granTotal += montoVal;
      
      desglose.push({
        folio: dataAbonos[j][0], 
        evento: dictEventos[dataAbonos[j][1]] || dataAbonos[j][1],
        alumno: dictAlumnos[dataAbonos[j][2]] || "ID: " + dataAbonos[j][2], 
        monto: montoVal,
        fecha: dataAbonos[j][4] ? new Date(dataAbonos[j][4]).toLocaleString() : "N/A"
      });
    }
  }
  return { totalCaja: granTotal, transacciones: desglose };
}

/**
 * Procesar el cierre de caja y marcar folios como 'Entregado'
 */
function procesarCierreDeCajaBD(idCajero) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var dataAbonos = abonosSheet.getDataRange().getValues();
  var contador = 0;
  
  for (var j = 1; j < dataAbonos.length; j++) {
    if (dataAbonos[j][5] == idCajero) {
      if (dataAbonos[j][3].toString().includes("CANCELADO")) continue;
      var estatusCorte = dataAbonos[j][6] ? dataAbonos[j][6].toString().trim() : "Pendiente";
      if (estatusCorte === "Pendiente") {
        abonosSheet.getRange(j + 1, 7).setValue("Entregado");
        contador++;
      }
    }
  }
  return { success: true, modificados: contador };
}

// ============================================================================
// 6. AUDITORÍA, ANULACIÓN Y ESTADÍSTICAS (ADMIN)
// ============================================================================

/**
 * Obtener estadísticas globales y lista completa de transacciones
 */
function getEstadisticasAdmin() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var inscripcionesSheet = ss.getSheetByName("Inscripciones");
  var dataAbonos = abonosSheet.getDataRange().getValues();
  var dataInsc = inscripcionesSheet.getDataRange().getValues();
  
  var listaAbonosDetalle = [];
  for (var j = 1; j < dataAbonos.length; j++) {
    if (!dataAbonos[j][0]) continue;
    var filaMonto = dataAbonos[j][3].toString();
    var esCancelado = filaMonto.includes("CANCELADO");
    
    var montoOriginal = 0;
    if (esCancelado) {
      var coincidencia = filaMonto.match(/\d+(\.\d+)?/);
      montoOriginal = coincidencia ? parseFloat(coincidencia[0]) : 0;
    } else {
      montoOriginal = parseFloat(filaMonto) || 0;
    }
    
    listaAbonosDetalle.push({
      idAbono: dataAbonos[j][0],
      idEvento: dataAbonos[j][1],
      idCliente: dataAbonos[j][2],
      montoTexto: filaMonto,
      montoValor: esCancelado ? 0 : montoOriginal,
      montoCancelado: esCancelado ? montoOriginal : 0,
      fecha: dataAbonos[j][4] ? new Date(dataAbonos[j][4]).toLocaleString() : "N/A",
      cajero: dataAbonos[j][5],
      fila: j + 1,
      cancelado: esCancelado
    });
  }
  
  var alumnosPorEvento = {};
  for (var i = 1; i < dataInsc.length; i++) {
    var evId = dataInsc[i][1];
    if (!evId) continue;
    if (!alumnosPorEvento[evId]) alumnosPorEvento[evId] = 0;
    
    if (parseFloat(dataInsc[i][4]) > 0 || dataInsc[i][5].toString().toUpperCase().includes("CORTES")) {
      alumnosPorEvento[evId]++;
    }
  }
  
  return { transacciones: listaAbonosDetalle.reverse(), alumnosPorEvento: alumnosPorEvento };
}

/**
 * Cancelar un pago por error o reembolso
 */
function eliminarCobro(fila, idEvento, idCliente, montoAbonoAnulado, motivo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var inscripcionesSheet = ss.getSheetByName("Inscripciones");
  
  var notaCancelacion = "CANCELADO $" + montoAbonoAnulado + " (" + motivo + ")";
  abonosSheet.getRange(fila, 4).setValue(notaCancelacion); 
  
  var dataInsc = inscripcionesSheet.getDataRange().getValues();
  for (var i = 1; i < dataInsc.length; i++) {
    if (dataInsc[i][1] == idEvento && dataInsc[i][2] == idCliente) {
      var costoEvento = parseFloat(dataInsc[i][3]) || 0;
      var acumuladoAnterior = parseFloat(dataInsc[i][4]) || 0;
      var nuevoAcumulado = acumuladoAnterior - (parseFloat(montoAbonoAnulado) || 0);
      
      if (nuevoAcumulado <= 0) {
        inscripcionesSheet.getRange(i + 1, 5).setValue(0);
        inscripcionesSheet.getRange(i + 1, 6).setValue("Sin abonos");
      } else {
        var nuevoEstado = nuevoAcumulado >= costoEvento ? "Total" : "Parcial";
        inscripcionesSheet.getRange(i + 1, 5).setValue(nuevoAcumulado);
        inscripcionesSheet.getRange(i + 1, 6).setValue(nuevoEstado);
      }
      break;
    }
  }
  return { success: true };
}
