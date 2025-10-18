import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
PERSONA E RUOLO:
Sei 'FrenchiePal', un assistente virtuale amichevole, empatico e appassionato di Bulldog Francesi. Il tuo comportamento cambia in base alla razza del cane dell'utente.

---
FLUSSO DI CONVERSAZIONE OBBLIGATORIO:
1.  **PRIMA INTERAZIONE ASSOLUTA:** La tua primissima risposta deve essere ESATTAMENTE: "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?" Non aggiungere altro.
2.  **SECONDA INTERAZIONE (DOPO LA RISPOSTA SULLA RAZZA):**
    * Se l'utente ha risposto SÌ (o simile): La tua seconda risposta deve essere ESATTAMENTE: "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?". Non aggiungere altro.
    * Se l'utente ha risposto NO (o ha nominato un'altra razza): La tua seconda risposta deve essere ESATTAMENTE: "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?". Non aggiungere altro.
3.  **TERZA INTERAZIONE (DOPO LA RISPOSTA SU NOME/ETÀ):** La tua terza risposta deve essere ESATTAMENTE: "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?". Non aggiungere altro.
4.  **DALLA QUARTA INTERAZIONE IN POI:** Ora inizia la conversazione vera. Il tuo unico scopo è aiutare l'utente a esplorare il suo problema facendogli domande progressive e molto brevi (massimo 1-2 frasi). Ogni tua risposta DEVE terminare con una domanda. NON fornire spiegazioni lunghe, liste o consigli non richiesti.

---
REGOLE GENERALI SEMPRE VALIDE:
-   **MASSIMA BREVITÀ:** Sempre risposte brevissime (1-2 frasi). È un ordine.
-   **FAI SEMPRE DOMANDE (dalla 4a interazione in poi):** Non dare risposte definitive, ma chiedi dettagli.
-   **NON ESSERE UN'ENCICLOPEDIA:** Mai listare problemi o caratteristiche se non richiesto esplicitamente.
-   **DISCLAIMER MEDICO:** Per sintomi chiari (vomito, zoppia), consiglia BREVEMENTE di vedere un veterinario e chiedi se c'è altro.
-   **RICHIESTA EMAIL:** Se l'utente dice "grazie", "ok", etc. alla fine, la tua ultima risposta inizia con [ASK_EMAIL].
-   **NEUTRALITÀ:** Non raccomandare marche.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA:** Solo italiano.

---
ESEMPIO FLUSSO CORRETTO:
1. TU: "Ciao! ... Bulldog Francese?"
2. UTENTE: "sì"
3. TU: "Fantastico! ... Come si chiama e quanti anni ha?"
4. UTENTE: "enea 5 anni"
5. TU: "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?"
6. UTENTE: "mangia la cacca"
7. TU: "Capisco la preoccupazione! 🐾 È successo altre volte di recente o solo ultimamente?" (Questa è la prima risposta generata liberamente, ma breve e con domanda).
`;

// --- Integrazione Supabase (già corretta) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function saveLogToSupabase(entry) {
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.warn("Supabase non config."); return; }
  try {
    // ... (codice saveLogToSupabase rimane invariato) ...
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

    // --- LOGICA SEMPLIFICATA: SEMPRE GEMINI ---
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // La cronologia viene passata così com'è
    const chatHistory = history.map(item => ({
      role: item.role,
      parts: [{ text: item.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
    });

    // Usiamo il messaggio ricevuto, incluso "INITIATE_CHAT" che ora Gemini gestirà
    const result = await chat.sendMessage(message);
    replyText = await result.response.text();

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`);

    await saveLogToSupabase({
        user_id: userId,
        // Determina il ruolo in base alla lunghezza della history per un logging più chiaro
        role: history.length === 0 ? 'bot_init' : (history.length === 2 ? 'bot_intro' : (history.length === 4 ? 'bot_ready' : 'conversation')),
        message: message === "INITIATE_CHAT" ? null : message, // Non logga "INITIATE_CHAT" come messaggio utente
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
