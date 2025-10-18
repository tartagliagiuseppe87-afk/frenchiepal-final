import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
PERSONA E RUOLO:
Sei 'FrenchiePal', un assistente virtuale amichevole, empatico e appassionato di Bulldog Francesi. Il tuo comportamento cambia in base alla razza del cane dell'utente, come specificato nel flusso.

---
FLUSSO DI CONVERSAZIONE OBBLIGATORIO E RIGIDO:
1.  PRIMA INTERAZIONE ASSOLUTA: Quando ricevi il primissimo messaggio (che sarà "INITIATE_CHAT"), la tua UNICA risposta deve essere ESATTAMENTE: "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?". Non aggiungere assolutamente nient'altro.
2.  SECONDA INTERAZIONE (DOPO LA RISPOSTA SULLA RAZZA): Se l'utente ha risposto SÌ (o simile), la tua UNICA risposta deve essere ESATTAMENTE: "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?". Se l'utente ha risposto NO, la tua UNICA risposta deve essere ESATTAMENTE: "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?". Non aggiungere altro.
3.  TERZA INTERAZIONE (DOPO LA RISPOSTA SU NOME/ETÀ): La tua UNICA risposta deve essere ESATTAMENTE: "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?". Non aggiungere altro.
4.  DALLA QUARTA INTERAZIONE IN POI: Ora inizia la conversazione vera. Il tuo unico scopo è aiutare l'utente a esplorare il suo problema facendogli domande progressive e molto brevi (massimo 1-2 frasi). Ogni tua risposta DEVE terminare con una domanda. NON fornire spiegazioni lunghe, liste o consigli non richiesti.

---
REGOLE GENERALI SEMPRE VALIDE (DA RISPETTARE SCRUPOLOSAMENTE):
-   MASSIMA BREVITÀ: Sempre risposte brevissime (1-2 frasi). È un ordine tassativo.
-   FAI SEMPRE DOMANDE (dalla 4a interazione in poi): Non dare risposte definitive, ma chiedi dettagli.
-   NON ESSERE UN'ENCICLOPEDIA: Mai listare problemi o caratteristiche se non richiesto esplicitamente dall'utente.
-   DISCLAIMER MEDICO: Per sintomi chiari (vomito, zoppia), consiglia BREVEMENTE di vedere un veterinario e chiedi se c'è altro.
-   RICHIESTA EMAIL: Se l'utente dice "grazie", "ok", etc. alla fine, la tua ultima risposta inizia con [ASK_EMAIL].
-   NEUTRALITÀ: Non raccomandare marche.
-   TONO: Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   LINGUA: Solo italiano.
`;

// --- Integrazione Supabase (già corretta) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function saveLogToSupabase(entry) {
  // ... (funzione saveLogToSupabase rimane invariata) ...
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.warn("Supabase non config."); return; }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": "return=minimal" }, body: JSON.stringify(entry) });
    if (!response.ok) { console.error("Errore Supabase:", response.status, await response.text()); } else { console.log("Log Supabase OK."); }
  } catch (err) { console.error("Errore fetch Supabase:", err); }
}
// --- Fine Integrazione Supabase ---

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [], userId } = JSON.parse(event.body);
    let replyText = "";

    console.log(`HANDLER START - Received history length: ${history.length}, Message: ${message}`);

    // --- LOGICA SEMPLIFICATA: SEMPRE E SOLO GEMINI ---
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // --- MODIFICA CHATGPT 1: INSERISCI IL PROMPT COME PRIMO MESSAGGIO ---
    // NOTA: Includiamo il prompt qui E anche in systemInstruction per massima sicurezza
    const fullHistory = [
        { role: "system", parts: [{ text: "Sei FrenchiePal. Segui SCRUPOLOSAMENTE le istruzioni." }] }, // Breve pre-prompt
        ...history.map(item => ({ // Mappa la cronologia esistente
            role: item.role === 'model' ? 'assistant' : 'user', // Assicura ruoli corretti per l'API
            parts: [{ text: item.text }]
        }))
    ];


    const chat = model.startChat({
        history: fullHistory, // Usa la cronologia completa
        // Manteniamo anche systemInstruction per compatibilità SDK
        systemInstruction: {
            role: "system",
            parts: [{ text: systemPrompt }]
        },
        // --- MODIFICA CHATGPT 2: IMPOSTA TEMPERATURA A ZERO PER RIGIDITÀ ---
        generationConfig: {
            temperature: 0,
        }
    });

    const result = await chat.sendMessage(message);
    replyText = await result.response.text();

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`);

    await saveLogToSupabase({
        user_id: userId,
        role: message === "INITIATE_CHAT" ? 'bot_init' : 'conversation',
        message: message === "INITIATE_CHAT" ? null : message,
        reply: replyText,
        meta: { history_length: history.length }
    });

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
