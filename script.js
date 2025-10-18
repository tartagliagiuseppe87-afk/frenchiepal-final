document.addEventListener('DOMContentLoaded', () => {
    const startChatBtn = document.getElementById('start-chat-btn');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const closeChatBtn = document.getElementById('close-chat-btn');

    let chatHistory = [];
    const userId = getUserId(); // Assumendo che la funzione getUserId sia ancora presente

    // Funzione per creare/recuperare ID utente (NECESSARIA)
    function getUserId() {
        let userId = localStorage.getItem('frenchiepal_user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('frenchiepal_user_id', userId);
        }
        return userId;
    }

    // --- AVVIO CHAT CORRETTO ---
    startChatBtn.addEventListener('click', async () => {
        chatContainer.classList.remove('hidden');
        // Se la chat è vuota, INVIA IL SEGNALE DI AVVIO al backend
        if (chatMessages.children.length === 0) {
            addBotMessage("sta scrivendo...", true);
            try {
                // Invia il segnale INITIATE_CHAT al backend
                const response = await fetch('/.netlify/functions/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "INITIATE_CHAT", history: [], userId: userId }) // Invia history vuota e userId
                });
                if (!response.ok) throw new Error('La richiesta di avvio è fallita');
                const data = await response.json();
                removeTypingIndicator();
                addBotMessage(data.reply); // Mostra la prima domanda del bot
                chatHistory.push({ role: 'model', text: data.reply }); // Aggiunge la prima domanda alla cronologia
            } catch (error) {
                console.error("Errore di avvio:", error);
                removeTypingIndicator();
                addBotMessage("Ops! Non riesco a connettermi. Riprova tra un attimo.");
            }
        }
    });

    closeChatBtn.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
    });

    // Invia messaggio (gestisce tutti i messaggi DOPO il primo)
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
            // Chiama il backend con il messaggio utente e la cronologia completa
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, history: chatHistory, userId: userId }),
            });

            if (!response.ok) throw new Error('La richiesta al bot è fallita');

            const data = await response.json();
            removeTypingIndicator();
            addBotMessage(data.reply);
            chatHistory.push({ role: 'model', text: data.reply });

        } catch (error) {
            console.error("Errore:", error);
            removeTypingIndicator();
            addBotMessage("Ops! Qualcosa è andato storto. Riprova tra un attimo.");
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
        message = message.replace('[ASK_EMAIL]', '').trim();
        const el = document.createElement('div');
        el.className = 'chat-message bot-message';
        el.textContent = message;
        if (isTyping) el.classList.add('typing-indicator');
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = chatMessages.querySelector('.typing-indicator');
        if (indicator) chatMessages.removeChild(indicator);
    }
});
