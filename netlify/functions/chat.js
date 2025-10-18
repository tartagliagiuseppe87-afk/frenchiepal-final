// ==============================
// FRENCHIEPAL CHAT HANDLER v3
// ==============================
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
PERSONA E CONTESTO:
Sei 'FrenchiePal', assistente virtuale e grande appassionato di Bulldog Francesi.
La conversazione è già iniziata e l'utente ti ha già fornito le informazioni di base sul suo cane (razza, nome, età).

Se il cane è un Bulldog Francese, agisci come 'FrenchieFriend'.
Se è un'altra razza, agisci come un assistente generale che ama tutti i cani.

---
OBIETTIVO:
Aiutare l'utente a esplorare il suo problema con domande brevi e pertinenti.
---
REGOLE:
1. Risposte brevi (max 2 frasi).
2. Ogni messaggio termina con una domanda.
3. Nessun elenco informativo o spiegazione lunga.
4. Usa emoji (🐾, 🥰, 👍).
5. Italiano solo.
6. Se l'utente parla di sintomi o salute → consiglia di rivolgersi al veterinario.
7. Se la conversazione finisce → inizia la risposta con [ASK_EMAIL].
`;

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);
    const msgLower = message.toLowerCase();

    // === Stato corrente (salvato nell’ultimo messaggio di sistema, se esiste)
    let currentState = "ASK_BREED";
    const stateMsg = history.find(m => m.role === "system" && m.state);
    if (stateMsg) currentState = stateMsg.state;

    // Helper per aggiungere nuovo stato al flusso
    const withState = (reply, nextState) => ({
      reply,
      system: { role: "system", state: nextState }
    });

    // === 1️⃣ Avvio conversazione
    if (message === "INITIATE_CHAT") {
      return {
        statusCode: 200,
        body: JSON.stringify(
          withState("Ciao! 🐾 Posso chiederti se il tuo cane è un Bulldog Francese?", "ASK_BREED")
        )
      };
    }

    // === 2️⃣ Domanda sulla razza
    if (currentState === "ASK_BREED") {
      const isFrenchie =
        msgLower.includes("sì") ||
        msgLower.includes("si") ||
        msgLower.includes("french");
      const reply = isFrenchie
        ? "Fantastico! 🥰 Come si chiama e quanti anni ha?"
        : "Capito! ❤️ Come si chiama e quanti anni ha il tuo cucciolo?";
      return {
        statusCode: 200,
        body: JSON.stringify(withState(reply, "ASK_NAME_AGE"))
      };
    }

    // === 3️⃣ Domanda su nome ed età
    if (currentState === "ASK_NAME_AGE") {
      const reply = "Grazie! 🐾 Come posso aiutarti oggi con lui?";
      return {
        statusCode: 200,
        body: JSON.stringify(withState(reply, "ASK_HELP"))
      };
    }

    // === 4️⃣ Inizio conversazione vera con Gemini
    if (currentState === "ASK_HELP" || currentState === "IN_CONVERSATION") {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Ricostruzione della chat senza stati
      const cleanHistory = history
        .filter(m => m.role !== "system")
        .map(item => ({
          role: item.role,
          parts: [{ text: item.text }]
        }));

      const chat = model.startChat({
        history: cleanHistory,
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] }
      });

      const result = await chat.sendMessage(message);
      const responseText = await result.response.text();

      console.log(`USER: "${message}" | BOT: "${responseText}"`);

      return {
        statusCode: 200,
        body: JSON.stringify(withState(responseText, "IN_CONVERSATION"))
      };
    }

    // Fallback
    return {
      statusCode: 200,
      body: JSON.stringify(withState("Ops, non ho capito bene. 🐾 Puoi ripetere?", "ASK_HELP"))
    };

  } catch (error) {
    console.error("Errore nella funzione chat:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno del server" })
    };
  }
}
