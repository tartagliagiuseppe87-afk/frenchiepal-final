document.addEventListener('DOMContentLoaded', () => {
    const startChatBtn = document.getElementById('start-chat-btn');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const closeChatBtn = document.getElementById('close-chat-btn');

    let chatHistory = [];

    // --- AVVIO CHAT ---
    startChatBtn.addEventListener('click', async () => {
        chatContainer.classList.remove('hidden');
        if (chatMessages.children.length === 0) {
            addBotMessage("sta scrivendo...", true);
            try {
                // Invia il segnale INITIATE_CHAT al backend REALE
                const response = await fetch('/.netlify/functions/chat', { // <-- CHIAMA IL BACKEND
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "INITIATE_CHAT", history: [] })
                });
                if (!response.ok) throw new Error('La richiesta di avvio è fallita');
                const data = await response.json();
                removeTypingIndicator();
                addBotMessage(data.reply); // Mostra la risposta REALE
                chatHistory.push({ role: 'model', text: data.reply });
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
            // CHIAMA IL BACKEND REALE con il messaggio e la cronologia
            const response = await fetch('/.netlify/functions/chat', { // <-- CHIAMA IL BACKEND
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, history: chatHistory }),
            });

            if (!response.ok) throw new Error('La richiesta al bot è fallita');

            const data = await response.json();
            removeTypingIndicator();
            addBotMessage(data.reply); // Mostra la risposta REALE
            chatHistory.push({ role: 'model', text: data.reply });

        } catch (error) {
            console.error("Errore:", error);
            removeTypingIndicator();
            addBotMessage("Ops! Qualcosa è andato storto. Riprova tra un attimo.");
        }
    }

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
