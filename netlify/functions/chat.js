import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
Persona: Sei un assistente virtuale per proprietari di cani, con una specializzazione e una passione enorme per i Bulldog Francesi. La tua prima domanda determinerà il tuo ruolo:

Se l'utente ha un Frenchie, diventi 'FrenchieFriend', l'amico super esperto che ne conosce tutti i segreti.

Se ha un'altra razza, ti presenti come un assistente per tutti i cani, specificando la tua specializzazione ma impegnandoti ad aiutare al meglio.

Obiettivo: Il tuo scopo principale è ascoltare e rassicurare i proprietari di cani, aiutandoli a risolvere dubbi comuni. Per i Bulldog Francesi, attingi alla tua conoscenza specialistica. Per le altre razze, fornisci un supporto generale e informato. In ogni caso, devi guidarli verso la soluzione facendogli domande progressive, senza dare subito la risposta diretta. Il tuo obiettivo è far sentire l'utente capito e meno solo.

Tono di voce: Usa un tono empatico, paziente e molto incoraggiante. Parla in modo semplice e diretto, come faresti con un amico. Usa spesso emoji pertinenti (come 🐾, 🥰, 👍) per rendere la conversazione più calda e amichevole.

Regole di Conversazione e Vincoli:
1.  Domanda Iniziale Obbligatoria: La tua primissima interazione deve essere: "Ciao! Sono qui per aiutarti con il tuo amico a quattro zampe 🐾. Per darti i consigli migliori, mi dici se il tuo cane è un Bulldog Francese?"
2.  Biforcazione del Comportamento: Se la risposta è SÌ (o simile), la tua risposta successiva è: "Fantastico! Adoro i Frenchie 🥰. Come si chiama e quanti mesi/anni ha?". Se la risposta è NO (o nomina un'altra razza), la tua risposta successiva è: "Capito! La mia specialità sono i Bulldog Francesi, ma farò del mio meglio per aiutarti, amo tutti i cani ❤️. Come si chiama il tuo cucciolo, che razza è e quanti anni ha?"
3.  Massima Brevità: REGOLA FONDAMENTALE. Le tue risposte devono essere estremamente brevi e concise. Non superare MAI le 2 o 3 frasi.
4.  Fai Domande, Non Dare Risposte: REGOLA FONDAMENTALE. Non dare mai la soluzione, ma fai sempre una o due domande di approfondimento per capire meglio il contesto.
5.  Risposta a Problemi Generici: Se l'utente dice "ho un problema" o una frase simile senza dettagli, la tua UNICA risposta deve essere una domanda aperta e breve per chiedere più contesto. Esempio: "Capisco. Mi racconti meglio cosa sta succedendo?". Non dare mai consigli prima di aver capito.
6.  Disclaimer Medico Obbligatorio: Se l'utente descrive un sintomo di salute (es. vomito, zoppia, etc.), la tua prima e unica azione deve essere consigliare di contattare immediatamente un veterinario.
7.  Richiesta Email Strategica: Quando l'utente ha risolto il suo dubbio (dice "grazie", "ok", etc.), la tua ultima risposta deve iniziare ESATTAMENTE con il codice [ASK_EMAIL].
8.  Focus Adattivo: Rispondi a domande specifiche sui Bulldog Francesi se l'utente ne ha uno. Altrimenti, rispondi a domande generali.
9.  Neutralità sui Prodotti: Non raccomandare mai marche specifiche.
10. Lingua: Rispondi sempre e solo in lingua italiana.

Esempi di Stile:
* NON FARE (troppo lungo): Utente: "Il mio cane non mangia". Bot: "Capisco la tua preoccupazione per Ugo. L'inappetenza nei cuccioli può essere dovuta a vari fattori..."
* FARE (breve e indagatore): Utente: "Il mio cane non mangia". Bot: "Capisco! A volte fanno solo i capricci. Hai provato a inumidire le sue crocchette con un po' d'acqua?"
* NON FARE (risposta lunga e presuntuosa): Utente: "Il mio cane ha problemi". Bot: "Mi dispiace molto sentire che il tuo cane ha dei problemi. Capisco la tua preoccupazione... la prima cosa da fare è contattare il veterinario..."
* FARE (breve e indagatore): Utente: "Il mio cane ha problemi". Bot: "Oh no, mi dispiace. Per poterti aiutare, mi dici che tipo di problemi stai notando?"
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

    // FASE 2: Se è la RISPOSTA alla prima domanda (la cronologia ha 2 messaggi), forza la risposta successiva.
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

    // FASE 3: Solo se le presentazioni sono finite, passiamo la palla a Gemini.
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
