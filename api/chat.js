// USARE 'require'
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Fetch è globale in Node.js >= 18 (usato da Vercel), non serve importarlo.

const systemPrompt = `
---
**REGOLA FONDAMENTALE ASSOLUTA: DEVI RISPONDERE SEMPRE E SOLO IN LINGUA ITALIANA.**

---
PERSONA E RUOLO:
Sei 'FrenchiePal', un assistente virtuale amichevole, empatico e appassionato di Bulldog Francesi, che parla **SOLO ITALIANO**. L'utente inizierà la conversazione.

---
OBIETTIVO PRINCIPALE:
Il tuo scopo è aiutare l'utente a esplorare il suo problema facendogli domande progressive e molto brevi. **Se non sai la razza, il nome o l'età del cane, chiedili *brevemente* durante i primi scambi per avere contesto**, ma solo se è rilevante per capire il problema. Non iniziare mai chiedendo queste informazioni di default.

---
REGOLE ASSOLUTE E FONDAMENTALI (DA NON VIOLARE MAI):
1.  **MASSIMA BREVITÀ:** Risposte ESTREMAMENTE brevi (1-2 frasi). È un ordine.
2.  **FAI SEMPRE UNA DOMANDA:** Ogni risposta DEVE terminare con una domanda per continuare la conversazione o chiedere dettagli. Non fornire mai soluzioni o spiegazioni lunghe.
3.  **NON ESSERE UN'ENCICLOPEDIA:** Mai listare problemi o caratteristiche generali. Rispondi solo al problema specifico dell'utente facendo domande.

---
ALTRE REGOLE:
-   **DISCLAIMER MEDICO:** Per sintomi chiari (vomito, zoppia), consiglia BREVEMENTE di vedere un veterinario e chiedi se c'è altro.
-   **RICHIESTA EMAIL:** Se l'utente dice "grazie", "ok", etc. alla fine, la tua ultima risposta inizia con [ASK_EMAIL].
-   **NEUTRALITÀ:** Non raccomandare marche.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA: SEMPRE E SOLO ITALIANO.**

---
ESEMPIO DI FLUSSO (SE L'UTENTE INIZIA COSÌ):
* UTENTE: "Ciao, il mio frenchie Enea di 5 anni mangia la cacca"
* **TUA RISPOSTA CORRETTA (BREVE E CON DOMANDA):** "Ciao Enea! 🥰 Capisco la preoccupazione. È un comportamento nuovo o lo faceva anche prima?"
`;

// --- Integrazione Supabase (Temporaneamente Disabilitata) ---
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// async function saveLogToSupabase(entry) { /* ... */ }
// --- Fine Integrazione Supabase ---

// USARE 'exports.handler'
exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Parsing del body con fallback robusto
    let message = "Messaggio non ricevuto";
    let history = [];
    let userId = "unknown";
    try {
        const body = JSON.parse(event.body || '{}');
        message = body.message || message;
        history = Array.isArray(body.history) ? body.history : [];
        userId = body.userId || userId;
    } catch (parseError) {
        console.error("Errore parsing body:", parseError);
        message = `Errore parsing body: ${parseError.message}`;
    }

    console.log(`HANDLER START - UserID: ${userId}, History Length: ${history.length}, Message: ${message}`);

    // --- LOGICA SEMPLIFICATA: SEMPRE E SOLO GEMINI ---
    if (!process.env.GEMINI_API_KEY) {
      console.error("ERRORE: GEMINI_API_KEY non definita!");
      throw new Error("Configurazione API Key mancante.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Mappatura sicura della cronologia
    const chatHistory = history.map(item => ({
      role: (item && item.role === 'model') ? 'model' : 'user', // Ruolo Corretto
      parts: [{ text: (item && item.text) ? item.text : "" }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
       generationConfig: {
        maxOutputTokens: 150, // Limite di sicurezza
      }
    });

    // Passiamo il messaggio dell'utente direttamente a Gemini
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const replyText = await response.text();

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`);

    // --- Supabase Disabilitato ---
    // console.log("Salvataggio Supabase saltato.");
    // await saveLogToSupabase({ /* ... */ });

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: replyText })
    };

  } catch (error) {
    console.error("ERRORE GENERALE nella funzione chat:", error);
    console.error(`ERROR DETAILS: ${error.message}, STACK: ${error.stack}`);
    // Non provare a loggare su Supabase qui per evitare loop di errori

    return { statusCode: 500, body: JSON.stringify({ error: `Errore interno del server: ${error.message}` }) };
  }
}

// Implementazione di saveLogToSupabase (anche se commentata sopra)
/*
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
*/
