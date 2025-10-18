// USARE 'require' INVECE DI 'import'
const { GoogleGenerativeAI } = require("@google/generative-ai");

const systemPrompt = `
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
`; // Assicurati di incollare qui il tuo prompt completo!

// --- Integrazione Supabase (Temporaneamente Rimossa per Stabilità) ---
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// async function saveLogToSupabase(entry) { /* ... */ }
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
        // await saveLogToSupabase({ user_id: userId, role: 'bot_init', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 2: Risposta alla prima domanda
    if (history.length === 1) { 
        console.log("HANDLER - FASE 2 Inizio");
        if (userMessageLower.includes('si') || userMessageLower.includes('certo') || userMessageLower.includes('esatto') || userMessageLower === 'ok') { // Controllo Semplificato
            replyText = "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?";
        } else {
            replyText = "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?";
        }
        console.log("HANDLER - FASE 2 Eseguita");
        // await saveLogToSupabase({ user_id: userId, role: 'user', message: message });
        // await saveLogToSupabase({ user_id: userId, role: 'bot_intro', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }
    
    // FASE 3: Risposta alla seconda domanda
    if (history.length === 3) { 
        console.log("HANDLER - FASE 3 Inizio");
        replyText = "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?";
        console.log("HANDLER - FASE 3 Eseguita");
        // await saveLogToSupabase({ user_id: userId, role: 'user', message: message });
        // await saveLogToSupabase({ user_id: userId, role: 'bot_ready', reply: replyText });
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 4: Passiamo la palla a Gemini.
    console.log("HANDLER - FASE 4 (Gemini) Inizio");
    
    // --- PUNTO CRITICO: INIZIALIZZAZIONE GEMINI ---
    let genAI;
    try {
        console.log("Tentativo di inizializzare GoogleGenerativeAI...");
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY non trovata nelle variabili d'ambiente!");
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log("GoogleGenerativeAI inizializzato con successo.");
    } catch (initError) {
        console.error("ERRORE CRITICO durante inizializzazione GoogleGenerativeAI:", initError);
        throw initError; // Rilancia l'errore per farlo catturare dal blocco catch esterno
    }
    // --- FINE PUNTO CRITICO ---

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chatHistory = history.map(item => ({
      role: item.role === 'model' ? 'assistant' : 'user', 
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

    // await saveLogToSupabase({ /* ... */ }); // Temporaneamente disabilitato

    console.log("HANDLER - FASE 4 (Gemini) Eseguita");
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: replyText })
    };

  } catch (error) {
    console.error("ERRORE GENERALE nella funzione chat:", error); // Log errore generale
    // Tentativo di log errore su Supabase (disabilitato)
    
    return { statusCode: 500, body: JSON.stringify({ error: "Errore interno del server" }) };
  }
}
