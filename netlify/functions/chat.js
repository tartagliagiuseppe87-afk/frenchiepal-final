import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
RUOLO E CONTESTO:
Sei "FrenchiePal", assistente virtuale empatico per proprietari di Bulldog Francesi.
Rispondi in italiano, tono amichevole e brevissimo. Ogni risposta deve terminare con una domanda.

---
REGOLE:
1. Massimo 2 frasi per risposta.
2. Sintomi → solo "contatta il veterinario".
3. Chiusura → iniziare con [ASK_EMAIL].
4. Non raccomandare prodotti o diagnosi mediche.

---
DEBUG LIVE:
Annota in console per ogni risposta:
- lunghezza_frasi
- emoji_presenti
- follow_up_domanda
- punteggio numerico totale
`;

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);
    const userMessageLower = message.toLowerCase();

    // --- INIZIO CHAT ---
    if (message === "INITIATE_CHAT") {
      const firstReply = "Ciao! 🐾 Posso chiederti che razza è il tuo cane?";
      console.log(`[DEBUG] tipo_messaggio: start | follow_up: "${firstReply}"`);
      return { statusCode: 200, body: JSON.stringify({ reply: firstReply }) };
    }

    // --- DOMANDA RAZZA ---
    if (history.length === 2) {
      const isFrenchie = userMessageLower.includes("french") || userMessageLower.includes("bulldog");
      const reply = isFrenchie
        ? "Fantastico, adoro i Frenchie 🥰! Come si chiama e quanti anni ha?"
        : "Che bello! ❤️ Come si chiama e quanti anni ha?";
      console.log(`[DEBUG] tipo_messaggio: razza | follow_up: "${reply}"`);
      return { statusCode: 200, body: JSON.stringify({ reply }) };
    }

    // --- LIVELLO UTENTE ---
    let livelloUtente = "inesperto";
    if (/(kg|alimentazione|passeggiate)/i.test(userMessageLower)) livelloUtente = "esperto";

    // --- TIPO MESSAGGIO ---
    let tipoMessaggio = "normale";
    if (/(grazie|ok|perfetto)/i.test(userMessageLower)) tipoMessaggio = "chiusura";
    if (/(vomito|zoppia|tosse|sangue)/i.test(userMessageLower)) tipoMessaggio = "sintomo";

    // --- RISPOSTA SUGGERITA ---
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

    // --- ANALISI BREVITÀ ---
    const frasi = responseText.split(/[\.\!\?]/).filter(f => f.trim() !== "");
    let punteggioBrevità = 0;
    if (frasi.length <= 1) punteggioBrevità = 10;
    else if (frasi.length === 2) punteggioBrevità = 5;
    else punteggioBrevità = 0;

    // --- ANALISI EMOJI ---
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
    const punteggioEmoji = emojiRegex.test(responseText) ? 5 : 0;

    // --- ANALISI FOLLOW-UP ---
    const punteggioFollowUp = responseText.trim().endsWith("?") ? 5 : 0;

    // --- PUNTEGGIO TOTALE ---
    const punteggioTotale = punteggioBrevità + punteggioEmoji + punteggioFollowUp;

    // --- DEBUG LOG ---
    console.log(`[DEBUG] livello_utente: ${livelloUtente} | tipo_messaggio: ${tipoMessaggio}`);
    console.log(`[DEBUG] punteggio_brevità: ${punteggioBrevità} | punteggio_emoji: ${punteggioEmoji} | punteggio_followup: ${punteggioFollowUp} | totale: ${punteggioTotale}`);
    console.log(`[DEBUG] risposta_finale: "${responseText}"`);

    return { statusCode: 200, body: JSON.stringify({ reply: responseText, score: punteggioTotale }) };

  } catch (error) {
    console.error("Errore nella funzione chat:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore interno del server" }) };
  }
}
