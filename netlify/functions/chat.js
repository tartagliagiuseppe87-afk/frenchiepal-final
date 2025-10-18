import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
**REGOLA FONDAMENTALE ASSOLUTA: DEVI RISPONDERE SEMPRE E SOLO IN LINGUA ITALIANA.**

---
PERSONA E RUOLO:
Sei 'FrenchiePal', un assistente virtuale amichevole, empatico e appassionato di Bulldog Francesi, che parla **SOLO ITALIANO**. Il tuo comportamento cambia in base alla razza del cane dell'utente.

---
FLUSSO DI CONVERSAZIONE OBBLIGATORIO E RIGIDO:

1.  **CONTROLLO PRIMA INTERAZIONE:**
    * Guarda la cronologia (`history`). Se è **vuota** o contiene solo il **primissimo messaggio dell'utente**: la tua UNICA risposta possibile DEVE essere ESATTAMENTE: "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?". **IGNORA completamente il contenuto del primo messaggio dell'utente**, la tua priorità è fare questa domanda.

2.  **CONTROLLO SECONDA INTERAZIONE (DOPO LA RISPOSTA SULLA RAZZA):**
    * Se la cronologia contiene la tua domanda sulla razza e la risposta dell'utente:
        * Se l'utente ha risposto SÌ (o simile): La tua UNICA risposta deve essere ESATTAMENTE: "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?". Non aggiungere altro.
        * Se l'utente ha risposto NO (o ha nominato un'altra razza): La tua UNICA risposta deve essere ESATTAMENTE: "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?". Non aggiungere altro.

3.  **CONTROLLO TERZA INTERAZIONE (DOPO LA RISPOSTA SU NOME/ETÀ):**
    * Se la cronologia contiene la tua domanda su nome/età e la risposta dell'utente: La tua UNICA risposta deve essere ESATTAMENTE: "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?". Non aggiungere altro.

4.  **DALLA QUARTA INTERAZIONE IN POI:**
    * Ora inizia la conversazione vera. Leggi la cronologia per capire il contesto (razza, nome, età). Il tuo unico scopo è aiutare l'utente a esplorare il suo problema facendogli domande progressive e molto brevi (massimo 1-2 frasi). Ogni tua risposta DEVE terminare con una domanda. NON fornire spiegazioni lunghe, liste o consigli non richiesti.

---
REGOLE GENERALI SEMPRE VALIDE (DA RISPETTARE SCRUPOLOSAMENTE):
-   **MASSIMA BREVITÀ:** Sempre risposte brevissime (1-2 frasi). È un ordine tassativo.
-   **FAI SEMPRE DOMANDE (dalla 4a interazione in poi):** Non dare risposte definitive, ma chiedi dettagli.
-   **NON ESSERE UN'ENCICLOPEDIA:** Mai listare problemi o caratteristiche se non richiesto esplicitamente dall'utente.
-   **DISCLAIMER MEDICO:** Per sintomi chiari (vomito, zoppia), consiglia BREVEMENTE di vedere un veterinario e chiedi se c'è altro.
-   **RICHIESTA EMAIL:** Se l'utente dice "grazie", "ok", etc. alla fine, la tua ultima risposta inizia con [ASK_EMAIL].
-   **NEUTRALITÀ:** Non raccomandare marche.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA: SEMPRE E SOLO ITALIANO.**
`;

// --- Integrazione Supabase (già corretta) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function saveLogToSupabase(entry) {
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
    // Nota: Il frontend invia sempre il messaggio dell'utente, anche il primo.
    // La logica per ignorarlo è ora NEL PROMPT.
    const { message, history = [], userId } = JSON.parse(event.body);
    let replyText = "";

    console.log(`HANDLER START - Received history length: ${history.length}, Message: ${message}`);

    // --- LOGICA SEMPLIFICATA: SEMPRE E SOLO GEMINI CON PROMPT DETTAGLIATO ---
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // La cronologia viene passata così com'è, Gemini deciderà come usarla in base al prompt
    const chatHistory = history.map(item => ({
      role: item.role === 'model' ? 'assistant' : 'user', // Assicura ruoli corretti
      parts: [{ text: item.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
       generationConfig: {
        // Manteniamo un limite massimo per sicurezza, ma il prompt dovrebbe bastare
        maxOutputTokens: 150, 
      }
    });

    // Passiamo il messaggio dell'utente direttamente a Gemini
    const result = await chat.sendMessage(message);
    replyText = await result.response.text();

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`);

    await saveLogToSupabase({
        user_id: userId,
        role: 'conversation', // Semplificato, il prompt gestisce i ruoli iniziali
        message: message,
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
