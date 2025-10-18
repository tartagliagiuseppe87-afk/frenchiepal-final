// USARE 'require'
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Prompt SEMPLIFICATO solo per il test
const systemPrompt = `Sei un assistente AI. Rispondi brevemente in italiano.`;

// USARE 'exports.handler'
exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, userId } = JSON.parse(event.body || '{}'); // Ignoriamo history
    let replyText = "";

    console.log(`HANDLER MINIMAL TEST - UserID: ${userId}, Message: ${message}`);

    // --- TEST MINIMO CHIAMATA GEMINI ---
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY non definita!");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("HANDLER MINIMAL TEST - GoogleGenerativeAI inizializzato.");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("HANDLER MINIMAL TEST - Modello Gemini ottenuto.");

    try {
      console.log("HANDLER MINIMAL TEST - Invio messaggio a Gemini (senza history):", message);
      // Chiamata diretta generateContent senza chat/history
      const result = await model.generateContent([systemPrompt, message]);
      const response = await result.response;
      replyText = await response.text();
      console.log("HANDLER MINIMAL TEST - Risposta ricevuta da Gemini.");

    } catch (geminiError) {
       console.error("HANDLER MINIMAL TEST - ERRORE DURANTE CHIAMATA GEMINI:", geminiError);
       // Rilancia l'errore per farlo catturare dal blocco catch esterno
       throw geminiError;
    }

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: replyText })
    };

  } catch (error) {
    console.error("ERRORE GENERALE nel test minimo:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Errore interno del server: ${error.message}` }) };
  }
}
