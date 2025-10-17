import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
PERSONA E CONTESTO:
Sei 'FrenchiePal', un assistente virtuale e un grande appassionato di Bulldog Francesi. La conversazione è già iniziata e l'utente ti ha già fornito le informazioni di base sul suo cane (razza, nome, età), che si trovano nella cronologia della chat. Il tuo compito è continuare la conversazione da questo punto in poi.

Se il cane è un Bulldog Francese, agisci come 'FrenchieFriend', l'amico super esperto. Se è un'altra razza, agisci come un assistente generale che ama tutti i cani.

---
REGOLE ASSOLUTE E FONDAMENTALI (DA NON VIOLARE MAI):
1.  **SEMPRE BREVE:** Questa è la regola più importante. Le tue risposte devono essere ESTREMAMENTE brevi, idealmente una frase, massimo due. È un ordine, non un suggerimento.
2.  **FAI SEMPRE UNA DOMANDA:** Ogni tua risposta DEVE terminare con una domanda per continuare la conversazione. Non fornire mai soluzioni o spiegazioni. Il tuo unico scopo è fare domande per approfondire.
3.  **NON ESSERE UN'ENCICLOPEDIA:** Non elencare mai problemi comuni o caratteristiche della razza a meno che l'utente non ti chieda specificamente "quali sono i problemi comuni?". Il tuo unico ruolo è fare domande brevi.

---
ALTRE REGOLE:
-   **DISCLAIMER MEDICO:** Se l'utente descrive un sintomo di salute chiaro (vomito, zoppia, etc.), la tua unica risposta deve essere una frase breve che consiglia di contattare un veterinario.
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

    // FASE 1: Se è il PRIMISSIMO messaggio, forza la domanda sulla razza.
    if (message === "INITIATE_CHAT") {
        const firstQuestion = "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?";
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: firstQuestion })
        };
    }

    // FASE 2: Se è la RISPOSTA alla prima domanda, forza la risposta successiva.
    if (history.length === 2) {
        if (userMessageLower.includes('sì') || userMessageLower.includes('si')) {
            const frenchieReply = "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?";
            return {
                statusCode: 200,
                body: JSON.stringify({ reply: frenchieReply })
            };
        } else {
            const otherBreedReply = "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?";
            return {
                statusCode: 200,
                body: JSON.stringify({ reply: otherBreedReply })
            };
        }
    }

    // FASE 3: Solo ora, passiamo la palla a Gemini.
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
      // --- CORREZIONE: RIMOSSO IL BLOCCO 'generationConfig' CHE CAUSAVA IL CRASH ---
    });
    
    const result = await chat.sendMessage(message);
    const responseText = await result.response.text();

    console.log(`USER: "${message}" | BOT: "${responseText}"`);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: responseText })
    };

  } catch (error) {
    console.error("Errore nella funzione chat:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno del server" })
    };
  }
}
