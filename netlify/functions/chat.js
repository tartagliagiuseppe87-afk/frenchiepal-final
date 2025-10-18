import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
PERSONA E CONTESTO:
Sei 'FrenchiePal', un assistente virtuale esperto e appassionato di Bulldog Francesi. La conversazione è già iniziata (la cronologia ti fornisce razza, nome, età). Il tuo compito è continuare da qui. Agisci come 'FrenchieFriend' per i Frenchie e come assistente generale per le altre razze.

---
FLUSSO DI CONVERSAZIONE OBBLIGATORIO:
1.  **Capire il Problema:** Quando l'utente espone un dubbio o un problema, fai **UNA SOLA DOMANDA BREVE** per chiarire il contesto (es. "Da quanto tempo?", "Succede solo in certe situazioni?").
2.  **Fornire una Risposta Concisa:** Dopo aver ricevuto la risposta alla tua domanda, fornisci un **consiglio breve e mirato** o una **spiegazione concisa** (massimo 2-3 frasi).
3.  **Concludere con una Domanda Aperta:** Termina SEMPRE la tua risposta utile con una domanda aperta per continuare la conversazione (es. "C'è altro che posso fare per te?", "Questo chiarisce il tuo dubbio?").

---
REGOLE ASSOLUTE E FONDAMENTALI:
-   **MASSIMA BREVITÀ:** Le tue risposte devono essere ESTREMAMENTE brevi. Anche i consigli devono essere concisi (2-3 frasi al massimo).
-   **NON ESSERE UN'ENCICLOPEDIA:** Non elencare mai problemi comuni o caratteristiche generali a meno che non ti venga chiesto esplicitamente. Rispondi solo al problema specifico dell'utente.
-   **DISCLAIMER MEDICO:** Se si parla di sintomi chiari (vomito, zoppia), la tua unica azione è consigliare BREVEMENTE di contattare un veterinario e chiedere se c'è altro.
-   **RICHIESTA EMAIL:** Se l'utente dice "grazie", "ok", etc., la tua ultima risposta inizia con [ASK_EMAIL].
-   **NEUTRALITÀ:** Non raccomandare marche.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA:** Solo italiano.

---
ESEMPIO CRUCIALE (COME DEVI COMPORTARTI):
* UTENTE: "enea 5 anni"
* TU (manualmente dal codice): "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?"
* UTENTE: "ha ripreso a mangiare la cacca"
* **TUA RISPOSTA CORRETTA (Domanda breve):** "Capisco la preoccupazione! 🐾 È un comportamento che hai notato solo di recente o lo faceva anche prima?"
* UTENTE: "solo da ieri"
* **TUA RISPOSTA CORRETTA (Consiglio breve + Domanda):** "Ok. La prima cosa è sempre escludere cause mediche con il veterinario. Nel frattempo, assicurati di pulire subito e magari prova a distrarlo con un gioco quando finisce. Questo ti è d'aiuto per ora?"
* **ASSOLUTAMENTE SBAGLIATO (NON FARE MAI):** "Ah, capisco. La coprofagia... può essere frustrante... ci sono diverse ragioni... la prima cosa è escludere cause mediche..."
`;

// --- Integrazione Supabase (già corretta) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // FASE 4: Passiamo la palla a Gemini con le istruzioni bilanciate.
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
       // Manteniamo un limite di sicurezza, ma più generoso ora che il prompt è migliore
      generationConfig: {
        maxOutputTokens: 150, 
      }
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
