// api/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
Sei 'FrenchiePal', un assistente AI amichevole per proprietari di cani, specializzato in Bulldog Francesi. Parla SEMPRE E SOLO IN ITALIANO.
Il tuo compito è aiutare l'utente rispondendo alle sue domande in modo BREVE (massimo 2-3 frasi) e terminando SEMPRE con una domanda per continuare la conversazione.
Se l'utente menziona sintomi di salute (vomito, zoppia, etc.), consiglia brevemente di contattare un veterinario.
Se l'utente dice "grazie" o simili alla fine, inizia la risposta con [ASK_EMAIL]. Non raccomandare marche. Usa emoji 🐾.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message = "Messaggio non ricevuto", history = [], userId = "unknown" } = req.body || {};

    console.log(`HANDLER START - UserID: ${userId}, History Length: ${history.length}, Message: ${message}`);

    if (!process.env.GEMINI_API_KEY) {
      console.error("ERRORE: GEMINI_API_KEY non definita!");
      throw new Error("Configurazione API Key mancante.");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // oppure 2.5 se disponibile

    const chatHistory = history.map(item => ({
      role: item.role === "model" ? "model" : "user",
      parts: [{ text: item.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
      generationConfig: { maxOutputTokens: 150 }
    });

    const result = await chat.sendMessage(message);
    const responseText = await result.response.text();

    console.log(`USER_ID: ${userId} | USER: "${message}" | BOT: "${responseText}"`);

    res.status(200).json({ reply: responseText });

  } catch (error) {
    console.error("ERRORE GENERALE:", error);
    res.status(500).json({ error: `Errore interno del server: ${error.message}` });
  }
}
