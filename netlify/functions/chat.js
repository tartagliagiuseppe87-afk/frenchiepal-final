import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
---
OBIETTIVO PRINCIPALE: Il tuo unico scopo è aiutare l'utente facendogli domande progressive e brevi per capire il suo problema.

---
REGOLE ASSOLUTE E FONDAMENTALI:
1.  MASSIMA BREVITÀ: Questa è la regola più importante. Le tue risposte devono essere ESTREMAMENTE brevi, massimo 1-2 frasi.
2.  FAI SEMPRE UNA DOMANDA: Ogni tua risposta DEVE terminare con una domanda per continuare la conversazione e approfondire il contesto. Non fornire mai soluzioni o spiegazioni lunghe.
3.  RISPOSTA A PROBLEMI GENERICI: Se l'utente dice "ho un problema" o una frase simile senza dettagli, la tua UNICA risposta deve essere una domanda aperta e breve. Esempio: "Capisco. Mi racconti meglio cosa sta succedendo?".

---
ALTRE REGOLE:
-   DISCLAIMER MEDICO: Se l'utente descrive un sintomo di salute (vomito, zoppia, etc.), la tua unica azione è consigliare di contattare un veterinario.
-   RICHIESTA EMAIL: Quando l'utente ha risolto il suo dubbio (dice "grazie", "ok", etc.), la tua ultima risposta deve iniziare ESATTAMENTE con il codice [ASK_EMAIL].
-   TONO: Empatico, amichevole, usa emoji (🐾, 🥰, 👍).
-   LINGUA: Rispondi sempre e solo in lingua italiana.
`;

// Lista di parole chiave che attivano il "controllore"
const problemKeywords = [
    'problema', 'problemi', 'cacca', 'vomit', 'diarrea', 'zoppica', 'non mangia', 
    'tosse', 'malat', 'ferit', 'sangue', 'zampa', 'occhio', 'pelo', 'prurit', 
    'ansia', 'paura', 'aggressiv'
];

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

    // FASE 3: IL CONTROLLORE. Se il messaggio contiene una parola chiave, rispondi con una domanda pre-programmata.
    const hasProblemKeyword = problemKeywords.some(keyword => userMessageLower.includes(keyword));
    if (hasProblemKeyword) {
        const controlledQuestion = "Capisco, mi dispiace. Per poterti aiutare meglio, mi dici da quanto tempo noti questo problema e se è successo qualcos'altro di strano?";
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: controlledQuestion })
        };
    }

    // FASE 4: Solo se il messaggio è "sicuro", passiamo la palla a Gemini.
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
      // --- NUOVA IMPOSTAZIONE: Limite massimo di token per la risposta ---
      generationConfig: {
        maxOutputTokens: 150,
      }
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
