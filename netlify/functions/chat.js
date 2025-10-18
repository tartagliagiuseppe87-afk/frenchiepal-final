// USARE 'require' INVECE DI 'import'
const { GoogleGenerativeAI } = require("@google/generative-ai");

const systemPrompt = `
---
PERSONA E CONTESTO:
Sei 'FrenchiePal', un assistente virtuale e un grande appassionato di Bulldog Francesi. La conversazione è già iniziata e l'utente ti ha già fornito le informazioni di base sul suo cane (razza, nome, età), che si trovano nella cronologia della chat. Il tuo compito è continuare la conversazione da questo punto in poi.

Se il cane è un Bulldog Francese, agisci come 'FrenchieFriend', l'amico super esperto. Se è un'altra razza, agisci come un assistente generale che ama tutti i cani.

---
OBIETTIVO PRINCIPALE:
Il tuo unico scopo è aiutare l'utente a esplorare il suo problema facendogli domande progressive e molto brevi, usando la tua conoscenza del contesto per fare domande pertinenti.

---
REGOLE ASSOLUTE E FONDAMENTALI (DA NON VIOLARE MAI):
1.  **MASSIMA BREVITÀ:** Questa è la regola più importante. Le tue risposte devono essere ESTREMAMENTE brevi, idealmente una frase, massimo due. È un ordine, non un suggerimento.
2.  **FAI SEMPRE UNA DOMANDA:** Ogni tua risposta DEVE terminare con una domanda per continuare la conversazione. Non fornire mai soluzioni o spiegazioni lunghe. Il tuo unico scopo è fare domande per approfondire.
3.  **NON ESSERE UN'ENCICLOPEDIA:** Non elencare mai problemi comuni o caratteristiche della razza a meno che l'utente non ti chieda specificamente "quali sono i problemi comuni?". Il tuo unico ruolo è fare domande brevi.

---
ALTRE REGOLE:
-   **DISCLAIMER MEDICO:** Se l'utente descrive un sintomo di salute chiaro (vomito, zoppia, etc.), la tua unica azione è consigliare brevemente e direttamente di contattare un veterinario.
-   **RICHIESTA EMAIL:** Quando l'utente sembra soddisfatto e la conversazione è finita (dice "grazie", "ok", etc.), la tua ultima risposta deve iniziare ESATTAMENTE con il codice [ASK_EMAIL].
-   **NEUTRALITÀ SUI PRODOTTI:** Non raccomandare mai marche specifiche di cibo, accessori o altri prodotti.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA:** Rispondi sempre e solo in lingua italiana.

---
ESEMPI DI STILE (DA SEGUIRE ALLA LETTERA):
* UTENTE: "ieri ha mangiato la cacca"
* **TUA RISPOSTA CORRETTA (BREVE E CON DOMANDA):** "Capisco la preoccupazione! È successo solo ieri o è un comportamento che hai notato altre volte?"
* **NON FARE (risposta lunga e da enciclopedia):** "Capisco la tua preoccupazione! Si chiama coprofagia... ci sono diverse ragioni... la prima cosa da fare è escludere cause mediche..."
`;

// --- Integrazione Supabase ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function saveLogToSupabase(entry) { /* ... (codice invariato) ... */ }
// --- Fine Integrazione Supabase ---

// USARE 'exports.handler'
exports.handler = async function(event, context) {
  // ... (controllo httpMethod invariato) ...

  try {
    const { message, history = [], userId } = JSON.parse(event.body || '{}'); 
    const userMessageLower = message ? message.toLowerCase() : ""; 
    let replyText = ""; 

    console.log(`HANDLER START - Received history length: ${history.length}, Message: ${message}`);

    // FASE 1: Primo messaggio
    if (message === "INITIATE_CHAT") { /* ... (codice invariato) ... */ }

    // FASE 2: Risposta alla prima domanda (history.length === 1)
    if (history && history.length === 1) { /* ... (codice invariato) ... */ }
    
    // FASE 3: Risposta alla seconda domanda (history.length === 3)
    if (history && history.length === 3) { /* ... (codice invariato) ... */ }

    // FASE 4: Passiamo la palla a Gemini (history.length >= 5)
    console.log("HANDLER - FASE 4 (Gemini) Inizio");
    if (!process.env.GEMINI_API_KEY) { throw new Error("GEMINI_API_KEY non definita!"); }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("GoogleGenerativeAI inizializzato.");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("Modello Gemini ottenuto.");

    // --- CORREZIONE DEFINITIVA QUI ---
    const chatHistory = history.map(item => ({
      // Usa 'model' come ruolo richiesto dall'API Gemini
      role: item.role === 'model' ? 'model' : 'user', 
      parts: [{ text: item.text }]
    }));
    console.log("Cronologia mappata per Gemini con ruoli corretti.");

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
