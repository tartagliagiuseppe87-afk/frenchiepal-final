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
1.  **MASSIMA BREVITÀ:** Risposte estremamente brevi, massimo due frasi.
2.  **FAI SEMPRE UNA DOMANDA:** Termina ogni risposta con una domanda.
3.  **NON ESSERE UN'ENCICLOPEDIA:** Non fornire informazioni non richieste, solo domande per capire il problema.

---
ALTRE REGOLE:
-   **DISCLAIMER MEDICO:** Se l'utente descrive sintomi chiari, consiglia solo di contattare il veterinario.
-   **RICHIESTA EMAIL:** Quando la conversazione termina, l’ultima risposta deve iniziare con [ASK_EMAIL].
-   **NEUTRALITÀ SUI PRODOTTI:** Mai raccomandare marche specifiche.
-   **TONO:** Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   **LINGUA:** Solo italiano.
`;

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);
    const msgLower = message.toLowerCase();

    // --- PRIMO MESSAGGIO: Forza la domanda sulla razza ---
    if (message === "INITIATE_CHAT") {
      const firstQuestion = "Ciao! 🐾 Posso chiederti se il tuo cane è un Bulldog Francese?";
      return { statusCode: 200, body: JSON.stringify({ reply: firstQuestion }) };
    }

    // --- RISPOSTA ALLA DOMANDA SULLA RAZZA ---
    if (history.length === 1) {
      const isFrenchie = msgLower.includes("sì") || msgLower.includes("si") || msgLower.includes("yes") || msgLower.includes("french");
      const reply = isFrenchie
        ? "Fantastico! 🥰 Come si chiama e quanti anni ha?"
        : "Capito! ❤️ Come si chiama e quanti anni ha il tuo cucciolo?";
      return { statusCode: 200, body: JSON.stringify({ reply }) };
    }

    // --- DOPO CHE L’UTENTE HA RISPOSTO CON NOME E ETA’ ---
    if (history.length === 2) {
      const reply = "Grazie! 🐾 Come posso aiutarti oggi con lui?";
      return { statusCode: 200, body: JSON.stringify({ reply }) };
    }

    // --- TUTTO IL RESTO: PASSA A GEMINI ---
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
