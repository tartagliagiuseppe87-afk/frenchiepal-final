import { GoogleGenerativeAI } from "@google/generative-ai";

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

// --- Rimossa l'integrazione Supabase ---

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [], userId } = JSON.parse(event.body); // userId rimane per i log Netlify
    const userMessageLower = message.toLowerCase();
    let replyText = "";

    console.log(`HANDLER START - Received history length: ${history.length}, Message: ${message}`);

    // --- LOGICA INFALLIBILE BASATA SU HISTORY.LENGTH CORRETTA ---

    // FASE 1: Primo messaggio
    if (message === "INITIATE_CHAT") {
        replyText = "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?";
        console.log("HANDLER - FASE 1 Eseguita");
        console.log(`USER_ID: ${userId} | BOT_INIT: "${replyText}"`); // Log Netlify
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
        console.log(`USER_ID: ${userId} | USER: "${message}" | BOT_INTRO: "${replyText}"`); // Log Netlify
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 3: Risposta alla seconda domanda
    if (history.length === 3) {
        console.log("HANDLER - FASE 3 Inizio");
        replyText = "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?";
        console.log("HANDLER - FASE 3 Eseguita");
        console.log(`USER_ID: ${userId} | USER: "${message}" | BOT_READY: "${replyText}"`); // Log Netlify
        return { statusCode: 200, body: JSON.stringify({ reply: replyText }) };
    }

    // FASE 4: Passiamo la palla a Gemini.
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

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${replyText}"`); // Log Netlify

    console.log("HANDLER - FASE 4 (Gemini) Eseguita");
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: replyText })
    };

  } catch (error) {
    console.error("Errore nella funzione chat:", error);
    // Log dell'errore su Netlify
    try {
        const { userId } = JSON.parse(event.body || '{}');
        console.error(`USER_ID: ${userId || 'unknown'} | ERROR: ${error.message} | STACK: ${error.stack}`);
    } catch (logError) {
        console.error("Errore nel logging dell'errore:", logError);
    }

    return { statusCode: 500, body: JSON.stringify({ error: "Errore interno del server" }) };
  }
}
