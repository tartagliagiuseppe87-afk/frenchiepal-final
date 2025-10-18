// USARE 'import'
import { GoogleGenerativeAI } from "@google/generative-ai";
// Fetch è già disponibile globalmente

const systemPrompt = `
---
PERSONA E CONTESTO:
Sei 'FrenchiePal', un assistente virtuale e un grande appassionato di Bulldog Francesi... 
(Il tuo prompt completo e corretto va qui)
---
REGOLE ASSOLUTE E FONDAMENTALI...
---
ALTRE REGOLE...
---
ESEMPI DI STILE...
`; // Assicurati di incollare qui il tuo prompt completo!

// --- Integrazione Supabase (Temporaneamente Disabilitata) ---
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// async function saveLogToSupabase(entry) { /* ... */ }
// --- Fine Integrazione Supabase ---

// USARE 'export async function handler'
export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [], userId } = JSON.parse(event.body || '{}');
    const userMessageLower = message ? message.toLowerCase() : "";
    let replyText = ""; 

    console.log(`HANDLER START - Received history length: ${history.length}, Message: ${message}`);

    // FASE 1: Primo messaggio
    if (message === "INITIATE_CHAT") {
        replyText = "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?";
        console.log("HANDLER - FASE 1 Eseguita");
        // await saveLogToSupabase({ user_id: userId, role: 'bot_init', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 2: Risposta alla prima domanda (history.length === 1)
    if (history && history.length === 1) { 
        console.log("HANDLER - FASE 2 Inizio");
        if (userMessageLower.includes('si') || userMessageLower.includes('certo') || userMessageLower.includes('esatto') || userMessageLower === 'ok') { 
            replyText = "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?";
        } else {
            replyText = "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?";
        }
        console.log("HANDLER - FASE 2 Eseguita");
        // await saveLogToSupabase({ user_id: userId, role: 'user', message: message });
        // await saveLogToSupabase({ user_id: userId, role: 'bot_intro', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }
    
    // FASE 3: Risposta alla seconda domanda (history.length === 3)
    if (history && history.length === 3) { 
        console.log("HANDLER - FASE 3 Inizio");
        replyText = "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?";
        console.log("HANDLER - FASE 3 Eseguita");
        // await saveLogToSupabase({ user_id: userId, role: 'user', message: message });
        // await saveLogToSupabase({ user_id: userId, role: 'bot_ready', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 4: Passiamo la palla a Gemini (history.length >= 5)
    console.log("HANDLER - FASE 4 (Gemini) Inizio");
    if (!process.env.GEMINI_API_KEY) { throw new Error("GEMINI_API_KEY non definita!"); }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("GoogleGenerativeAI inizializzato.");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("Modello Gemini ottenuto.");

    const chatHistory = history.map(item => ({
      role: item.role === 'model' ? 'model' : 'user', // Ruolo Corretto
      parts: [{ text: item.text }]
    }));
    console.log("Cronologia mappata per Gemini.");

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
    });
    console.log("Chat Gemini avviata.");

    console.log("Invio messaggio a Gemini:", message);
    const result = await chat.sendMessage(message);
    console.log("Risposta ricevuta da Gemini.");
    replyText = await result.response.text(); 

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`);

    // await saveLogToSupabase({ /* ... */ }); // Lasciamo Supabase commentato per ora

    console.log("HANDLER - FASE 4 (Gemini) Eseguita");
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: replyText })
    };

  } catch (error) {
    console.error("ERRORE GENERALE nella funzione chat:", error);
    // ... (gestione errore invariata) ...
    return { statusCode: 500, body: JSON.stringify({ error: "Errore interno del server" }) };
  }
};

// Implementazione di saveLogToSupabase (anche se commentata sopra)
// async function saveLogToSupabase(entry) { /* ... codice ... */ }
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// async function saveLogToSupabase(entry) { ... }
