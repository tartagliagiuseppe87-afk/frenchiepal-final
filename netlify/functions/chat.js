const { GoogleGenerativeAI } = require("@google/generative-ai");

const systemPrompt = `
---
PERSONA E RUOLO:
Sei 'FrenchiePal', un assistente virtuale amichevole, empatico e appassionato di Bulldog Francesi, che parla SOLO ITALIANO.

---
FLUSSO DI CONVERSAZIONE OBBLIGATORIO:
1. Prima interazione: rispondi sempre "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?"
2. Seconda interazione: se utente SÌ -> "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?", altrimenti -> "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?"
3. Terza interazione: "Grazie! 🥰 Ora sono pronto. Come posso aiutarti oggi con lui?"
4. Dalla quarta in poi: risposte brevissime, termina sempre con una domanda, senza spiegazioni lunghe.
`;

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { message, history = [], userId } = JSON.parse(event.body || '{}');

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY non definita!");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prima interazione forzata
        const userMessage = history.length === 0 ? "INITIATE_CHAT" : message;

        // Cronologia con mapping corretto dei ruoli
        const chatHistoryWithSystem = [
            { role: "model", parts: [{ text: systemPrompt }] }, // system prompt come model
            ...history.map(item => ({
                role: item.role === 'assistant' ? 'model' : 'user', // assistant -> model, user -> user
                parts: [{ text: item.text }]
            }))
        ];

        const chat = model.startChat({ history: chatHistoryWithSystem });

        const result = await chat.sendMessage(userMessage, {
            temperature: 0,
            candidateCount: 1
        });

        const replyText = await result.response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: replyText })
        };

    } catch (error) {
        console.error("Errore nella funzione chat:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Errore interno del server", details: error.message }) };
    }
};
