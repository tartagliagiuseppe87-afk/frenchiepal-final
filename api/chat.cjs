// USARE 'require'
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Prompt SEMPLIFICATO per Gemini
const systemPrompt = `
Sei 'FrenchiePal', un assistente AI amichevole per proprietari di cani, specializzato in Bulldog Francesi. Parla SEMPRE E SOLO IN ITALIANO.
Il tuo compito è aiutare l'utente rispondendo alle sue domande in modo BREVE (massimo 2-3 frasi) e terminando SEMPRE con una domanda per continuare la conversazione.
Se l'utente menziona sintomi di salute (vomito, zoppia, etc.), consiglia brevemente di contattare un veterinario.
Se l'utente dice "grazie" o simili alla fine, inizia la risposta con [ASK_EMAIL]. Non raccomandare marche. Usa emoji 🐾.
`;

// USARE 'exports.handler'
exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Parsing del body con fallback
    let message = "Messaggio non ricevuto";
    let history = [];
    let userId = "unknown";
    try {
        const body = JSON.parse(event.body || '{}');
        message = body.message || message;
        history = body.history || history;
        userId = body.userId || userId;
    } catch (parseError) {
        console.error("Errore parsing body:", parseError);
        // Non bloccare l'esecuzione, prova a continuare se possibile
    }

    console.log(`HANDLER START - UserID: ${userId}, History Length: ${history.length}, Message: ${message}`);

    // --- LOGICA SEMPLIFICATA: SEMPRE E SOLO GEMINI ---
    if (!process.env.GEMINI_API_KEY) {
      console.error("ERRORE: GEMINI_API_KEY non definita!");
      throw new Error("Configurazione API Key mancante.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chatHistory = history.map(item => ({
      role: item.role === 'model' ? 'model' : 'user', // Ruolo Corretto
      parts: [{ text: item.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }] // Usa il prompt semplice
      },
       generationConfig: {
        maxOutputTokens: 150, // Limite di sicurezza
      }
    });

    console.log("Invio messaggio a Gemini:", message);
    const result = await chat.sendMessage(message);
    const responseText = await result.response.text();
    console.log("Risposta ricevuta da Gemini.");

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${responseText}"`);

    // --- Supabase Disabilitato ---
    // console.log("Salvataggio Supabase saltato.");

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: responseText })
    };

  } catch (error) {
    console.error("ERRORE GENERALE nella funzione chat:", error);
    // Log dell'errore su Vercel/Netlify
    console.error(`ERROR DETAILS: ${error.message}, STACK: ${error.stack}`);
    
    return { statusCode: 500, body: JSON.stringify({ error: `Errore interno del server: ${error.message}` }) };
  }
}
