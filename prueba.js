// Archivo: prueba.js
// Este script simula que WhatsApp le envía un mensaje a tu bot

async function probarBot() {
  const datosSimulados = {
    entry: [{
      changes: [{
        value: {
          contacts: [{ profile: { name: "Paciente Curioso" } }],
          messages: [{
            from: "56911112222",
            text: { body: "Hola" } // <--- AQUÍ CAMBIAMOS EL MENSAJE
          }]
        }
      }]
    }]
  };

  console.log("📨 Enviando mensaje simulado...");

  try {
    // Enviamos el mensaje a tu servidor local (puerto 3000)
    await fetch('http://localhost:3000/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosSimulados)
    });
    console.log("✅ ¡Mensaje enviado con éxito!");
  } catch (error) {
    console.error("❌ Error conectando con el bot:", error.message);
  }
}

probarBot();