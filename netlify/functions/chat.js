// USARE 'require' INVECE DI 'import'
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// --- Integrazione Supabase ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// La funzione saveLogToSupabase rimane invariata ma usa 'fetch' che è globale in Node.js >= 18
async function saveLogToSupabase(entry) {
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.warn("Supabase non config."); return; }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, { 
      method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": "return=minimal" }, 
      body: JSON.stringify(entry) });
    if (!response.ok) { console.error("Errore Supabase:", response.status, await response.text()); } 
    else { console.log("Log Supabase OK."); }
  } catch (err) { console.error("Errore fetch Supabase:", err); }
}
// --- Fine Integrazione Supabase ---

// USARE 'exports.handler' INVECE DI 'export async function handler'
exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [], userId } = JSON.parse(event.body);
    const userMessageLower = message.toLowerCase();
    let replyText = ""; 

    console.log(`HANDLER START - Received history length: ${history.length}, Message: ${message}`);

    // --- LOGICA INFALLIBILE BASATA SU HISTORY.LENGTH CORRETTA ---

    // FASE 1: Primo messaggio
    if (message === "INITIATE_CHAT") {
        replyText = "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?";
        console.log("HANDLER - FASE 1 Eseguita");
        await saveLogToSupabase({ user_id: userId, role: 'bot_init', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 2: Risposta alla prima domanda
    if (history.length === 1) { 
        console.log("HANDLER - FASE 2 Inizio");
        if (userMessageLower.includes('sì') || userMessageLower.includes('si')) {
            replyText = "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?";
        } else {
            replyText = "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?";
        }
        console.log("HANDLER - FASE 2 Eseguita");
        await saveLogToSupabase({ user_id: userId, role: 'user', message: message });
        await saveLogToSupabase({ user_id: userId, role: 'bot_intro', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }
    
    // FASE 3: Risposta alla seconda domanda
    if (history.length === 3) { 
        console.log("HANDLER - FASE 3 Inizio");
        replyText = "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?";
        console.log("HANDLER - FASE 3 Eseguita");
        await saveLogToSupabase({ user_id: userId, role: 'user', message: message });
        await saveLogToSupabase({ user_id: userId, role: 'bot_ready', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 4: Passiamo la palla a Gemini.
    console.log("HANDLER - FASE 4 (Gemini) Inizio");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chatHistory = history.map(item => ({
      role: item.role === 'model' ? 'assistant' : 'user', // Ruoli corretti
      parts: [{ text: item.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
    });
    
    const result = await chat.sendMessage(message);
    replyText = await result.response.text(); 

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`);

    await saveLogToSupabase({
        user_id: userId, role: 'conversation', message: message, reply: replyText,
        meta: { history_length: history.length } 
    });

    console.log("HANDLER - FASE 4 (Gemini) Eseguita");
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: replyText })
    };

  } catch (error) {
    console.error("Errore nella funzione chat:", error);
    try {
      const { userId } = JSON.parse(event.body || '{}');
      await saveLogToSupabase({ user_id: userId || 'unknown', role: 'error', message: event.body, 
          reply: error.message, meta: { stack: error.stack } });
    } catch (logError) { console.error("Errore salvataggio log errore:", logError); }
    
    return { statusCode: 500, body: JSON.stringify({ error: "Errore interno del server" }) };
  }
}
