// USARE 'require'
const { GoogleGenerativeAI } = require("@google/generative-ai");

// USARE 'exports.handler'
exports.handler = async function(event, context) {
  console.log("HANDLER TEST CHIAVE API - Avvio funzione...");

  if (event.httpMethod !== "POST") {
    console.log("HANDLER TEST CHIAVE API - Metodo non POST");
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let apiKeyStatus = "NON VERIFICATA";
  let initializationError = null;

  try {
    console.log("HANDLER TEST CHIAVE API - Controllo variabile GEMINI_API_KEY...");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      apiKeyStatus = "ERRORE: Variabile GEMINI_API_KEY non trovata!";
      console.error(apiKeyStatus);
      // Non blocchiamo qui, proviamo comunque l'inizializzazione per vedere l'errore specifico
    } else {
      apiKeyStatus = `TROVATA (lunghezza: ${apiKey.length})`; // Logghiamo la lunghezza per un controllo
      console.log(`HANDLER TEST CHIAVE API - Variabile GEMINI_API_KEY ${apiKeyStatus}`);
    }

    console.log("HANDLER TEST CHIAVE API - Tentativo di inizializzare GoogleGenerativeAI...");
    const genAI = new GoogleGenerativeAI(apiKey); // Usa la variabile letta
    console.log("HANDLER TEST CHIAVE API - GoogleGenerativeAI INIZIALIZZATO CON SUCCESSO!");
    apiKeyStatus += " - Inizializzazione OK";

    // Non facciamo altre chiamate API per ora

  } catch (error) {
    console.error("HANDLER TEST CHIAVE API - ERRORE DURANTE INIZIALIZZAZIONE:", error);
    initializationError = error.message;
    apiKeyStatus += ` - ERRORE INIZIALIZZAZIONE: ${error.message}`;
  }

  // Risposta fissa che include lo stato della chiave API
  const replyText = `Stato Chiave API: ${apiKeyStatus}`;
  console.log("HANDLER TEST CHIAVE API - Invio risposta:", replyText);

  // Se c'è stato un errore, restituiamo comunque 200 OK per vedere il messaggio di stato
  // Ma logghiamo l'errore per Netlify
  if (initializationError) {
      console.error("Errore critico rilevato durante il test della chiave API.");
  }

  return {
    statusCode: 200, // Risponde sempre OK per mostrare lo stato
    body: JSON.stringify({ reply: replyText })
  };
}
