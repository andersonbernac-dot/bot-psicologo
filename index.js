const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- MEMORIA RAM (SESIONES ACTIVAS) ---
let sesiones = {}; 

// --- MANEJO DE ARCHIVOS (Base de Datos JSON) ---
const DB_FILE = 'citas.json';

function leerBaseDeDatos() {
  if (!fs.existsSync(DB_FILE)) return [];
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

function guardarBaseDeDatos(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- GENERADOR DE HORAS (Simulado) ---
function generar10Horas() {
    const horas = [];
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    let contador = 1;
    
    // Generamos 10 horas ficticias para la próxima semana
    for (let i = 0; i < 2; i++) { // 2 horarios por día
        dias.forEach(dia => {
            const hora = i === 0 ? "10:00 AM" : "16:00 PM";
            horas.push(`${contador}. ${dia} - ${hora}`);
            contador++;
        });
    }
    return horas.join("\n");
}

// --- CEREBRO: MÁQUINA DE ESTADOS ---
function procesarFlujo(telefono, mensaje) {
  // Inicializar sesión si no existe
  if (!sesiones[telefono]) {
    sesiones[telefono] = { paso: 'NODO_1', datos: {} };
  }

  const sesion = sesiones[telefono];
  const msg = mensaje.toLowerCase().trim();
  let respuesta = "";

  // SWITCH GIGANTE PARA CONTROLAR LOS NODOS
  switch (sesion.paso) {

    // =============================================
    // NODO 1: INICIO (Menú Principal)
    // =============================================
    case 'NODO_1':
      if (msg.includes('hola') || msg.includes('inicio') || msg.includes('volver')) {
        respuesta = "👋 *Consulta Psicóloga*\nBienvenid@. Por favor elige una opción:\n\n" +
                    "1️⃣ Agendar Nueva Hora\n" +
                    "2️⃣ Cancelar/Reprogramar\n" +
                    "3️⃣ Dudas y Precios";
      } else if (msg === '1') {
        sesion.paso = 'NODO_2';
        respuesta = "Para comenzar, ¿eres paciente nuevo o ya tienes ficha?\n\n" +
                    "A. Soy Nuevo\n" +
                    "B. Ya soy paciente (Antiguo)";
      } else if (msg === '2') {
        sesion.paso = 'NODO_CANCELACION_1'; // Inicio del flujo de 3 pasos
        respuesta = "🛑 *Cancelación de Hora*\n\nPara buscar tu cita, por favor ingresa el RUT del paciente (Ej: 12345678-9).";
      } else if (msg === '3') {
        sesion.paso = 'NODO_6B';
        respuesta = "💡 *Información General*\n\n" +
                    "- Valor Sesión: $35.000 (Reembolsable)\n" +
                    "- Duración: 50 minutos\n" +
                    "- Plataforma: Zoom o Presencial (Metro Tobalaba)\n\n" +
                    "Escribe 'Volver' para regresar al menú.";
      } else {
        respuesta = "No entendí. Escribe 'Hola' para ver el menú.";
      }
      break;

    // =============================================
    // NODO 2: IDENTIFICACIÓN
    // =============================================
    case 'NODO_2':
      if (msg === 'a' || msg.includes('nuevo')) {
        sesion.paso = 'NODO_3_DATOS_1';
        respuesta = "📝 *Registro de Paciente Nuevo* (Paso 1/6)\n\nPor favor escribe tu **Nombre Completo**.";
      } else if (msg === 'b' || msg.includes('antiguo')) {
        sesion.paso = 'NODO_4';
        respuesta = "🔍 *Verificación*\n\nIngresa tu RUT para buscar tu historial.";
      } else {
        respuesta = "Por favor elige: 'A' (Nuevo) o 'B' (Antiguo).";
      }
      break;

    // =============================================
    // NODO 3: REGISTRO NUEVO (Los 6 Datos)
    // =============================================
    case 'NODO_3_DATOS_1': // Nombre
      sesion.datos.nombre = mensaje; // Guardamos como viene (mayúsculas/minúsculas)
      sesion.paso = 'NODO_3_DATOS_2';
      respuesta = "✅ (Paso 2/6) Ingresa tu **RUT** (o DNI).";
      break;

    case 'NODO_3_DATOS_2': // RUT
      sesion.datos.rut = mensaje;
      sesion.paso = 'NODO_3_DATOS_3';
      respuesta = "✅ (Paso 3/6) Ingresa tu **Correo Electrónico** para enviarte la confirmación.";
      break;

    case 'NODO_3_DATOS_3': // Email
      sesion.datos.email = mensaje;
      sesion.paso = 'NODO_3_DATOS_4';
      respuesta = "✅ (Paso 4/6) Ingresa tu número de **Teléfono/WhatsApp**.";
      break;

    case 'NODO_3_DATOS_4': // Teléfono
      sesion.datos.telefono = mensaje;
      sesion.paso = 'NODO_3_DATOS_5';
      respuesta = "✅ (Paso 5/6) Brevemente, ¿cuál es el **Motivo de Consulta**?";
      break;

    case 'NODO_3_DATOS_5': // Motivo
      sesion.datos.motivo = mensaje;
      sesion.paso = 'NODO_3_DATOS_6';
      respuesta = "✅ (Paso 6/6) ¿Prefieres atención **Online** o **Presencial**?";
      break;

    case 'NODO_3_DATOS_6': // Modalidad
      sesion.datos.modalidad = mensaje;
      sesion.paso = 'NODO_5'; // Saltamos a mostrar horas
      respuesta = `✨ ¡Datos guardados, ${sesion.datos.nombre}!\n\nAquí tienes las horas disponibles:\n` + generar10Horas();
      break;

    // =============================================
    // NODO 4: VERIFICACIÓN ANTIGUO
    // =============================================
    case 'NODO_4':
      const db = leerBaseDeDatos();
      const paciente = db.find(p => p.rut === msg || p.rut === mensaje);
      
      if (paciente) {
        // Recuperamos sus datos
        sesion.datos = { ...paciente }; 
        sesion.paso = 'NODO_5';
        respuesta = `👋 Hola de nuevo, ${paciente.nombre}. Es un gusto verte.\n\nSelecciona tu próxima hora:\n` + generar10Horas();
      } else {
        respuesta = "❌ No encontré ese RUT. ¿Quizás eres nuevo?\nEscribe 'Hola' para volver al inicio.";
      }
      break;

    // =============================================
    // NODO 5 & 5B: HORAS Y SELECCIÓN
    // =============================================
    case 'NODO_5':
      // Validamos si escribió un número del 1 al 10
      if (parseInt(msg) >= 1 && parseInt(msg) <= 10) {
        sesion.datos.horaSeleccionada = "Opción " + msg; // Simplificado
        sesion.paso = 'NODO_6';
        respuesta = `Has seleccionado la **Opción ${msg}**.\n\n⚠️ *Política de Confirmación*\nDebes abonar el 50% antes de 24hrs.\n\n¿Confirmas la reserva?\n\n1. ✅ SÍ, Confirmar\n2. ❌ NO, Cambiar`;
      } else {
        respuesta = "Por favor escribe solo el NÚMERO de la hora que quieres (del 1 al 10).";
      }
      break;

    // =============================================
    // NODO 6 & FINAL: GUARDADO
    // =============================================
    case 'NODO_6':
      if (msg === '1' || msg.includes('si')) {
        // GUARDAR EN JSON
        const nuevaCita = {
            id: Date.now(), // ID único
            status: "CONFIRMADA",
            fechaRegistro: new Date().toLocaleString(),
            ...sesion.datos // Guardamos los 6 datos + la hora
        };

        const dbFinal = leerBaseDeDatos();
        dbFinal.push(nuevaCita);
        guardarBaseDeDatos(dbFinal);

        respuesta = `🎉 **¡Cita Agendada!**\n\nEstimado/a ${sesion.datos.nombre}, te hemos enviado los datos bancarios a ${sesion.datos.email}.\n\nNos vemos pronto.`;
        delete sesiones[telefono]; // Fin de sesión
      
      } else {
        sesion.paso = 'NODO_5'; // Volver a elegir hora
        respuesta = "Entendido. Vuelve a elegir una hora de la lista:\n" + generar10Horas();
      }
      break;

    case 'NODO_6B': // Dudas (Salida)
        sesion.paso = 'NODO_1';
        respuesta = "Volviendo al menú...";
        break;

    // =============================================
    // NODO CANCELACIÓN (3 Pasos)
    // =============================================
    case 'NODO_CANCELACION_1': // Recibimos RUT
        const dbCancel = leerBaseDeDatos();
        // Buscamos cita que coincida RUT y que NO esté cancelada ya
        const citaEncontrada = dbCancel.find(c => c.rut === mensaje && c.status === "CONFIRMADA");

        if (citaEncontrada) {
            sesion.datos.citaIdCancelar = citaEncontrada.id;
            sesion.paso = 'NODO_CANCELACION_2';
            respuesta = `✅ Encontré una cita activa:\n📅 ${citaEncontrada.horaSeleccionada}\n👤 ${citaEncontrada.nombre}\n\n¿Seguro que deseas cancelarla?\n1. Sí, cancelar cita\n2. No, mantener`;
        } else {
            respuesta = "No encontré citas activas para ese RUT. Escribe 'Hola' para salir.";
            delete sesiones[telefono];
        }
        break;

    case 'NODO_CANCELACION_2': // Confirmación
        if (msg === '1' || msg.includes('si')) {
            // ACTUALIZAR JSON (Soft Delete)
            let dbUpdate = leerBaseDeDatos();
            // Buscamos la cita por ID y cambiamos status
            dbUpdate = dbUpdate.map(c => {
                if (c.id === sesion.datos.citaIdCancelar) {
                    return { ...c, status: "CANCELADA" };
                }
                return c;
            });
            guardarBaseDeDatos(dbUpdate);

            respuesta = "🗑️ Tu cita ha sido cancelada correctamente. Esperamos verte en otra oportunidad.";
            delete sesiones[telefono];
        } else {
            respuesta = "Operación abortada. Tu cita sigue vigente. ✅";
            delete sesiones[telefono];
        }
        break;

    default:
        sesion.paso = 'NODO_1';
        respuesta = "Reiniciando...";
        break;
  }

  return respuesta;
}

// --- SERVIDOR WEB ---
app.post("/chat-web", (req, res) => {
  const { mensaje, telefono } = req.body;
  const userId = telefono || "test_user";
  const rta = procesarFlujo(userId, mensaje);
  res.json({ respuesta: rta });
});

app.post("/webhook", (req, res) => { res.sendStatus(200); });
// --- RUTA SECRETA PARA ADMINISTRACIÓN ---
// La doctora entrará aquí para ver quién ha pedido hora
app.get("/admin/ver-citas", (req, res) => {
  const db = leerBaseDeDatos();
  res.json(db);
});
app.listen(PORT, () => {
  console.log(`🚀 Bot PRO (6 Pasos + Cancelación) corriendo en http://localhost:${PORT}`);
});