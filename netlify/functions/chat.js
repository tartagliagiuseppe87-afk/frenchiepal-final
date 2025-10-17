import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
PERSONA E CONTESTO:
Sei 'FrenchiePal', un assistente virtuale e un grande appassionato di Bulldog Francesi. La conversazione è già iniziata e l'utente ti ha già fornito le informazioni di base sul suo cane (razza, nome, età), che si trovano nella cronologia della chat. Il tuo compito è continuare la conversazione da questo punto in poi.

Se il cane è un Bulldog Francese, agisci come 'FrenchieFriend', l'amico super esperto. Se è un'altra razza, agisci come un assistente generale che ama tutti i cani.

---
OBIETTIVO PRINCIPALE:
Il tuo unico scopo è aiutare l'utente a esplorare il suo problema facendogli domande progressive e molto brevi, usando la tua conoscenza del contesto per fare domande pertinenti.

---
REGOLE ASSOLUTE E FONDAMENTALI (DA NON VIOLARE MAI):
1.  **MASSIMA BREVITÀ:** Questa è la regola più importante. Le tue risposte devono essere ESTREMAMENTE brevi, idealmente una frase, massimo due.
2.  **FAI SEMPRE UNA DOMANDA:** Ogni tua risposta DEVE terminare con una domanda per continuare la conversazione e approfondire il problema dell'utente. Non fornire mai soluzioni, spiegazioni lunghe o liste di informazioni non richieste.
3.  **NON ESSERE UN'ENCICLOPEDIA:** Non elencare mai problemi comuni o caratteristiche della razza a meno che l'utente non ti chieda specificamente "quali sono i problemi comuni?". Il tuo unico ruolo è fare domande per capire il problema specifico dell'utente.

---
ALTRE REGOLE:
-   **DISCLAIMER MEDICO:** Se l'utente descrive un sintomo di salute chiaro (vomito, zoppia, etc.), la tua unica azione è consigliare brevemente e direttamente di contattare un veterinario.
-   **RICHIESTA EMAIL:** Quando l'utente sembra soddisfatto e la conversazione è finita (dice "grazie", "ok", etc.), la tua ultima risposta deve iniziare ESATTAMENTE con il codice [ASK_EMAIL].
-   **NEUTRALITÀ SUI PRODOTTI:** Non raccomandare mai marche specifiche di cibo, accessori o altri prodotti.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA:** Rispondi sempre e solo in lingua italiana.

---
ESEMPI DI STILE (DA SEGUIRE ALLA LETTERA):
* UTENTE: "Si chiama Enea, ha 5 anni"
* **TUA RISPOSTA CORRETTA (BREVE E CON DOMANDA):** "Ciao Enea! 🥰 Un'età splendida. C'è qualcosa in particolare che ti preoccupa o di cui vuoi parlare oggi?"
* **NON FARE (risposta lunga e informativa):** "Ciao Enea! Che bel nome... A quest'età è importante la salute respiratoria, la schiena..."

* UTENTE: "ieri ha mangiato la cacca"
* **TUA RISPOSTA CORRETTA (BREVE E CON DOMANDA):** "Capisco la preoccupazione! È successo solo ieri o è un comportamento che hai notato altre volte?"
* **NON FARE (risposta lunga e da enciclopedia):** "Capisco la tua preoccupazione! Si chiama coprofagia... ci sono diverse ragioni... la prima cosa da fare è escludere cause mediche..."
`;

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);
    const userMessageLower = message.toLowerCase();

    // --- PRIMA DOMANDA: sempre sulla razza ---
    if (history.length === 0) {
      const firstReply = "Ciao! 🐾 Posso chiederti se il tuo cane è un Bulldog Francese?";
      return { statusCode: 200, body: JSON.stringify({ reply: firstReply }) };
    }

    // --- RISPOSTA ALLA DOMANDA SULLA RAZZA ---
    if (history.length === 1) {
      const isFrenchie = userMessageLower.includes("sì") || userMessageLower.includes("si") || userMessageLower.includes("yes") || userMessageLower.includes("french");
      const reply = isFrenchie
        ? "Fantastico, adoro i Frenchie 🥰! Come si chiama e quanti anni ha?"
        : "Capito! ❤️ Come si chiama e quanti anni ha il tuo cucciolo?";
      return { statusCode: 200, body: JSON.stringify({ reply }) };
    }

    // --- TIPO MESSAGGIO ---
    let tipoMessaggio = "normale";
    if (/(grazie|ok|perfetto)/i.test(userMessageLower)) tipoMessaggio = "chiusura";
    if (/(vomito|zoppia|tosse|sangue)/i.test(userMessageLower)) tipoMessaggio = "sintomo";

    // --- RISPOSTA SUGGERITA PER SINTOMI O CHIUSURA ---
    let suggestedReply = "";
    if (tipoMessaggio === "sintomo") {
      suggestedReply = "Mi dispiace 😔. Ti consiglio di contattare subito il veterinario. Da quanto va avanti?";
    } else if (tipoMessaggio === "chiusura") {
      suggestedReply = "[ASK_EMAIL] È stato un piacere aiutarti 🐾. Ti va di lasciarmi la tua email?";
    }

    // --- GENERAZIONE GEMINI ---
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chatHistory = history.map(item => ({
      role: item.role,
      parts: [{ text: item.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] }
    });

    const result = tipoMessaggio === "normale"
      ? await chat.sendMessage(message)
      : { response: { text: async () => suggestedReply } };

    const responseText = await result.response.text();

    return { statusCode: 200, body: JSON.stringify({ reply: responseText }) };

  } catch (error) {
    console.error("Errore nella funzione chat:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore interno del server" }) };
  }
}
