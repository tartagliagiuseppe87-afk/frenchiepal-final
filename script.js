document.addEventListener('DOMContentLoaded', () => {
    const startChatBtn = document.getElementById('start-chat-btn');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const closeChatBtn = document.getElementById('close-chat-btn');

    let chatHistory = [];
    const userId = getUserId();

    function getUserId() {
        let userId = localStorage.getItem('frenchiepal_user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('frenchiepal_user_id', userId);
        }
        return userId;
    }

    // --- AVVIO CHAT SEMPLIFICATO: ASPETTA L'UTENTE ---
    startChatBtn.addEventListener('click', () => {
        chatContainer.classList.remove('hidden');
        userInput.focus(); // Mette il focus sull'input
    });

    closeChatBtn.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
    });

    // Invia messaggio (gestisce sia il primo che i successivi)
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;

        addUserMessage(messageText);
        chatHistory.push({ role: 'user', text: messageText });
        userInput.value = '';

        addBotMessage("sta scrivendo...", true);

        try {
            // --- MODIFICA PER VERCEL ---
            const response = await fetch('/api/chat', { // <-- USA IL PERCORSO /api/
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, history: chatHistory, userId: userId }),
            });

            if (!response.ok) {
                 const errorBody = await response.text(); // Leggi il corpo dell'errore
                 console.error("Errore risposta backend:", response.status, errorBody);
                 throw new Error(`La richiesta al bot è fallita con stato ${response.status}`);
            }

            const data = await response.json();
            removeTypingIndicator();
            addBotMessage(data.reply);
            chatHistory.push({ role: 'model', text: data.reply });

        } catch (error) {
            console.error("Errore durante sendMessage:", error);
            removeTypingIndicator();
            addBotMessage(`Ops! Qualcosa è andato storto. (${error.message || 'Riprova tra un attimo.'})`);
        }
    }

    // Funzioni helper (rimangono invariate)
    function addUserMessage(message) {
        const el = document.createElement('div');
        el.className = 'chat-message user-message';
        el.textContent = message;
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function addBotMessage(message, isTyping = false) {
        // Rimuove [ASK_EMAIL] ovunque nel testo per sicurezza
        message = (message || "").toString().replace(/\[ASK_EMAIL\]/g, '').trim();
        const el = document.createElement('div');
        el.className = 'chat-message bot-message';
        el.textContent = message || "..."; // Mostra ... se il messaggio è vuoto
        if (isTyping) el.classList.add('typing-indicator');
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function removeTypingIndicator() {
        const indicator = chatMessages.querySelector('.typing-indicator');
        if (indicator) chatMessages.removeChild(indicator);
    }
});
