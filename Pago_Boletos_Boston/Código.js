// ============================================================================
// EVENTOS BOSTON - SISTEMA INTEGRAL DE PAGOS, ABONOS Y COOPERACIONES
// Colegio Boston - Cuernavaca, Morelos
// ============================================================================

/**
 * Servir la aplicación Web
 */
function doGet(e) {
  try {
    // Endpoint para sincronización directa de alumnos desde navegador autenticado
    if (e && e.parameter && e.parameter.action === 'sync') {
      var targetUrl = e.parameter.url || e.parameter.id || "1cfQ1ni8TuszbAhiW-jEB-Dk2Q7xSBVtUPjBrNP80I_I";
      var targetGid = e.parameter.gid || "25493851";
      var resSync = sincronizarAlumnosDesdeSheetExterna(targetUrl, targetGid);
      return ContentService.createTextOutput(JSON.stringify(resSync, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Endpoint de prueba para búsqueda de alumnos
    if (e && e.parameter && e.parameter.action === 'search') {
      var query = e.parameter.q || "";
      var resSearch = consultarHistorialCompletoAlumno(query);
      return ContentService.createTextOutput(JSON.stringify(resSearch, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Endpoint de depuración: conservar solo Tolantongo (3° Secundaria)
    if (e && e.parameter && e.parameter.action === 'depurarTolantongo') {
      var resDep = depurarEventosTolantongo();
      return ContentService.createTextOutput(JSON.stringify(resDep, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Endpoint para ejecución de carga masiva de pagos (Tolantongo 3° Secundaria)
    if (e && e.parameter && e.parameter.action === 'cargarMasivo') {
      var resCarga = ejecutarCargaMasivaTolantongo();
      return ContentService.createTextOutput(JSON.stringify(resCarga, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }


    if (e && e.parameter && e.parameter.action === 'metricas') {
      var idEvMetricas = e.parameter.idEvento || "EV-730628";
      var resMet = obtenerMetricasRecaudacion(idEvMetricas);
      return ContentService.createTextOutput(JSON.stringify(resMet, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Endpoint de consulta de cortes históricos
    if (e && e.parameter && e.parameter.action === 'cortes') {
      var idCajParam = e.parameter.idCajero || "";
      var rolParam = e.parameter.rol || "Admin";
      var resCortes = obtenerCortesHistoricos(idCajParam, rolParam);
      return ContentService.createTextOutput(JSON.stringify(resCortes, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Endpoint de consulta de caja activa y cobros del día
    if (e && e.parameter && e.parameter.action === 'caja') {
      var idCajParam2 = e.parameter.idCajero || "USR-001";
      var resCaja = obtenerEfectivoPendienteCajero(idCajParam2);
      return ContentService.createTextOutput(JSON.stringify(resCaja, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Endpoint de inspección para diagnóstico de la base de datos
    if (e && e.parameter && e.parameter.action === 'inspect') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var out = {
        ssName: ss ? ss.getName() : null,
        ssId: ss ? ss.getId() : null,
        sheets: [],
        eventosData: [],
        asignacionesData: [],
        usuariosData: [],
        clientesSample: []
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
        var evS = ss.getSheetByName("Eventos");
        if (evS && evS.getLastRow() > 0) out.eventosData = evS.getDataRange().getValues();
        var asS = ss.getSheetByName("Asignaciones");
        if (asS && asS.getLastRow() > 0) out.asignacionesData = asS.getDataRange().getValues();
        var usS = ss.getSheetByName("Usuarios");
        if (usS && usS.getLastRow() > 0) out.usuariosData = usS.getDataRange().getValues();
        var clSheet = ss.getSheetByName("Clientes");
        if (clSheet && clSheet.getLastRow() > 0) {
          var clRows = Math.min(clSheet.getLastRow(), 10);
          var clCols = Math.min(clSheet.getLastColumn(), 10);
          out.clientesSample = clSheet.getRange(1, 1, clRows, clCols).getValues();
        }
      }

      // Si se solicita inspeccionar una hoja externa específica por ID
      if (e.parameter.targetId) {
        try {
          var targetSS = SpreadsheetApp.openById(e.parameter.targetId.trim());
          out.targetSS = {
            id: targetSS.getId(),
            name: targetSS.getName(),
            sheets: []
          };
          targetSS.getSheets().forEach(function(s) {
            var sheetInfo = {
              name: s.getName(),
              gid: s.getSheetId(),
              rows: s.getLastRow(),
              cols: s.getLastColumn(),
              sampleData: []
            };
            if (s.getLastRow() > 0 && s.getLastColumn() > 0) {
              var maxR = Math.min(s.getLastRow(), 8);
              var maxC = Math.min(s.getLastColumn(), 10);
              sheetInfo.sampleData = s.getRange(1, 1, maxR, maxC).getValues();
            }
            out.targetSS.sheets.push(sheetInfo);
          });
        } catch(errTarget) {
          out.targetError = errTarget.message;
        }
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

/**
 * Menú contextual al abrir la hoja de cálculo de Google
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("🎪 Eventos Boston")
      .addItem("🔄 Sincronizar Grupos y Matrículas Escolares", "menuSincronizarGrupos")
      .addToUi();
  } catch(e) {}
}

function menuSincronizarGrupos() {
  var ui = SpreadsheetApp.getUi();
  var res = sincronizarAlumnosDesdeSheetExterna("https://docs.google.com/spreadsheets/d/1cfQ1ni8TuszbAhiW-jEB-Dk2Q7xSBVtUPjBrNP80I_I/edit?gid=25493851#gid=25493851", "25493851");
  if (res.success) {
    ui.alert("Sincronización Exitosa", res.message + "\n\nAlumnos activos: " + res.totalActivos + "\nActualizados: " + res.totalActualizados + "\nNuevos: " + res.totalNuevos + "\nBajas: " + res.totalBajas, ui.ButtonSet.OK);
  } else {
    ui.alert("Error de Sincronización", res.message, ui.ButtonSet.OK);
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
 * Obtener todos los eventos activos (para selectores de cobro y visualización)
 */
function getTodosEventosActivos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Eventos");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var eventos = [];
  for (var i = 1; i < data.length; i++) {
    var estado = data[i][6] ? data[i][6].toString().trim() : "Activo";
    if (estado === "Activo") {
      var cupoVal = (data[i][5] === "" || data[i][5] === null || isNaN(parseInt(data[i][5]))) ? 0 : parseInt(data[i][5]);
      eventos.push({ 
        id: data[i][0], 
        nombre: data[i][1], 
        fecha: data[i][2],
        alcance: data[i][3] ? data[i][3].toString() : "Todos",
        costo: parseFloat(data[i][4]) || 0, 
        cupo: Math.max(cupoVal, 0),
        estado: "Activo"
      });
    }
  }
  return eventos;
}

/**
 * Obtener todos los eventos para el panel de Administrador (tanto Activos como Históricos / Cerrados)
 */
function getTodosEventosAdmin() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Eventos");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var eventos = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      var cupoVal = (data[i][5] === "" || data[i][5] === null || isNaN(parseInt(data[i][5]))) ? 0 : parseInt(data[i][5]);
      eventos.push({ 
        id: data[i][0], 
        nombre: data[i][1], 
        fecha: data[i][2],
        alcance: data[i][3] ? data[i][3].toString() : "Todos",
        costo: parseFloat(data[i][4]) || 0, 
        cupo: Math.max(cupoVal, 0),
        estado: data[i][6] ? data[i][6].toString().trim() : "Activo"
      });
    }
  }
  return eventos;
}

/**
 * Obtener eventos asignados al cajero (o todos si es Admin o evento general)
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
    var estado = eventos[i][6] ? eventos[i][6].toString().trim() : "Activo";
    if (estado === "Activo") {
      var cupoVal = (eventos[i][5] === "" || eventos[i][5] === null || isNaN(parseInt(eventos[i][5]))) ? 0 : parseInt(eventos[i][5]);
      var evObj = { 
        id: eventos[i][0], 
        nombre: eventos[i][1], 
        alcance: eventos[i][3] ? eventos[i][3].toString() : "Todos",
        costo: parseFloat(eventos[i][4]) || 0,
        cupo: Math.max(cupoVal, 0),
        estado: "Activo"
      };

      if (rol === "Admin") {
        listaEventos.push(evObj);
      } else {
        // En Colegio Boston, si un evento no tiene restricciones o está asignado al cajero o a "TODOS":
        var asignacionesDelEvento = [];
        for (var j = 1; j < asignaciones.length; j++) {
          if (asignaciones[j][1] == eventos[i][0]) {
            asignacionesDelEvento.push(asignaciones[j][2] ? asignaciones[j][2].toString() : "");
          }
        }

        // Si no tiene asignación en la tabla, es general y está abierto para todos los cajeros
        if (asignacionesDelEvento.length === 0) {
          listaEventos.push(evObj);
        } else if (asignacionesDelEvento.indexOf(idCajero) !== -1 || asignacionesDelEvento.indexOf("TODOS") !== -1) {
          listaEventos.push(evObj);
        }
      }
    }
  }
  return listaEventos;
}

/**
 * Crear nuevo evento desde panel Admin (con soporte para alcance de grados/grupos y cupo ilimitado)
 */
function crearNuevoEvento(nombre, costo, cupo, idCajeroAsignado, alcance) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var idEvento = "EV-" + new Date().getTime().toString().slice(-6);
  var fechaActual = new Date().toISOString().split('T')[0];
  
  // 0 o en blanco significa sin límite de cupo
  var cupoFinal = 0;
  if (cupo !== "" && cupo !== null && cupo !== undefined) {
    var cupoNum = parseInt(cupo);
    cupoFinal = isNaN(cupoNum) ? 0 : Math.max(cupoNum, 0);
  }
  
  var alcanceFinal = (alcance && alcance.toString().trim() !== "") ? alcance.toString().trim() : "Todos";

  try {
    sheetEventos.appendRow([idEvento, nombre.trim(), fechaActual, alcanceFinal, parseFloat(costo) || 0, cupoFinal, "Activo"]);
    
    var sheetAsignaciones = ss.getSheetByName("Asignaciones");
    if (sheetAsignaciones) {
      if (idCajeroAsignado && idCajeroAsignado !== "TODOS") {
        var idAsignacion = "ASG-" + new Date().getTime().toString().slice(-6);
        sheetAsignaciones.appendRow([idAsignacion, idEvento, idCajeroAsignado]);
      } else {
        // Asignar a todos los cajeros
        var sheetUsuarios = ss.getSheetByName("Usuarios");
        if (sheetUsuarios && sheetUsuarios.getLastRow() > 1) {
          var uData = sheetUsuarios.getDataRange().getValues();
          for (var u = 1; u < uData.length; u++) {
            if (uData[u][0]) {
              sheetAsignaciones.appendRow(["ASG-" + new Date().getTime().toString().slice(-5) + u, idEvento, uData[u][0]]);
            }
          }
        }
      }
    }
    return { success: true, message: "Evento '" + nombre + "' creado con éxito.", idEvento: idEvento };
  } catch(e) {
    return { success: false, message: "Error al crear evento: " + e.message };
  }
}

/**
 * Modificar evento existente
 */
function modificarEvento(idEvento, nuevoNombre, nuevoCosto, nuevoCupo, nuevoAlcance) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var data = sheetEventos.getDataRange().getValues();
  
  var cupoFinal = 0;
  if (nuevoCupo !== "" && nuevoCupo !== null && nuevoCupo !== undefined) {
    var cupoNum = parseInt(nuevoCupo);
    cupoFinal = isNaN(cupoNum) ? 0 : Math.max(cupoNum, 0);
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == idEvento) {
      sheetEventos.getRange(i + 1, 2).setValue(nuevoNombre.trim());
      if (nuevoAlcance !== undefined && nuevoAlcance !== null) {
        sheetEventos.getRange(i + 1, 4).setValue(nuevoAlcance.toString().trim());
      }
      sheetEventos.getRange(i + 1, 5).setValue(parseFloat(nuevoCosto) || 0);
      sheetEventos.getRange(i + 1, 6).setValue(cupoFinal);
      return { success: true, message: "Evento actualizado con éxito." };
    }
  }
  return { success: false, message: "Evento no encontrado." };
}

/**
 * Cerrar / Terminar evento escolar (queda en histórico para admin y bloqueado para nuevos cobros)
 */
function cerrarEvento(idEvento) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  if (!sheetEventos) return { success: false, message: "Hoja Eventos no encontrada" };
  var data = sheetEventos.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == idEvento) {
      sheetEventos.getRange(i + 1, 7).setValue("Cerrado");
      return { 
        success: true, 
        message: "El evento ha sido CERRADO / TERMINADO exitosamente. Ya no recibirá cobros en ventanilla y queda archivado en Histórico para consulta." 
      };
    }
  }
  return { success: false, message: "Evento no encontrado." };
}

/**
 * Reabrir evento escolar cerrado
 */
function reabrirEvento(idEvento) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  if (!sheetEventos) return { success: false, message: "Hoja Eventos no encontrada" };
  var data = sheetEventos.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == idEvento) {
      sheetEventos.getRange(i + 1, 7).setValue("Activo");
      return { 
        success: true, 
        message: "El evento ha sido REABIERTO exitosamente. Ya está visible nuevamente en caja para recepción de abonos." 
      };
    }
  }
  return { success: false, message: "Evento no encontrado." };
}

/**
 * Eliminar evento de forma permanente (para depuración anual de ciclo escolar)
 */
function eliminarEventoPermanente(idEvento) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var sheetAsig = ss.getSheetByName("Asignaciones");
  var sheetInsc = ss.getSheetByName("Inscripciones");
  var sheetAbonos = ss.getSheetByName("Historial_Abonos");
  
  if (!sheetEventos) return { success: false, message: "Hoja Eventos no encontrada" };
  
  // 1. Eliminar de Eventos
  var dataEv = sheetEventos.getDataRange().getValues();
  var borrado = false;
  for (var i = dataEv.length - 1; i >= 1; i--) {
    if (dataEv[i][0] == idEvento) {
      sheetEventos.deleteRow(i + 1);
      borrado = true;
      break;
    }
  }
  if (!borrado) return { success: false, message: "Evento no encontrado en la base de datos." };
  
  // 2. Eliminar de Asignaciones
  if (sheetAsig && sheetAsig.getLastRow() > 1) {
    var dataAs = sheetAsig.getDataRange().getValues();
    for (var a = dataAs.length - 1; a >= 1; a--) {
      if (dataAs[a][1] == idEvento) {
        sheetAsig.deleteRow(a + 1);
      }
    }
  }
  
  // 3. Eliminar de Inscripciones
  if (sheetInsc && sheetInsc.getLastRow() > 1) {
    var dataIn = sheetInsc.getDataRange().getValues();
    for (var ins = dataIn.length - 1; ins >= 1; ins--) {
      if (dataIn[ins][1] == idEvento) {
        sheetInsc.deleteRow(ins + 1);
      }
    }
  }
  
  // 4. Eliminar de Historial_Abonos
  if (sheetAbonos && sheetAbonos.getLastRow() > 1) {
    var dataAb = sheetAbonos.getDataRange().getValues();
    for (var ab = dataAb.length - 1; ab >= 1; ab--) {
      if (dataAb[ab][1] == idEvento) {
        sheetAbonos.deleteRow(ab + 1);
      }
    }
  }
  
  return { success: true, message: "Evento y sus datos asociados eliminados definitivamente para depuración anual." };
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

/**
 * Parser de texto de alcance escolar en Backend
 */
function parsearAlcanceBackend(alcanceStr) {
  if (!alcanceStr || typeof alcanceStr !== 'string' || alcanceStr.trim() === "" || alcanceStr.trim().toLowerCase() === "todos") {
    return { esTodos: true, grados: ["1", "2", "3"], grupos: ["A", "B", "C"] };
  }
  var segs = alcanceStr.split("|");
  var grados = [];
  var grupos = [];
  for (var i = 0; i < segs.length; i++) {
    var str = segs[i].trim();
    if (/^grados?/i.test(str)) {
      var val = str.split(":")[1] || "";
      if (val.toLowerCase().includes("todo")) {
        grados = ["1", "2", "3"];
      } else {
        var matches = val.match(/\d+/g);
        if (matches) {
          for (var g = 0; g < matches.length; g++) {
            if (grados.indexOf(matches[g]) === -1) grados.push(matches[g]);
          }
        }
      }
    } else if (/^grupos?/i.test(str)) {
      var valG = str.split(":")[1] || "";
      if (valG.toLowerCase().includes("todo")) {
        grupos = ["A", "B", "C"];
      } else {
        var matchesG = valG.toUpperCase().match(/[A-Z]/g);
        if (matchesG) {
          for (var gr = 0; gr < matchesG.length; gr++) {
            if (grupos.indexOf(matchesG[gr]) === -1) grupos.push(matchesG[gr]);
          }
        }
      }
    }
  }
  if (grados.length === 0) grados = ["1", "2", "3"];
  if (grupos.length === 0) grupos = ["A", "B", "C"];
  var esTodos = (grados.length === 3 && grupos.length === 3);
  return { esTodos: esTodos, grados: grados, grupos: grupos };
}

/**
 * Depuración de base de datos de eventos:
 * Conserva únicamente la 'Excursión a Tolantongo' dirigida a 3° de Secundaria (A, B, C)
 * con costo $4,400.00 y cupo 40, asignándola a todos los cajeros activos.
 */
function depurarEventosTolantongo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var sheetAsig = ss.getSheetByName("Asignaciones");
  var sheetInsc = ss.getSheetByName("Inscripciones");
  var sheetAbonos = ss.getSheetByName("Historial_Abonos");
  var sheetUsuarios = ss.getSheetByName("Usuarios");

  if (!sheetEventos) return { success: false, message: "Hoja Eventos no existe" };

  var idTolantongo = "EV-730628";
  var headersEventos = ["ID_Evento", "Nombre_Evento", "Fecha", "Grupos_Permitidos", "Costo_Por_Persona", "Cupo_Total", "Estado"];
  
  var filaTolantongo = [
    idTolantongo,
    "Excursión a Tolantongo",
    new Date().toISOString().split('T')[0],
    "Grados: 3 | Grupos: A, B, C",
    4400,
    40,
    "Activo"
  ];
  
  // 1. Limpiar y dejar solo Tolantongo en 'Eventos'
  sheetEventos.clearContents();
  sheetEventos.getRange(1, 1, 1, 7).setValues([headersEventos]);
  sheetEventos.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
  sheetEventos.getRange(2, 1, 1, 7).setValues([filaTolantongo]);
  
  // 2. Vincular Tolantongo a TODOS los usuarios (Cajeros y Admin)
  var listaUsuarios = [];
  if (sheetUsuarios && sheetUsuarios.getLastRow() > 1) {
    var uData = sheetUsuarios.getDataRange().getValues();
    for (var u = 1; u < uData.length; u++) {
      if (uData[u][0]) {
        listaUsuarios.push(uData[u][0].toString().trim());
      }
    }
  }
  
  var headersAsig = ["ID_Asignacion", "ID_Evento", "ID_Cajero"];
  var nuevasAsignaciones = [];
  listaUsuarios.forEach(function(idUsr, idx) {
    nuevasAsignaciones.push([
      "ASG-" + (730000 + idx),
      idTolantongo,
      idUsr
    ]);
  });
  
  if (sheetAsig) {
    sheetAsig.clearContents();
    sheetAsig.getRange(1, 1, 1, 3).setValues([headersAsig]);
    sheetAsig.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
    if (nuevasAsignaciones.length > 0) {
      sheetAsig.getRange(2, 1, nuevasAsignaciones.length, 3).setValues(nuevasAsignaciones);
    }
  }
  
  // 3. Limpiar Inscripciones que NO sean de Tolantongo
  var totalInscConservadas = 0;
  if (sheetInsc && sheetInsc.getLastRow() > 1) {
    var inscData = sheetInsc.getDataRange().getValues();
    var headersInsc = inscData[0];
    var inscFiltradas = [];
    for (var m = 1; m < inscData.length; m++) {
      if (inscData[m][1] == idTolantongo) {
        inscFiltradas.push(inscData[m]);
      }
    }
    sheetInsc.clearContents();
    sheetInsc.getRange(1, 1, 1, headersInsc.length).setValues([headersInsc]);
    sheetInsc.getRange(1, 1, 1, headersInsc.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
    if (inscFiltradas.length > 0) {
      sheetInsc.getRange(2, 1, inscFiltradas.length, headersInsc.length).setValues(inscFiltradas);
    }
    totalInscConservadas = inscFiltradas.length;
  }
  
  // 4. Limpiar Historial_Abonos que NO sean de Tolantongo
  var totalAbonosConservados = 0;
  if (sheetAbonos && sheetAbonos.getLastRow() > 1) {
    var abData = sheetAbonos.getDataRange().getValues();
    var headersAbonos = abData[0];
    var abFiltrados = [];
    for (var n = 1; n < abData.length; n++) {
      if (abData[n][1] == idTolantongo) {
        abFiltrados.push(abData[n]);
      }
    }
    sheetAbonos.clearContents();
    sheetAbonos.getRange(1, 1, 1, headersAbonos.length).setValues([headersAbonos]);
    sheetAbonos.getRange(1, 1, 1, headersAbonos.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
    if (abFiltrados.length > 0) {
      sheetAbonos.getRange(2, 1, abFiltrados.length, headersAbonos.length).setValues(abFiltrados);
    }
    totalAbonosConservados = abFiltrados.length;
  }
  
  return {
    success: true,
    message: "Depuración completada. Se eliminaron todos los eventos anteriores conservando únicamente 'Excursión a Tolantongo' para 3° de Secundaria (A, B, C), Costo $4,400.00, Cupo 40. Asignado a todos los cajeros.",
    eventoConservado: filaTolantongo,
    cajerosAsignados: listaUsuarios.length,
    inscripcionesConservadas: totalInscConservadas,
    abonosConservados: totalAbonosConservados
  };
}

// ============================================================================
// 3. GESTIÓN DE ALUMNOS, BALANCES Y COBROS
// ============================================================================

/**
 * Obtener catálogo ligero de todos los alumnos e invitados para autocompletado en búsqueda rápida en vivo
 */
function obtenerCatalogoAlumnosLigero() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetClientes = ss.getSheetByName("Clientes");
  if (!sheetClientes) return [];
  var data = sheetClientes.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var estatus = data[i][6] ? data[i][6].toString().trim().toLowerCase() : "activo";
    if (estatus.includes("inactiv") || estatus.includes("baja")) continue;
    if (data[i][0] && data[i][1]) {
      var idAl = data[i][0].toString().trim();
      var esExt = idAl.startsWith("EXT-") || (data[i][2] && data[i][2].toString().toLowerCase() === "externo") || (data[i][4] && data[i][4].toString().toUpperCase() === "EXT");
      lista.push({
        id: idAl,
        nombre: data[i][1].toString().trim(),
        grado: esExt ? "Invitado" : (data[i][3] ? data[i][3].toString().trim() : ""),
        grupo: esExt ? "EXT" : (data[i][4] ? data[i][4].toString().trim() : ""),
        esExterno: esExt
      });
    }
  }
  return lista;
}

/**
 * Registrar un nuevo participante como Invitado Externo (primos, amigos externos)
 */
function registrarInvitadoExterno(nombreInvitado, contacto, idAlumnoAnfitrion, nombreAnfitrion) {
  if (!nombreInvitado || nombreInvitado.trim() === "") {
    return { success: false, message: "El nombre del invitado externo es obligatorio." };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetClientes = ss.getSheetByName("Clientes");
  if (!sheetClientes) return { success: false, message: "No se encontró la hoja Clientes en la base de datos." };
  
  var idExt = "EXT-" + new Date().getTime().toString().slice(-6);
  var fechaHoy = new Date().toISOString();
  var contactoFinal = contacto ? contacto.trim() : "";
  var etiquetaAnfitrion = (nombreAnfitrion && nombreAnfitrion.trim() !== "") ? " (Inv. de " + nombreAnfitrion.trim() + ")" : "";
  var nombreCompleto = nombreInvitado.trim() + etiquetaAnfitrion;
  
  sheetClientes.appendRow([
    idExt,
    nombreCompleto,
    "Externo",
    "Invitado",
    "EXT",
    contactoFinal,
    "Activo",
    fechaHoy
  ]);
  
  return {
    success: true,
    message: "Invitado externo registrado con éxito.",
    invitado: {
      id: idExt,
      nombre: nombreCompleto,
      nivel: "Externo",
      grado: "Invitado",
      grupo: "EXT",
      email: contactoFinal,
      anfitrion: nombreAnfitrion || idAlumnoAnfitrion || ""
    }
  };
}

/**
 * Obtener la lista de todos los invitados externos registrados
 */
function obtenerInvitadosExternos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetClientes = ss.getSheetByName("Clientes");
  if (!sheetClientes) return [];
  var data = sheetClientes.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var idAl = data[i][0] ? data[i][0].toString().trim() : "";
    var nivAl = data[i][2] ? data[i][2].toString().trim().toLowerCase() : "";
    var gruAl = data[i][4] ? data[i][4].toString().trim().toUpperCase() : "";
    var estAl = data[i][6] ? data[i][6].toString().trim().toLowerCase() : "activo";
    
    if (estAl.includes("inactiv") || estAl.includes("baja")) continue;
    
    if (idAl.startsWith("EXT-") || nivAl === "externo" || gruAl === "EXT") {
      lista.push({
        id: idAl,
        nombre: data[i][1] ? data[i][1].toString().trim() : idAl,
        email: data[i][5] ? data[i][5].toString().trim() : "",
        grado: "Invitado",
        grupo: "EXT"
      });
    }
  }
  return lista;
}

/**
 * Consulta integral del historial de pagos y abonos de un alumno en todos los eventos.
 * Muestra el estado de abonos de eventos con movimientos y asocia automáticamente
 * todos los eventos activos escolares vigentes (incluso si tiene $0 abonos) para cobro inmediato.
 */
function consultarHistorialCompletoAlumno(criterio) {
  if (!criterio || criterio.toString().trim() === "") {
    return { success: false, message: "Ingresa un nombre o ID de alumno para buscar." };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetClientes = ss.getSheetByName("Clientes");
  var sheetEventos = ss.getSheetByName("Eventos");
  var sheetAbonos = ss.getSheetByName("Historial_Abonos");
  var sheetInsc = ss.getSheetByName("Inscripciones");
  var sheetUsuarios = ss.getSheetByName("Usuarios");
  
  if (!sheetClientes) {
    return { success: false, message: "No se encontró la hoja 'Clientes' en la base de datos." };
  }
  
  var clientesData = sheetClientes.getDataRange().getValues();
  var busqueda = criterio.toString().trim().toLowerCase();
  
  // 1. Localizar alumnos o invitados coincidentes por ID o Nombre (priorizando activos)
  var coincidentesActivos = [];
  var coincidentesBajas = [];
  for (var i = 1; i < clientesData.length; i++) {
    var idAl = clientesData[i][0] ? clientesData[i][0].toString().trim() : "";
    var nomAl = clientesData[i][1] ? clientesData[i][1].toString().trim() : "";
    var nivelAl = clientesData[i][2] ? clientesData[i][2].toString().trim() : "Secundaria";
    var gradoAl = clientesData[i][3] ? clientesData[i][3].toString().trim() : "";
    var grupoAl = clientesData[i][4] ? clientesData[i][4].toString().trim() : "";
    var emailAl = clientesData[i][5] ? clientesData[i][5].toString().trim() : "";
    var estatusAl = clientesData[i][6] ? clientesData[i][6].toString().trim() : "Activo";
    
    if (idAl.toLowerCase().includes(busqueda) || nomAl.toLowerCase().includes(busqueda)) {
      var itemAl = {
        id: idAl,
        nombre: nomAl,
        nivel: nivelAl,
        grado: gradoAl,
        grupo: grupoAl,
        email: emailAl,
        estatus: estatusAl,
        esExterno: idAl.startsWith("EXT-") || nivelAl.toLowerCase() === "externo" || grupoAl === "EXT"
      };
      if (estatusAl.toLowerCase().includes("baja") || estatusAl.toLowerCase().includes("inactiv")) {
        coincidentesBajas.push(itemAl);
      } else {
        coincidentesActivos.push(itemAl);
      }
    }
  }
  var alumnosCoincidentes = coincidentesActivos.concat(coincidentesBajas).slice(0, 15);
  
  if (alumnosCoincidentes.length === 0) {
    return { success: false, message: "No se encontró ningún alumno o invitado con el criterio: '" + criterio + "'." };
  }
  
  // 2. Diccionario de Eventos
  var dictEventos = {};
  if (sheetEventos) {
    var evData = sheetEventos.getDataRange().getValues();
    for (var k = 1; k < evData.length; k++) {
      if (evData[k][0]) {
        dictEventos[evData[k][0]] = {
          id: evData[k][0],
          nombre: evData[k][1] ? evData[k][1].toString() : evData[k][0],
          alcance: evData[k][3] ? evData[k][3].toString() : "Todos",
          costo: parseFloat(evData[k][4]) || 0,
          estatus: evData[k][6] ? evData[k][6].toString() : "Activo"
        };
      }
    }
  }
  
  // 3. Diccionario de Cajeros
  var dictCajeros = {};
  if (sheetUsuarios) {
    var usrData = sheetUsuarios.getDataRange().getValues();
    for (var u = 1; u < usrData.length; u++) {
      if (usrData[u][0]) {
        dictCajeros[usrData[u][0]] = usrData[u][1] ? usrData[u][1].toString() : usrData[u][3];
      }
    }
  }
  
  var dataAbonos = sheetAbonos ? sheetAbonos.getDataRange().getValues() : [];
  var dataInsc = sheetInsc ? sheetInsc.getDataRange().getValues() : [];
  
  // 4. Construir expediente detallado por alumno
  var expedientes = [];
  
  for (var a = 0; a < alumnosCoincidentes.length; a++) {
    var al = alumnosCoincidentes[a];
    var eventosMap = {};
    
    // Revisar inscripciones registradas
    for (var inx = 1; inx < dataInsc.length; inx++) {
      if (dataInsc[inx][2] && dataInsc[inx][2].toString().trim() === al.id) {
        var idEv = dataInsc[inx][1].toString().trim();
        var evInfo = dictEventos[idEv] || { nombre: idEv, costo: parseFloat(dataInsc[inx][3]) || 0, estatus: "Activo", alcance: "Todos" };
        var costoTotalEv = parseFloat(dataInsc[inx][3]) || evInfo.costo || 0;
        var pagadoInsc = parseFloat(dataInsc[inx][4]) || 0;
        var estatusInsc = dataInsc[inx][5] ? dataInsc[inx][5].toString() : "Parcial";
        
        eventosMap[idEv] = {
          idEvento: idEv,
          nombreEvento: evInfo.nombre,
          costoTotal: costoTotalEv,
          totalAbonado: pagadoInsc,
          estatus: estatusInsc,
          abonos: []
        };
      }
    }
    
    // Revisar historial de abonos
    for (var ab = 1; ab < dataAbonos.length; ab++) {
      if (dataAbonos[ab][2] && dataAbonos[ab][2].toString().trim() === al.id) {
        var idEventoAbono = dataAbonos[ab][1].toString().trim();
        var folio = dataAbonos[ab][0] ? dataAbonos[ab][0].toString() : "";
        var montoTexto = dataAbonos[ab][3] ? dataAbonos[ab][3].toString() : "0";
        var esCancelado = montoTexto.toUpperCase().includes("CANCELADO");
        var esCortesia = montoTexto.toUpperCase().includes("CORTES");
        var montoValor = (esCancelado || esCortesia) ? 0 : (parseFloat(montoTexto) || 0);
        var fechaAbono = dataAbonos[ab][4] ? new Date(dataAbonos[ab][4]).toLocaleString() : "N/A";
        var idCaj = dataAbonos[ab][5] ? dataAbonos[ab][5].toString() : "";
        var cajeroNombre = dictCajeros[idCaj] || idCaj || "Caja General";
        var estatusCorte = dataAbonos[ab][6] ? dataAbonos[ab][6].toString() : "Pendiente";
        
        if (!eventosMap[idEventoAbono]) {
          var evDef = dictEventos[idEventoAbono] || { nombre: idEventoAbono, costo: 0, estatus: "Activo", alcance: "Todos" };
          eventosMap[idEventoAbono] = {
            idEvento: idEventoAbono,
            nombreEvento: evDef.nombre,
            costoTotal: evDef.costo,
            totalAbonado: 0,
            estatus: esCortesia ? "Cortesía" : "Parcial",
            abonos: []
          };
        }
        
        eventosMap[idEventoAbono].abonos.push({
          folio: folio,
          montoTexto: montoTexto,
          montoValor: montoValor,
          fecha: fechaAbono,
          cajero: cajeroNombre,
          cancelado: esCancelado,
          cortesia: esCortesia,
          estatusCorte: estatusCorte
        });
      }
    }
    
    // 5. Vincular automáticamente TODOS los eventos escolares activos aplicables a este alumno
    // para que aparezcan en su expediente con saldo $0 abonado y listos para cobrar con un clic
    Object.keys(dictEventos).forEach(function(idEvActivo) {
      var evInfoActivo = dictEventos[idEvActivo];
      var estadoEv = evInfoActivo.estatus ? evInfoActivo.estatus.trim() : "Activo";
      if (estadoEv === "Activo" && !eventosMap[idEvActivo]) {
        var parsedAlc = parsearAlcanceBackend(evInfoActivo.alcance);
        var aplica = false;
        
        if (al.esExterno || al.grado === "Invitado" || al.grupo === "EXT") {
          // Invitados externos aplican a los eventos activos escolares
          aplica = true;
        } else if (parsedAlc.esTodos) {
          aplica = true;
        } else {
          var tieneGrado = parsedAlc.grados.indexOf(al.grado.toString()) !== -1;
          var tieneGrupo = parsedAlc.grupos.indexOf(al.grupo.toString().toUpperCase()) !== -1;
          aplica = tieneGrado && tieneGrupo;
        }
        
        if (aplica) {
          eventosMap[idEvActivo] = {
            idEvento: idEvActivo,
            nombreEvento: evInfoActivo.nombre,
            costoTotal: evInfoActivo.costo,
            totalAbonado: 0,
            restante: evInfoActivo.costo,
            estatus: "SIN PAGO",
            abonos: [],
            disponible: true
          };
        }
      }
    });

    // Totalizar importes de cada evento y del alumno
    var listaEventos = [];
    var granCosto = 0;
    var granAbonado = 0;
    
    Object.keys(eventosMap).forEach(function(key) {
      var evItem = eventosMap[key];
      var sumaVigente = 0;
      var tieneCortesia = false;
      
      for (var p = 0; p < evItem.abonos.length; p++) {
        if (!evItem.abonos[p].cancelado) {
          sumaVigente += evItem.abonos[p].montoValor;
          if (evItem.abonos[p].cortesia) tieneCortesia = true;
        }
      }
      
      var saldoResta = tieneCortesia ? 0 : Math.max(evItem.costoTotal - sumaVigente, 0);
      var badgeEstatus = tieneCortesia ? "CORTESÍA" : (saldoResta <= 0 && evItem.costoTotal > 0 ? "PAGADO" : (sumaVigente > 0 ? "CON ABONO" : "SIN PAGO"));
      
      evItem.totalAbonado = sumaVigente;
      evItem.restante = saldoResta;
      evItem.estatus = badgeEstatus;
      
      granCosto += evItem.costoTotal;
      granAbonado += sumaVigente;
      
      evItem.abonos.reverse();
      listaEventos.push(evItem);
    });
    
    expedientes.push({
      alumno: al,
      granCostoTotal: granCosto,
      granTotalAbonado: granAbonado,
      granRestante: Math.max(granCosto - granAbonado, 0),
      eventos: listaEventos
    });
  }
  
  return { success: true, expedientes: expedientes };
}

/**
 * Obtener alumnos filtrados por Grado y Grupo
 */
/**
 * Obtener alumnos por grado y grupo (o todos los grupos de un grado si grupo es vacío o 'TODOS')
 */
function getAlumnos(grado, grupo) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clientes");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var filtrados = [];
  var grupoTarget = (grupo && grupo.toString().trim().toUpperCase() !== "TODOS" && grupo.toString().trim() !== "") 
    ? grupo.toString().trim().toUpperCase() 
    : null;
  var gradoTarget = (grado && grado.toString().trim() !== "" && grado.toString().trim().toUpperCase() !== "TODOS")
    ? grado.toString().trim()
    : null;

  for (var i = 1; i < data.length; i++) {
    var estatus = data[i][6] ? data[i][6].toString().trim().toLowerCase() : "activo";
    if (estatus.includes("inactiv") || estatus.includes("baja")) continue;
    
    var rowGrado = data[i][3] !== undefined && data[i][3] !== null ? data[i][3].toString().trim() : "";
    var rowGrupo = data[i][4] !== undefined && data[i][4] !== null ? data[i][4].toString().trim().toUpperCase() : "";

    var matchGrado = (!gradoTarget || rowGrado == gradoTarget);
    var matchGrupo = (!grupoTarget || rowGrupo == grupoTarget);

    if (matchGrado && matchGrupo) {
      filtrados.push({ 
        id: data[i][0] ? data[i][0].toString().trim() : "", 
        nombre: data[i][1] ? data[i][1].toString().trim() : "", 
        grado: rowGrado,
        grupo: rowGrupo,
        email: data[i][5] || "" 
      });
    }
  }

  filtrados.sort(function(a, b) {
    if (a.grado !== b.grado) return a.grado.localeCompare(b.grado);
    if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo);
    return a.nombre.localeCompare(b.nombre);
  });

  return filtrados;
}

/**
 * Consultar balance en tiempo real del alumno para un evento
 * Detecta si el alumno cuenta con cortesía o con precio especial/descuento previo
 */
function getEstadoAlumno(idEvento, idCliente, costoTotal) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var inscripcionesSheet = ss.getSheetByName("Inscripciones");
  
  var costoDefault = parseFloat(costoTotal) || 0;
  var costoGuardado = 0;
  var tieneInscripcion = false;
  
  if (inscripcionesSheet && inscripcionesSheet.getLastRow() > 1) {
    var dataInsc = inscripcionesSheet.getDataRange().getValues();
    for (var j = 1; j < dataInsc.length; j++) {
      if (dataInsc[j][1] == idEvento && dataInsc[j][2] == idCliente) {
        costoGuardado = parseFloat(dataInsc[j][3]) || 0;
        tieneInscripcion = true;
        break;
      }
    }
  }
  
  var costoEfectivo = (costoGuardado > 0) ? costoGuardado : costoDefault;
  var esPrecioEspecial = (costoGuardado > 0 && Math.abs(costoGuardado - costoDefault) > 0.01);
  
  var totalAbonado = 0;
  var historial = [];
  var esCortesia = false;
  
  if (abonosSheet && abonosSheet.getLastRow() > 1) {
    var dataAbonos = abonosSheet.getDataRange().getValues();
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
  }

  return {
    costoTotal: costoEfectivo,
    costoOriginalEvento: costoDefault,
    esPrecioEspecial: esPrecioEspecial,
    precioEspecial: costoGuardado > 0 ? costoGuardado : costoDefault,
    montoPagado: totalAbonado,
    resta: esCortesia ? 0 : Math.max(costoEfectivo - totalAbonado, 0),
    historial: historial,
    cortesia: esCortesia
  };
}

/**
 * Registrar pago, cortesía institucional ($0) o cortesía con descuento (precio especial)
 */
function registrarPago(idEvento, nombreEvento, idCliente, nombreCliente, emailCliente, montoAbono, costoTotal, idCajero, grado, grupo, esCortesia, esPrecioEspecial) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var inscripcionesSheet = ss.getSheetByName("Inscripciones");
  
  montoAbono = esCortesia ? 0 : (parseFloat(montoAbono) || 0);
  costoTotal = parseFloat(costoTotal) || 0;
  var estadoActual = getEstadoAlumno(idEvento, idCliente, costoTotal);
  var nuevoTotalPagado = estadoActual.montoPagado + montoAbono;
  var estadoPagado = esCortesia ? "Cortesía" : (nuevoTotalPagado >= costoTotal ? "Total" : "Parcial");
  
  var timestamp = new Date().getTime().toString().slice(-6);
  var idAbono = esCortesia ? "CORT-" + timestamp : (esPrecioEspecial ? "DESC-" + timestamp : "FOLIO-" + timestamp);
  var fechaHora = new Date();
  
  var montoBD = esCortesia ? "CORTESÍA" : montoAbono;
  var estatusCorteBD = esCortesia ? "N/A (Cortesía)" : "Pendiente";
  
  // Guardar abono individual
  abonosSheet.appendRow([idAbono, idEvento, idCliente, montoBD, fechaHora, idCajero, estatusCorteBD]);
  
  // Actualizar o crear inscripción acumulada con el costo pactado (estándar o con descuento)
  var dataInsc = inscripcionesSheet.getDataRange().getValues();
  var filaEncontrada = -1;
  for (var i = 1; i < dataInsc.length; i++) {
    if (dataInsc[i][1] == idEvento && dataInsc[i][2] == idCliente) {
      filaEncontrada = i + 1;
      break;
    }
  }
  
  if (filaEncontrada !== -1) {
    if (costoTotal > 0) {
      inscripcionesSheet.getRange(filaEncontrada, 4).setValue(costoTotal);
    }
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
    var tagTarifaEspecial = esPrecioEspecial 
      ? `<span style="font-size: 11px; color: #b45309; font-weight: bold; display: block; margin-top: 3px;">🏷️ Tarifa con Descuento Especial (Hijo de Maestro / Personal)</span>`
      : ``;

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
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Participante:</strong></td><td style="padding: 6px 0; font-weight: 600;">${nombreCliente}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>${(grado === 'Invitado' || grupo === 'EXT') ? 'Modalidad:' : 'Grado y Grupo:'}</strong></td><td style="padding: 6px 0;">${(grado === 'Invitado' || grupo === 'EXT') ? 'Invitado Externo (Boleto Especial)' : (grado + '° Secundaria - Sección "' + grupo + '"')}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Fecha y Hora:</strong></td><td style="padding: 6px 0;">${fechaHora.toLocaleString()}</td></tr>
        </table>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; border-left: 6px solid #16a34a;">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #16a34a; font-weight: 800; font-size: 15px;">Monto Recibido hoy:</td><td style="text-align: right; color: #16a34a; font-weight: 800; font-size: 20px;">$${montoAbono}.00 MXN</td></tr>
            <tr><td style="color: #64748b; padding-top: 8px;">Total Acumulado Pagado:</td><td style="text-align: right; padding-top: 8px; font-weight: bold; color: #0b1f3f;">$${nuevoTotalPagado}.00 / $${costoTotal}.00 ${tagTarifaEspecial}</td></tr>
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
  var inscSheet = ss.getSheetByName("Inscripciones");
  costoTotal = parseFloat(costoTotal) || 0;
  
  var montosAbonadosPorAlumno = {};
  var cortesias = {};
  var costosPersonalizados = {};

  if (inscSheet && inscSheet.getLastRow() > 1) {
    var dataInsc = inscSheet.getDataRange().getValues();
    for (var k = 1; k < dataInsc.length; k++) {
      if (dataInsc[k][1] == idEvento && dataInsc[k][2]) {
        var idAlInsc = dataInsc[k][2].toString().trim();
        var cInsc = parseFloat(dataInsc[k][3]);
        if (cInsc > 0) costosPersonalizados[idAlInsc] = cInsc;
      }
    }
  }
  
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
    var estatusAl = clientesSheet[i][6] ? clientesSheet[i][6].toString().trim().toLowerCase() : "activo";
    if (estatusAl.includes("inactiv") || estatusAl.includes("baja")) continue;

    var alGrado = clientesSheet[i][3].toString().trim();
    var alGrupo = clientesSheet[i][4].toString().trim().toUpperCase();
    
    if (alGrado == grado.toString().trim() && alGrupo == grupo.toString().trim().toUpperCase()) {
      var idAlumno = clientesSheet[i][0].toString().trim();
      var nombreAlumno = clientesSheet[i][1].toString();
      var totalAbonado = montosAbonadosPorAlumno[idAlumno] || 0;
      var esCortesia = cortesias[idAlumno] || false;
      var costoAlumno = costosPersonalizados[idAlumno] || costoTotal;
      var restante = esCortesia ? 0 : Math.max(costoAlumno - totalAbonado, 0);
      
      var estatusText = "No ha pagado";
      if (esCortesia) {
        estatusText = "CORTESÍA";
      } else if (totalAbonado > 0) {
        estatusText = (restante <= 0) ? "PAGADO" : "Con Abono";
      }
      
      resultadoConcentrado.push({
        id: idAlumno,
        nombre: nombreAlumno,
        costo: costoAlumno,
        abonado: totalAbonado,
        restante: restante,
        estatus: estatusText,
        esPrecioEspecial: (costoAlumno !== costoTotal && !esCortesia)
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
// 5. CORTE Y ARQUEO DE CAJA - ENTREGA A CAJA GENERAL Y CORTES HISTÓRICOS
// ============================================================================

/**
 * Asegurar existencia y estructura de la hoja Cortes_Caja
 */
function asegurarHojaCortesCaja(ss) {
  var sheet = ss.getSheetByName("Cortes_Caja");
  if (!sheet) {
    sheet = ss.insertSheet("Cortes_Caja");
    var headers = [
      "ID_Corte", 
      "Fecha_Hora", 
      "ID_Cajero", 
      "Nombre_Cajero", 
      "Monto_Total", 
      "Total_Folios", 
      "Folios_Detalle_JSON", 
      "Desglose_Billetes_JSON", 
      "Diferencia_Cuadre", 
      "Observaciones", 
      "Estatus"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0b1f3f").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Obtener efectivo pendiente de entrega para el cajero activo y detalle de cobros del día
 * Filtra SOLO aquellos registros donde se abonó dinero real en efectivo (excluye cortesías $0 y cancelados).
 */
function obtenerEfectivoPendienteCajero(idCajero) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var clientesSheet = ss.getSheetByName("Clientes").getDataRange().getValues();
  var eventosSheet = ss.getSheetByName("Eventos").getDataRange().getValues();
  var dataAbonos = abonosSheet ? abonosSheet.getDataRange().getValues() : [];
  
  var dictAlumnos = {}; 
  var dictGrados = {};
  for (var i = 1; i < clientesSheet.length; i++) {
    var idAl = clientesSheet[i][0] ? clientesSheet[i][0].toString().trim() : "";
    var nomAl = clientesSheet[i][1] ? clientesSheet[i][1].toString().trim() : "";
    var grAl = clientesSheet[i][3] !== undefined ? clientesSheet[i][3].toString().trim() : "";
    var gpAl = clientesSheet[i][4] !== undefined ? clientesSheet[i][4].toString().trim() : "";
    dictAlumnos[idAl] = nomAl;
    dictGrados[idAl] = (grAl && gpAl) ? (grAl + "° " + gpAl) : (grAl || gpAl || "Invitado");
  }
  
  var dictEventos = {}; 
  for (var k = 1; k < eventosSheet.length; k++) {
    dictEventos[eventosSheet[k][0]] = eventosSheet[k][1];
  }
  
  var hoyStr = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd");
  
  var desglosePendiente = [];
  var cobrosDelDia = [];
  var totalPendiente = 0;
  var totalCobradoHoy = 0;
  var totalEntregadoHoy = 0;
  var conteoCobrosHoy = 0;
  
  for (var j = 1; j < dataAbonos.length; j++) {
    if (dataAbonos[j][5] == idCajero) {
      var montoTexto = dataAbonos[j][3] ? dataAbonos[j][3].toString() : "";
      if (montoTexto.includes("CANCELADO") || montoTexto.toUpperCase().includes("CORTES")) continue;
      
      var montoVal = parseFloat(montoTexto) || 0;
      if (montoVal <= 0) continue; // Solo quienes efectivamente abonaron dinero
      
      var estatusCorte = dataAbonos[j][6] ? dataAbonos[j][6].toString().trim() : "Pendiente";
      var rawFecha = dataAbonos[j][4];
      var fechaObj = rawFecha ? new Date(rawFecha) : new Date();
      var fechaItemStr = "";
      var horaItemStr = "";
      try {
        fechaItemStr = Utilities.formatDate(fechaObj, "GMT-6", "yyyy-MM-dd");
        horaItemStr = Utilities.formatDate(fechaObj, "GMT-6", "HH:mm");
      } catch(eF) {
        fechaItemStr = "";
        horaItemStr = "";
      }
      
      var itemCobro = {
        folio: dataAbonos[j][0],
        evento: dictEventos[dataAbonos[j][1]] || dataAbonos[j][1],
        idAlumno: dataAbonos[j][2],
        alumno: dictAlumnos[dataAbonos[j][2]] || "ID: " + dataAbonos[j][2],
        salon: dictGrados[dataAbonos[j][2]] || "Secundaria",
        monto: montoVal,
        fechaCompleta: fechaObj.toLocaleString(),
        hora: horaItemStr || "N/A",
        estatusCorte: estatusCorte
      };
      
      // 1. Si está pendiente de corte, entra al gran total en caja activa
      if (estatusCorte === "Pendiente") {
        totalPendiente += montoVal;
        desglosePendiente.push(itemCobro);
      }
      
      // 2. Si fue realizado hoy
      if (fechaItemStr === hoyStr) {
        totalCobradoHoy += montoVal;
        conteoCobrosHoy++;
        if (estatusCorte !== "Pendiente") {
          totalEntregadoHoy += montoVal;
        }
        cobrosDelDia.push(itemCobro);
      }
    }
  }
  
  // Ordenar cobros del día por fecha más reciente
  cobrosDelDia.sort(function(a, b) {
    return new Date(b.fechaCompleta) - new Date(a.fechaCompleta);
  });
  
  return {
    totalCaja: totalPendiente,
    transacciones: desglosePendiente,
    resumenHoy: {
      totalCobradoHoy: totalCobradoHoy,
      totalPendienteHoy: totalPendiente,
      totalEntregadoHoy: totalEntregadoHoy,
      conteoCobrosHoy: conteoCobrosHoy,
      fechaHoyTexto: Utilities.formatDate(new Date(), "GMT-6", "dd/MM/yyyy")
    },
    cobrosDelDia: cobrosDelDia
  };
}

/**
 * Procesar el cierre oficial de caja, generar el folio de corte, registrar en Cortes_Caja
 * y marcar los folios como Entregado a Caja General.
 */
function procesarCierreDeCajaBD(idCajero, nombreCajero, desgloseBilletes, diferenciaCuadre, observaciones) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var clientesSheet = ss.getSheetByName("Clientes").getDataRange().getValues();
  var eventosSheet = ss.getSheetByName("Eventos").getDataRange().getValues();
  var dataAbonos = abonosSheet.getDataRange().getValues();
  
  var dictAlumnos = {}; 
  var dictGrados = {};
  for (var i = 1; i < clientesSheet.length; i++) {
    dictAlumnos[clientesSheet[i][0]] = clientesSheet[i][1];
    dictGrados[clientesSheet[i][0]] = (clientesSheet[i][3] && clientesSheet[i][4]) ? (clientesSheet[i][3] + "° " + clientesSheet[i][4]) : "";
  }
  var dictEventos = {}; 
  for (var k = 1; k < eventosSheet.length; k++) dictEventos[eventosSheet[k][0]] = eventosSheet[k][1];
  
  var ahora = new Date();
  var timestamp = Utilities.formatDate(ahora, "GMT-6", "yyyyMMdd-HHmmss");
  var idCorte = "CORTE-" + timestamp;
  
  var foliosDetalle = [];
  var totalCorte = 0;
  var filasAModificar = [];
  
  for (var j = 1; j < dataAbonos.length; j++) {
    if (dataAbonos[j][5] == idCajero) {
      var montoTexto = dataAbonos[j][3] ? dataAbonos[j][3].toString() : "";
      if (montoTexto.includes("CANCELADO") || montoTexto.toUpperCase().includes("CORTES")) continue;
      
      var estatusCorte = dataAbonos[j][6] ? dataAbonos[j][6].toString().trim() : "Pendiente";
      if (estatusCorte === "Pendiente") {
        var montoVal = parseFloat(montoTexto) || 0;
        if (montoVal > 0) {
          totalCorte += montoVal;
          foliosDetalle.push({
            folio: dataAbonos[j][0],
            evento: dictEventos[dataAbonos[j][1]] || dataAbonos[j][1],
            idAlumno: dataAbonos[j][2],
            alumno: dictAlumnos[dataAbonos[j][2]] || "ID: " + dataAbonos[j][2],
            salon: dictGrados[dataAbonos[j][2]] || "Secundaria",
            monto: montoVal,
            fecha: dataAbonos[j][4] ? new Date(dataAbonos[j][4]).toLocaleString() : "N/A"
          });
          filasAModificar.push(j + 1);
        }
      }
    }
  }
  
  if (foliosDetalle.length === 0 || totalCorte === 0) {
    return { success: false, message: "No hay efectivo pendiente por entregar en este momento ($0.00)." };
  }
  
  // Marcar folios en Historial_Abonos
  for (var m = 0; m < filasAModificar.length; m++) {
    abonosSheet.getRange(filasAModificar[m], 7).setValue("Entregado (" + idCorte + ")");
  }
  
  // Registrar en hoja Cortes_Caja
  var cortesSheet = asegurarHojaCortesCaja(ss);
  var fechaHoraStr = Utilities.formatDate(ahora, "GMT-6", "dd/MM/yyyy HH:mm:ss");
  
  cortesSheet.appendRow([
    idCorte,
    fechaHoraStr,
    idCajero,
    nombreCajero || "Cajero " + idCajero,
    totalCorte,
    foliosDetalle.length,
    JSON.stringify(foliosDetalle),
    JSON.stringify(desgloseBilletes || {}),
    diferenciaCuadre || 0,
    observaciones || "Entrega de cobros diarios a Caja General",
    "Entregado a Caja General"
  ]);
  
  return {
    success: true,
    message: "Corte de caja oficial generado exitosamente.",
    idCorte: idCorte,
    fechaHora: fechaHoraStr,
    idCajero: idCajero,
    nombreCajero: nombreCajero,
    totalCorte: totalCorte,
    totalFolios: foliosDetalle.length,
    transacciones: foliosDetalle,
    desgloseBilletes: desgloseBilletes || {},
    diferenciaCuadre: diferenciaCuadre || 0
  };
}

/**
 * Obtener historial de cortes de caja entregados
 */
function obtenerCortesHistoricos(idCajero, rol) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cortesSheet = ss.getSheetByName("Cortes_Caja");
  if (!cortesSheet || cortesSheet.getLastRow() <= 1) {
    return [];
  }
  
  var data = cortesSheet.getDataRange().getValues();
  var resultado = [];
  
  for (var i = 1; i < data.length; i++) {
    var cajeroRow = data[i][2] ? data[i][2].toString().trim() : "";
    if (rol === 'Admin' || cajeroRow === idCajero) {
      var foliosParsed = [];
      try { foliosParsed = JSON.parse(data[i][6]); } catch(e) { foliosParsed = []; }
      
      var desgloseParsed = {};
      try { desgloseParsed = JSON.parse(data[i][7]); } catch(e) { desgloseParsed = {}; }
      
      resultado.push({
        idCorte: data[i][0],
        fechaHora: data[i][1],
        idCajero: data[i][2],
        nombreCajero: data[i][3],
        montoTotal: parseFloat(data[i][4]) || 0,
        totalFolios: parseInt(data[i][5]) || 0,
        transacciones: foliosParsed,
        desgloseBilletes: desgloseParsed,
        diferenciaCuadre: parseFloat(data[i][8]) || 0,
        observaciones: data[i][9],
        estatus: data[i][10] || "Entregado a Caja General"
      });
    }
  }
  
  // Ordenar más recientes primero
  resultado.reverse();
  return resultado;
}

// ============================================================================
// 6. DASHBOARD DE MÉTRICAS FINANCIERAS Y RECAUDACIÓN POR SALÓN
// ============================================================================

/**
 * Obtener métricas y KPIs de recaudación financiera y avance por salón para un evento escolar
 * Retorna: Total recaudado, meta financiera, saldo por recaudar, lugares ocupados,
 * desglose de alumnos Boston vs externos, y lista por salón con nombres, abonado y lo que falta.
 */
function obtenerMetricasRecaudacion(idEvento) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEventos = ss.getSheetByName("Eventos");
  var sheetClientes = ss.getSheetByName("Clientes");
  var sheetInsc = ss.getSheetByName("Inscripciones");
  var sheetAbonos = ss.getSheetByName("Historial_Abonos");
  
  if (!sheetEventos) return { success: false, message: "No se encontró la hoja Eventos" };
  
  // 1. Obtener datos del evento
  var eventosData = sheetEventos.getDataRange().getValues();
  var eventoInfo = null;
  for (var i = 1; i < eventosData.length; i++) {
    if (eventosData[i][0] == idEvento) {
      var cupo = (eventosData[i][5] === "" || isNaN(parseInt(eventosData[i][5]))) ? 0 : parseInt(eventosData[i][5]);
      eventoInfo = {
        id: eventosData[i][0],
        nombre: eventosData[i][1],
        fecha: eventosData[i][2],
        alcance: eventosData[i][3] ? eventosData[i][3].toString() : "Todos",
        costo: parseFloat(eventosData[i][4]) || 0,
        cupo: Math.max(cupo, 0),
        estado: eventosData[i][6] ? eventosData[i][6].toString() : "Activo"
      };
      break;
    }
  }
  
  // Si no se pasó evento o no se encontró, tomar el primer evento activo
  if (!eventoInfo) {
    for (var e = 1; e < eventosData.length; e++) {
      if (eventosData[e][6] === "Activo") {
        var cupoAlt = (eventosData[e][5] === "" || isNaN(parseInt(eventosData[e][5]))) ? 0 : parseInt(eventosData[e][5]);
        eventoInfo = {
          id: eventosData[e][0],
          nombre: eventosData[e][1],
          fecha: eventosData[e][2],
          alcance: eventosData[e][3] ? eventosData[e][3].toString() : "Todos",
          costo: parseFloat(eventosData[e][4]) || 0,
          cupo: Math.max(cupoAlt, 0),
          estado: eventosData[e][6] ? eventosData[e][6].toString() : "Activo"
        };
        idEvento = eventoInfo.id;
        break;
      }
    }
  }
  
  if (!eventoInfo) return { success: false, message: "No hay eventos activos registrados para consultar métricas." };
  
  // 2. Mapear abonos por alumno para este evento
  var abonosData = sheetAbonos ? sheetAbonos.getDataRange().getValues() : [];
  var totalRecaudadoGlobal = 0;
  var abonosPorAlumno = {};
  var cortesiasPorAlumno = {};
  
  for (var j = 1; j < abonosData.length; j++) {
    if (abonosData[j][1] == idEvento) {
      var montoStr = abonosData[j][3] ? abonosData[j][3].toString().toUpperCase() : "0";
      if (montoStr.includes("CANCELADO")) continue;
      
      var idAl = abonosData[j][2] ? abonosData[j][2].toString().trim() : "";
      if (montoStr.includes("CORTES")) {
        cortesiasPorAlumno[idAl] = true;
      } else {
        var montoNum = parseFloat(montoStr) || 0;
        totalRecaudadoGlobal += montoNum;
        if (!abonosPorAlumno[idAl]) abonosPorAlumno[idAl] = 0;
        abonosPorAlumno[idAl] += montoNum;
      }
    }
  }
  
  // 3. Mapear inscripciones para detectar tarifas pactadas con descuento especial
  var inscData = sheetInsc ? sheetInsc.getDataRange().getValues() : [];
  var costosPersonalizados = {};
  for (var k = 1; k < inscData.length; k++) {
    if (inscData[k][1] == idEvento && inscData[k][2]) {
      var idAlInsc = inscData[k][2].toString().trim();
      var cInsc = parseFloat(inscData[k][3]);
      if (cInsc > 0) costosPersonalizados[idAlInsc] = cInsc;
    }
  }
  
  // 4. Mapear alumnos activos y participantes externos
  var clientesData = sheetClientes ? sheetClientes.getDataRange().getValues() : [];
  var parseAlcance = parsearAlcanceBackend(eventoInfo.alcance);
  
  var salonesMap = {};
  var totalLugaresOcupados = 0;
  var totalAlumnosBoston = 0;
  var totalInvitadosExternos = 0;
  
  for (var c = 1; c < clientesData.length; c++) {
    var idCli = clientesData[c][0] ? clientesData[c][0].toString().trim() : "";
    if (!idCli) continue;
    
    var nomCli = clientesData[c][1] ? clientesData[c][1].toString().trim() : "";
    var nivCli = clientesData[c][2] ? clientesData[c][2].toString().trim() : "";
    var graCli = clientesData[c][3] ? clientesData[c][3].toString().trim() : "";
    var gruCli = clientesData[c][4] ? clientesData[c][4].toString().trim().toUpperCase() : "";
    var estCli = clientesData[c][6] ? clientesData[c][6].toString().trim().toLowerCase() : "activo";
    
    if (estCli.includes("inactiv") || estCli.includes("baja")) continue;
    
    var esExterno = idCli.startsWith("EXT-") || nivCli.toLowerCase() === "externo" || gruCli === "EXT";
    var aplica = false;
    
    if (esExterno) {
      if (abonosPorAlumno[idCli] > 0 || cortesiasPorAlumno[idCli] || costosPersonalizados[idCli]) {
        aplica = true;
      }
    } else {
      if (parseAlcance.esTodos) {
        aplica = true;
      } else {
        var matchGrado = parseAlcance.grados.indexOf(graCli) !== -1;
        var matchGrupo = parseAlcance.grupos.indexOf(gruCli) !== -1;
        aplica = matchGrado && matchGrupo;
      }
    }
    
    if (!aplica) continue;
    
    var costoAlumno = costosPersonalizados[idCli] || eventoInfo.costo;
    var abonadoAlumno = abonosPorAlumno[idCli] || 0;
    var esCortesia = cortesiasPorAlumno[idCli] || false;
    var restanteAlumno = esCortesia ? 0 : Math.max(costoAlumno - abonadoAlumno, 0);
    
    var estatusBadge = "SIN PAGO";
    if (esCortesia) {
      estatusBadge = "CORTESÍA";
      totalLugaresOcupados++;
    } else if (abonadoAlumno >= costoAlumno && costoAlumno > 0) {
      estatusBadge = "PAGADO";
      totalLugaresOcupados++;
    } else if (abonadoAlumno > 0) {
      estatusBadge = "CON ABONO";
      totalLugaresOcupados++;
    }
    
    if (esExterno) {
      totalInvitadosExternos++;
    } else {
      totalAlumnosBoston++;
    }
    
    var claveSalon = esExterno ? "Invitados Externos" : (graCli + "° \"" + gruCli + "\"");
    if (!salonesMap[claveSalon]) {
      salonesMap[claveSalon] = {
        salon: claveSalon,
        esExterno: esExterno,
        totalAlumnos: 0,
        recaudado: 0,
        comprometido: 0,
        restante: 0,
        pagados: 0,
        conAbono: 0,
        sinPago: 0,
        cortesias: 0,
        alumnos: []
      };
    }
    
    salonesMap[claveSalon].totalAlumnos++;
    salonesMap[claveSalon].recaudado += abonadoAlumno;
    salonesMap[claveSalon].comprometido += costoAlumno;
    salonesMap[claveSalon].restante += restanteAlumno;
    
    if (estatusBadge === "PAGADO") salonesMap[claveSalon].pagados++;
    else if (estatusBadge === "CON ABONO") salonesMap[claveSalon].conAbono++;
    else if (estatusBadge === "CORTESÍA") salonesMap[claveSalon].cortesias++;
    else salonesMap[claveSalon].sinPago++;
    
    var porc = costoAlumno > 0 ? Math.min(Math.round((abonadoAlumno / costoAlumno) * 100), 100) : (esCortesia ? 100 : 0);
    
    salonesMap[claveSalon].alumnos.push({
      id: idCli,
      nombre: nomCli,
      grado: graCli,
      grupo: gruCli,
      costo: costoAlumno,
      abonado: abonadoAlumno,
      restante: restanteAlumno,
      estatus: estatusBadge,
      porcentaje: porc,
      esExterno: esExterno
    });
  }
  
  // Ordenar salones y ordenar alumnos en cada salón
  var salonesArray = [];
  Object.keys(salonesMap).forEach(function(k) {
    salonesMap[k].alumnos.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
    salonesArray.push(salonesMap[k]);
  });
  
  salonesArray.sort(function(a, b) {
    if (a.esExterno && !b.esExterno) return 1;
    if (!a.esExterno && b.esExterno) return -1;
    return a.salon.localeCompare(b.salon);
  });
  
  var metaFinanciera = (eventoInfo.cupo > 0) ? (eventoInfo.cupo * eventoInfo.costo) : (totalAlumnosBoston * eventoInfo.costo);
  var saldoRestanteMeta = Math.max(metaFinanciera - totalRecaudadoGlobal, 0);
  
  return {
    success: true,
    evento: eventoInfo,
    kpis: {
      totalRecaudado: totalRecaudadoGlobal,
      metaFinanciera: metaFinanciera,
      saldoRestanteMeta: saldoRestanteMeta,
      lugaresOcupados: totalLugaresOcupados,
      cupoTotal: eventoInfo.cupo,
      totalAlumnosBoston: totalAlumnosBoston,
      totalInvitadosExternos: totalInvitadosExternos,
      porcentajeMeta: metaFinanciera > 0 ? Math.min(Math.round((totalRecaudadoGlobal / metaFinanciera) * 100), 100) : 0,
      porcentajeCupo: eventoInfo.cupo > 0 ? Math.min(Math.round((totalLugaresOcupados / eventoInfo.cupo) * 100), 100) : 0
    },
    salones: salonesArray
  };
}

// ============================================================================
// 7. AUDITORÍA, ANULACIÓN Y ESTADÍSTICAS (ADMIN)
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

// ============================================================================
// 9. SINCRONIZACIÓN OFICIAL DE ALUMNOS, GRUPOS Y MATRÍCULAS ESCOLARES
// ============================================================================

/**
 * Sincroniza padrón de alumnos desde Google Sheets externa,
 * actualiza grados y grupos para el ciclo escolar,
 * da de baja a quienes ya no pertenezcan a las listas nuevas,
 * y genera las nuevas matrículas institucionales estándar (ej. S1A-01, S3C-19).
 */
function sincronizarAlumnosDesdeSheetExterna(urlOrId, gidForzado) {
  var idSheet = "1cfQ1ni8TuszbAhiW-jEB-Dk2Q7xSBVtUPjBrNP80I_I";

  if (urlOrId && typeof urlOrId === "string" && urlOrId.trim() !== "") {
    var matchId = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (matchId && matchId[1]) {
      idSheet = matchId[1];
    } else if (!urlOrId.includes("/") && urlOrId.length > 20) {
      idSheet = urlOrId.trim();
    }
  }

  var targetSS;
  try {
    targetSS = SpreadsheetApp.openById(idSheet);
  } catch (errSS) {
    return {
      success: false,
      message: "No se pudo abrir la hoja de cálculo con ID '" + idSheet + "': " + errSS.message
    };
  }

  // 1. Identificar las hojas oficiales activas del ciclo escolar 26-27 (1°, 2° y 3° de Secundaria)
  var todasLasHojas = targetSS.getSheets();
  var hojasCicloActivo = [];

  todasLasHojas.forEach(function(h) {
    var hName = h.getName().toUpperCase();
    var esHistorico = hName.includes("RESPALDO") || hName.includes("EGRESADOS") || hName.includes("DATOS") || hName.includes("COPIA") || hName.includes("24-25") || hName.includes("25-26");
    if (!esHistorico) {
      if (hName.includes("26-27")) {
        hojasCicloActivo.push(h);
      }
    }
  });

  // Si no se encontraron por etiqueta "26-27", buscar por pestañas consolidadas
  if (hojasCicloActivo.length === 0) {
    var hGrupos = targetSS.getSheetByName("Grupos");
    if (hGrupos) hojasCicloActivo.push(hGrupos);
  }

  if (hojasCicloActivo.length === 0) {
    return {
      success: false,
      message: "No se encontraron las pestañas del ciclo escolar activo 26-27 en la hoja de cálculo."
    };
  }

  var listaAlumnosNuevos = [];
  var mapaCorreosProcesados = {};
  var mapaNombresProcesados = {};

  function extraerAlumnosDeHoja(hoja) {
    if (!hoja || hoja.getLastRow() < 2) return;
    var data = hoja.getDataRange().getValues();
    if (data.length < 2) return;

    var hName = hoja.getName().toUpperCase();
    var gradoDefecto = "1";
    if (hName.includes("2°") || hName.includes("SEGUNDO") || hName.includes(" 2 ")) gradoDefecto = "2";
    if (hName.includes("3°") || hName.includes("TERCERO") || hName.includes(" 3 ")) gradoDefecto = "3";

    var headerRowIdx = 0;
    var colNombre = 1;
    var colGradoGrupo = 2;
    var colCorreo = 3;

    for (var r = 0; r < Math.min(data.length, 4); r++) {
      for (var c = 0; c < data[r].length; c++) {
        var val = (data[r][c] || "").toString().trim().toLowerCase();
        if (val.includes("nombre") || val.includes("alumno") || val.includes("apellidos")) colNombre = c;
        if (val.includes("grado") || val.includes("grupo") || val.includes("sección")) colGradoGrupo = c;
        if (val.includes("correo") || val.includes("email")) colCorreo = c;
      }
    }

    for (var i = headerRowIdx + 1; i < data.length; i++) {
      var row = data[i];
      var rawNombre = colNombre >= 0 && row[colNombre] ? row[colNombre].toString().trim() : "";
      if (!rawNombre || rawNombre.toLowerCase() === "nombre" || rawNombre.toLowerCase().includes("apellidos") || rawNombre.toLowerCase().includes("total")) continue;

      var rawGradoGrupo = colGradoGrupo >= 0 && row[colGradoGrupo] ? row[colGradoGrupo].toString().trim().toUpperCase() : "";
      var rawCorreo = colCorreo >= 0 && row[colCorreo] ? row[colCorreo].toString().trim().toLowerCase() : "";

      // Extraer Grado y Grupo (S1A, S2B, 3C, 1° A, etc.)
      var numGrado = gradoDefecto;
      var letGrupo = "A";

      var matchSalon = rawGradoGrupo.match(/S?([1-3])\s*[-°º]?\s*([A-Ca-c])/i);
      if (matchSalon) {
        numGrado = matchSalon[1];
        letGrupo = matchSalon[2].toUpperCase();
      } else {
        var matchG = rawGradoGrupo.match(/([1-3])/);
        if (matchG) numGrado = matchG[1];
        var matchLetra = rawGradoGrupo.match(/([A-Ca-c])/);
        if (matchLetra) letGrupo = matchLetra[1].toUpperCase();
      }

      var nombreLimpio = rawNombre.replace(/\s*\([^)]*\)\s*/g, " ").trim().replace(/\s+/g, " ");
      var normNombre = nombreLimpio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

      var claveUnica = rawCorreo || (normNombre + "_" + numGrado + letGrupo);
      if (mapaCorreosProcesados[claveUnica]) continue;
      mapaCorreosProcesados[claveUnica] = true;

      listaAlumnosNuevos.push({
        nombre: nombreLimpio,
        normNombre: normNombre,
        correo: rawCorreo,
        grado: numGrado,
        grupo: letGrupo
      });
    }
  }

  hojasCicloActivo.forEach(function(h) {
    extraerAlumnosDeHoja(h);
  });

  if (listaAlumnosNuevos.length === 0) {
    return {
      success: false,
      message: "No se pudieron extraer alumnos de las listas seleccionadas."
    };
  }

  // 2. Ordenar alfabéticamente por Grado (1, 2, 3), Grupo (A, B, C) y Nombre
  listaAlumnosNuevos.sort(function(a, b) {
    if (a.grado !== b.grado) return parseInt(a.grado) - parseInt(b.grado);
    if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo);
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
  });

  // 3. Generar nuevas matrículas oficiales (S1A-01, S1A-02...)
  var contadoresSalones = {};
  listaAlumnosNuevos.forEach(function(al) {
    var claveSalon = "S" + al.grado + al.grupo;
    if (!contadoresSalones[claveSalon]) contadoresSalones[claveSalon] = 0;
    contadoresSalones[claveSalon]++;
    var numLista = (contadoresSalones[claveSalon] < 10 ? "0" : "") + contadoresSalones[claveSalon];
    al.matricula = claveSalon + "-" + numLista;
  });

  // 4. Actualizar hoja 'Clientes' en la base de datos de Eventos Boston
  var ssActual = SpreadsheetApp.getActiveSpreadsheet();
  var sheetClientes = ssActual.getSheetByName("Clientes");
  if (!sheetClientes) {
    sheetClientes = ssActual.insertSheet("Clientes");
  }

  var clientesActuales = sheetClientes.getLastRow() > 0 ? sheetClientes.getDataRange().getValues() : [];
  var headersClientes = ["ID_Alumno", "Nombre", "Nivel", "Grado", "Grupo", "Email", "Estatus", "Fecha_Actualizacion"];

  var mapExistentesPorCorreo = {};
  var mapExistentesPorNombre = {};
  var mapMatriculaAntiguaANueva = {};

  for (var i = 1; i < clientesActuales.length; i++) {
    var idOld = clientesActuales[i][0] ? clientesActuales[i][0].toString().trim() : "";
    var nomOld = clientesActuales[i][1] ? clientesActuales[i][1].toString().trim() : "";
    var mailOld = clientesActuales[i][5] ? clientesActuales[i][5].toString().trim().toLowerCase() : "";
    var normNomOld = nomOld.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

    var objOld = {
      id: idOld,
      nombre: nomOld,
      email: mailOld,
      normNombre: normNomOld
    };

    if (mailOld) mapExistentesPorCorreo[mailOld] = objOld;
    if (normNomOld) mapExistentesPorNombre[normNomOld] = objOld;
  }

  var totalActualizados = 0;
  var totalNuevos = 0;
  var totalBajas = 0;
  var fechaHoy = new Date().toISOString().split('T')[0];

  var nuevasFilasClientes = [];
  var setCorreosNuevos = {};
  var setNombresNuevos = {};

  listaAlumnosNuevos.forEach(function(al) {
    var alExistente = (al.correo && mapExistentesPorCorreo[al.correo]) ? mapExistentesPorCorreo[al.correo] : mapExistentesPorNombre[al.normNombre];

    if (alExistente) {
      totalActualizados++;
      if (alExistente.id && alExistente.id !== al.matricula) {
        mapMatriculaAntiguaANueva[alExistente.id] = al.matricula;
      }
    } else {
      totalNuevos++;
    }

    if (al.correo) setCorreosNuevos[al.correo] = true;
    setNombresNuevos[al.normNombre] = true;

    nuevasFilasClientes.push([
      al.matricula,
      al.nombre,
      "Secundaria",
      parseInt(al.grado),
      al.grupo,
      al.correo,
      "Activo",
      fechaHoy
    ]);
  });

  // Identificar y procesar bajas (alumnos en la base de datos que ya no están en las listas actualizadas)
  var sheetAbonos = ssActual.getSheetByName("Historial_Abonos");
  var idsConPagos = {};
  if (sheetAbonos && sheetAbonos.getLastRow() > 1) {
    var abData = sheetAbonos.getDataRange().getValues();
    for (var a = 1; a < abData.length; a++) {
      if (abData[a][2]) idsConPagos[abData[a][2].toString().trim()] = true;
    }
  }

  for (var i = 1; i < clientesActuales.length; i++) {
    var idOld = clientesActuales[i][0] ? clientesActuales[i][0].toString().trim() : "";
    var mailOld = clientesActuales[i][5] ? clientesActuales[i][5].toString().trim().toLowerCase() : "";
    var nomOld = clientesActuales[i][1] ? clientesActuales[i][1].toString().trim() : "";
    var normNomOld = nomOld.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

    var estaEnNuevos = (mailOld && setCorreosNuevos[mailOld]) || setNombresNuevos[normNomOld];

    if (!estaEnNuevos && idOld) {
      totalBajas++;
      // Si el alumno tiene pagos registrados, lo conservamos como "Baja" para no corromper la contabilidad histórica
      if (idsConPagos[idOld]) {
        nuevasFilasClientes.push([
          idOld,
          nomOld,
          clientesActuales[i][2] || "Secundaria",
          clientesActuales[i][3] || "",
          clientesActuales[i][4] || "",
          mailOld,
          "Baja",
          fechaHoy
        ]);
      }
      // Si no tenía pagos, queda dado de baja y removido del padrón
    }
  }

  // Escribir en 'Clientes'
  sheetClientes.clearContents();
  sheetClientes.getRange(1, 1, 1, 8).setValues([headersClientes]);
  sheetClientes.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");

  if (nuevasFilasClientes.length > 0) {
    sheetClientes.getRange(2, 1, nuevasFilasClientes.length, 8).setValues(nuevasFilasClientes);
  }

  // 5. Migrar IDs antiguos en Historial_Abonos e Inscripciones
  if (Object.keys(mapMatriculaAntiguaANueva).length > 0) {
    if (sheetAbonos && sheetAbonos.getLastRow() > 1) {
      var abRange = sheetAbonos.getRange(2, 3, sheetAbonos.getLastRow() - 1, 1);
      var abValues = abRange.getValues();
      var abMod = false;
      for (var k = 0; k < abValues.length; k++) {
        var oldId = abValues[k][0] ? abValues[k][0].toString().trim() : "";
        if (mapMatriculaAntiguaANueva[oldId]) {
          abValues[k][0] = mapMatriculaAntiguaANueva[oldId];
          abMod = true;
        }
      }
      if (abMod) abRange.setValues(abValues);
    }

    var sheetInsc = ssActual.getSheetByName("Inscripciones");
    if (sheetInsc && sheetInsc.getLastRow() > 1) {
      var inRange = sheetInsc.getRange(2, 3, sheetInsc.getLastRow() - 1, 1);
      var inValues = inRange.getValues();
      var inMod = false;
      for (var m = 0; m < inValues.length; m++) {
        var oldInId = inValues[m][0] ? inValues[m][0].toString().trim() : "";
        if (mapMatriculaAntiguaANueva[oldInId]) {
          inValues[m][0] = mapMatriculaAntiguaANueva[oldInId];
          inMod = true;
        }
      }
      if (inMod) inRange.setValues(inValues);
    }
  }

  return {
    success: true,
    totalActivos: listaAlumnosNuevos.length,
    totalNuevos: totalNuevos,
    totalActualizados: totalActualizados,
    totalBajas: totalBajas,
    hojasProcesadas: hojasCicloActivo.map(function(h) { return h.getName(); }),
    salones: contadoresSalones,
    message: "Sincronización completada exitosamente. " + listaAlumnosNuevos.length + " alumnos activos registrados con sus nuevas matrículas oficiales (S1A a S3C)."
  };
}

/**
 * Carga masiva de pagos para la Excursión a Tolantongo (EV-730628)
 * Basada en las listas físicas de 3° de Secundaria (Grupos A, B y C)
 */
function ejecutarCargaMasivaTolantongo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abonosSheet = ss.getSheetByName("Historial_Abonos");
  var inscripcionesSheet = ss.getSheetByName("Inscripciones");
  var clientesSheet = ss.getSheetByName("Clientes");

  if (!abonosSheet || !inscripcionesSheet || !clientesSheet) {
    return { success: false, message: "No se encontraron las hojas requeridas en el archivo." };
  }

  var idEvento = "EV-730628";
  var idCajero = "USR-002"; // Hugo Galera M. (Cajero activo)
  var estatusCorteBD = "Pendiente";
  var fechaHora = new Date();

  // Lista exacta obtenida de las listas de control de 3° de Secundaria (Ciclo 2026-2027)
  var pagosLote = [
    // === TERCER GRADO GRUPO "A" ===
    { idCliente: 'S3A-01', nombreCliente: 'Agonizante Durán Derian Altair', grado: '3', grupo: 'A', abonos: [2400], asiento: '15', autorizacion: true },
    { idCliente: 'S3A-02', nombreCliente: 'Aguirre Pastrana Fabián', grado: '3', grupo: 'A', abonos: [2400, 2000], asiento: '13', autorizacion: false },
    { idCliente: 'S3A-03', nombreCliente: 'Aguirre Sedano Mariana', grado: '3', grupo: 'A', abonos: [2400, 2000], asiento: '08', autorizacion: false },
    { idCliente: 'S3A-04', nombreCliente: 'Betancourt Manrique Matías', grado: '3', grupo: 'A', abonos: [2200], asiento: '14', autorizacion: false },
    { idCliente: 'S3A-05', nombreCliente: 'Corro García Danna Adriel', grado: '3', grupo: 'A', abonos: [2400], asiento: '11', autorizacion: false },
    { idCliente: 'S3A-14', nombreCliente: 'Reyes Medina Sofía', grado: '3', grupo: 'A', abonos: [2400], asiento: '37', autorizacion: false },
    { idCliente: 'S3A-15', nombreCliente: 'Román Roldán María Fernanda', grado: '3', grupo: 'A', abonos: [2500], asiento: '', autorizacion: false },
    { idCliente: 'S3A-18', nombreCliente: 'Soto Alcaraz Emiliano', grado: '3', grupo: 'A', abonos: [2000], asiento: '30', autorizacion: false },
    { idCliente: 'S3A-19', nombreCliente: 'Talavera Carreón Renata', grado: '3', grupo: 'A', abonos: [2000], asiento: '27', autorizacion: false },
    { idCliente: 'S3A-20', nombreCliente: 'Vázquez Ávila María José', grado: '3', grupo: 'A', abonos: [2500], asiento: '18', autorizacion: true },

    // === TERCER GRADO GRUPO "B" ===
    { idCliente: 'S3B-01', nombreCliente: 'Amable Nájera Esteban', grado: '3', grupo: 'B', abonos: [2400, 2000], asiento: '05', autorizacion: false },
    { idCliente: 'S3B-03', nombreCliente: 'Arillo García Constanza Giselle', grado: '3', grupo: 'B', abonos: [3000], asiento: '10', autorizacion: false },
    { idCliente: 'S3B-04', nombreCliente: 'Aznar Velázquez Joshua', grado: '3', grupo: 'B', abonos: [2000], asiento: '12', autorizacion: false },
    { idCliente: 'S3B-08', nombreCliente: 'Cortés Sotelo Maximiliano', grado: '3', grupo: 'B', abonos: [2400], asiento: '06', autorizacion: true },
    { idCliente: 'S3B-09', nombreCliente: 'Cuata Moreno Leah', grado: '3', grupo: 'B', abonos: [2500, 1900], asiento: '02', autorizacion: true },
    { idCliente: 'S3B-10', nombreCliente: 'Delgado Álvarez Alejandra', grado: '3', grupo: 'B', abonos: [2400], asiento: '19', autorizacion: false },
    { idCliente: 'S3B-17', nombreCliente: 'Malo Estrella Fernanda Isabella', grado: '3', grupo: 'B', abonos: [1000, 1400], asiento: '04', costoTotal: 2400, esPrecioEspecial: true, autorizacion: false },
    { idCliente: 'S3B-18', nombreCliente: 'Martínez Nava Leonardo', grado: '3', grupo: 'B', abonos: [2200], asiento: '20', autorizacion: true },
    { idCliente: 'S3B-19', nombreCliente: 'Padilla Hernández Estefanía', grado: '3', grupo: 'B', abonos: [2000], asiento: '34', autorizacion: false },
    { idCliente: 'S3B-22', nombreCliente: 'Villegas Estrada Karla', grado: '3', grupo: 'B', abonos: [2400], asiento: '07', autorizacion: false },

    // === TERCER GRADO GRUPO "C" ===
    { idCliente: 'S3C-01', nombreCliente: 'Allende Peña Danna Valentina', grado: '3', grupo: 'C', abonos: [2400], asiento: '34', autorizacion: false },
    { idCliente: 'S3C-02', nombreCliente: 'Aranda Bahena Guillermo Fernando', grado: '3', grupo: 'C', abonos: [4400], asiento: '03', autorizacion: false },
    { idCliente: 'S3C-03', nombreCliente: 'Arzola Meléndez Sofía Inés', grado: '3', grupo: 'C', abonos: [2400], asiento: '01', autorizacion: false },
    { idCliente: 'S3C-09', nombreCliente: 'Filio Guadarrama Renata', grado: '3', grupo: 'C', abonos: [1500], asiento: '28', autorizacion: false },
    { idCliente: 'S3C-11', nombreCliente: 'Flores Pedraza María José', grado: '3', grupo: 'C', abonos: [2400, 2000], asiento: '16', autorizacion: false },
    { idCliente: 'S3C-12', nombreCliente: 'García Marín Sofía', grado: '3', grupo: 'C', abonos: [2000], asiento: '20', autorizacion: false },
    { idCliente: 'S3C-13', nombreCliente: 'González Luna Valeria', grado: '3', grupo: 'C', abonos: [2200], asiento: '27', autorizacion: false },
    { idCliente: 'S3C-14', nombreCliente: 'Hernández Narváez Lisandra', grado: '3', grupo: 'C', abonos: [2400], asiento: '09', autorizacion: false },
    { idCliente: 'S3C-16', nombreCliente: 'Martínez Montaño Paola', grado: '3', grupo: 'C', abonos: [2400], asiento: '33', autorizacion: false },
    { idCliente: 'S3C-19', nombreCliente: 'Ocampo Abarca Zara Lilian', grado: '3', grupo: 'C', abonos: [1000], asiento: '25', autorizacion: false },
    { idCliente: 'S3C-20', nombreCliente: 'Pardavé Gómez Diego', grado: '3', grupo: 'C', abonos: [2400], asiento: '17', autorizacion: false },
    { idCliente: 'S3C-21', nombreCliente: 'Taylor Verdeja Hilda Renata', grado: '3', grupo: 'C', abonos: [1500], asiento: '31', autorizacion: false },
    { idCliente: 'S3C-22', nombreCliente: 'Urban Ethan Neri', grado: '3', grupo: 'C', abonos: [2000], asiento: '23', autorizacion: false }
  ];

  var abonosExistentes = abonosSheet.getDataRange().getValues();
  var inscripcionesExistentes = inscripcionesSheet.getDataRange().getValues();

  var filasAbonosNuevos = [];
  var resumenAlumnos = [];
  var totalRecaudadoLote = 0;
  var contadorFolio = 1000;

  for (var i = 0; i < pagosLote.length; i++) {
    var p = pagosLote[i];
    var idAl = p.idCliente;
    var costoEventoAlumno = parseFloat(p.costoTotal) || 4400;
    var esEsp = !!p.esPrecioEspecial;
    var abonosArr = p.abonos;

    // Calcular abonos previos si existieran
    var acumulado = 0;
    for (var a = 1; a < abonosExistentes.length; a++) {
      if (abonosExistentes[a][1] == idEvento && abonosExistentes[a][2] == idAl) {
        var mExistente = parseFloat(abonosExistentes[a][3]);
        if (!isNaN(mExistente)) acumulado += mExistente;
      }
    }

    for (var b = 0; b < abonosArr.length; b++) {
      var monto = parseFloat(abonosArr[b]) || 0;
      if (monto <= 0) continue;

      acumulado += monto;
      totalRecaudadoLote += monto;
      contadorFolio++;

      var rand = Math.floor(100 + Math.random() * 900);
      var folio = (esEsp ? "DESC-" : "FOLIO-") + contadorFolio + "-" + rand;

      filasAbonosNuevos.push([
        folio,
        idEvento,
        idAl,
        monto,
        fechaHora,
        idCajero,
        estatusCorteBD
      ]);

      abonosExistentes.push([
        folio,
        idEvento,
        idAl,
        monto,
        fechaHora,
        idCajero,
        estatusCorteBD
      ]);
    }

    var estatusFinal = (acumulado >= costoEventoAlumno) ? "Total" : "Parcial";

    // Actualizar o insertar en Inscripciones
    var filaInsc = -1;
    for (var k = 1; k < inscripcionesExistentes.length; k++) {
      if (inscripcionesExistentes[k][1] == idEvento && inscripcionesExistentes[k][2] == idAl) {
        filaInsc = k + 1;
        break;
      }
    }

    if (filaInsc !== -1) {
      inscripcionesSheet.getRange(filaInsc, 4).setValue(costoEventoAlumno);
      inscripcionesSheet.getRange(filaInsc, 5).setValue(acumulado);
      inscripcionesSheet.getRange(filaInsc, 6).setValue(estatusFinal);
    } else {
      var idInsc = "INS-" + (2000 + i);
      inscripcionesSheet.appendRow([idInsc, idEvento, idAl, costoEventoAlumno, acumulado, estatusFinal]);
      inscripcionesExistentes.push([idInsc, idEvento, idAl, costoEventoAlumno, acumulado, estatusFinal]);
    }

    resumenAlumnos.push({
      id: idAl,
      nombre: p.nombreCliente,
      grado: p.grado,
      grupo: p.grupo,
      asiento: p.asiento,
      abonos: abonosArr,
      totalAbonado: acumulado,
      costo: costoEventoAlumno,
      restante: Math.max(costoEventoAlumno - acumulado, 0),
      estatus: estatusFinal,
      esPrecioEspecial: esEsp
    });
  }

  // Insertar todos los abonos en bloque para máxima eficiencia
  if (filasAbonosNuevos.length > 0) {
    var ultimaFila = abonosSheet.getLastRow();
    abonosSheet.getRange(ultimaFila + 1, 1, filasAbonosNuevos.length, 7).setValues(filasAbonosNuevos);
  }

  return {
    success: true,
    totalAlumnos: resumenAlumnos.length,
    totalTransacciones: filasAbonosNuevos.length,
    montoTotalRecaudado: totalRecaudadoLote,
    resumen: resumenAlumnos
  };
}
