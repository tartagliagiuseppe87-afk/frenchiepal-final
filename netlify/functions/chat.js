// VERSIONE DI TEST SEMPLIFICATA - NON CHIAMA GEMINI O SUPABASE

// Usiamo require per massima compatibilità
const util = require('util'); // Modulo standard di Node.js

exports.handler = async function(event, context) {
  // Log di base per vedere se la funzione parte
  console.log("HANDLER TEST START - Event received:", util.inspect(event, { depth: null }));

  if (event.httpMethod !== "POST") {
    console.log("HANDLER TEST - Method not POST");
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Tentiamo solo di leggere il body per vedere se arriva correttamente
    let requestBody;
    try {
        requestBody = JSON.parse(event.body || '{}');
        console.log("HANDLER TEST - Body parsed successfully:", requestBody);
    } catch (parseError) {
        console.error("HANDLER TEST - Error parsing body:", parseError);
        console.error("HANDLER TEST - Raw body:", event.body);
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
    }

    const message = requestBody.message || "No message received";
    const userId = requestBody.userId || "No userId received";

    // Risposta fissa per il test
    const replyText = `Test OK: Ricevuto messaggio "${message}" da user ${userId}`;
    console.log("HANDLER TEST - Sending fixed reply:", replyText);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: replyText }) // Risponde sempre "Test OK: ..."
    };

  } catch (error) {
    // Se c'è un errore inaspettato qui, è grave
    console.error("HANDLER TEST - UNEXPECTED CRITICAL ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Critical server error during test" })
    };
  }
}
