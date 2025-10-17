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
-   LINGUA: Rispondi sempre e solo in italiano.

---
ESEMPI DI STILE (DA SEGUIRE ALLA LETTERA):
* NON FARE (risposta lunga e informativa): Utente: "Si chiama Enea, ha 5 anni". Bot: "Ciao Enea! Che bel nome... A quest'età è importante la salute respiratoria, la schiena..."
* FARE (risposta breve e con domanda): Utente: "Si chiama Enea, ha 5 anni". Bot: "Ciao Enea! 🥰 Un'età splendida. C'è qualcosa in particolare che ti preoccupa o di cui vuoi parlare oggi?"

* NON FARE (risposta lunga e presuntuosa): Utente: "Il mio cane ha problemi". Bot: "Mi dispiace molto sentire che il tuo cane ha dei problemi. Capisco la tua preoccupazione... la prima cosa da fare è contattare il veterinario..."
* FARE (breve e con domanda): Utente: "Il mio cane ha problemi". Bot: "Oh no, mi dispiace. Per poterti aiutare, mi dici che tipo di problemi stai notando?"
`;

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);

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
        const userResponse = message.toLowerCase();
        if (userResponse.includes('sì') || userResponse.includes('si') || userResponse.includes('certo') || userResponse.includes('esatto')) {
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

    // FASE 3: Solo ora, passiamo la palla a Gemini con le istruzioni ferree.
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
