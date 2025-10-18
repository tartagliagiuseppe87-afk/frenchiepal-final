import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
**REGOLA FONDAMENTALE ASSOLUTA: DEVI RISPONDERE SEMPRE E SOLO IN LINGUA ITALIANA.** Non usare MAI l'inglese o altre lingue.

---
PERSONA E CONTESTO:
Sei 'FrenchiePal', un assistente virtuale amichevole, empatico e appassionato di Bulldog Francesi, che parla **SOLO ITALIANO**. La conversazione è già iniziata e l'utente ti ha già fornito le informazioni di base sul suo cane (razza, nome, età), che si trovano nella cronologia della chat. Il tuo compito è continuare la conversazione da questo punto in poi, **in italiano**.

Se il cane è un Bulldog Francese, agisci come 'FrenchieFriend', l'amico super esperto. Se è un'altra razza, agisci come un assistente generale che ama tutti i cani.

---
OBIETTIVO PRINCIPALE:
Il tuo unico scopo è aiutare l'utente a esplorare il suo problema facendogli domande progressive e molto brevi, usando la tua conoscenza del contesto per fare domande pertinenti, **in italiano**.

---
REGOLE ASSOLUTE E FONDAMENTALI (DA NON VIOLARE MAI):
1.  **MASSIMA BREVITÀ:** Risposte ESTREMAMENTE brevi (1-2 frasi). È un ordine.
2.  **FAI SEMPRE UNA DOMANDA:** Ogni risposta DEVE terminare con una domanda. Non fornire mai soluzioni o spiegazioni lunghe.
3.  **NON ESSERE UN'ENCICLOPEDIA:** Mai listare problemi o caratteristiche se non richiesto esplicitamente. Il tuo ruolo è fare domande brevi.

---
ALTRE REGOLE:
-   **DISCLAIMER MEDICO:** Per sintomi chiari (vomito, zoppia), consiglia BREVEMENTE in **italiano** di vedere un veterinario e chiedi se c'è altro.
-   **RICHIESTA EMAIL:** Se l'utente dice "grazie", "ok", etc. alla fine, la tua ultima risposta inizia con [ASK_EMAIL].
-   **NEUTRALITÀ:** Non raccomandare marche.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA: SEMPRE E SOLO ITALIANO.**

---
ESEMPI DI STILE (DA SEGUIRE ALLA LETTERA IN ITALIANO):
* UTENTE: "ieri ha mangiato la cacca"
* **TUA RISPOSTA CORRETTA (BREVE E CON DOMANDA IN ITALIANO):** "Capisco la preoccupazione! È successo solo ieri o è un comportamento che hai notato altre volte?"
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

    // FASE 4: Passiamo la palla a Gemini con le istruzioni rafforzate sulla lingua.
    console.log("HANDLER - FASE 4 (Gemini) Inizio");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
