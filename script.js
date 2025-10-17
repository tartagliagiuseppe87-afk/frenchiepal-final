document.addEventListener('DOMContentLoaded', () => {
    const startChatBtn = document.getElementById('start-chat-btn');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const closeChatBtn = document.getElementById('close-chat-btn');

    let chatHistory = [];
    
    startChatBtn.addEventListener('click', () => {
        chatContainer.classList.remove('hidden');
        if (chatHistory.length === 0) {
            initiateChat();
        }
    });

    closeChatBtn.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
    });

    // Funzione dedicata SOLO per avviare la conversazione
    async function initiateChat() {
        addBotMessage("sta scrivendo...", true);

        try {
            // Chiamiamo il backend con un segnale speciale e una cronologia VUOTA
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "INITIATE_CHAT", history: [] }),
            });

            if (!response.ok) { throw new Error('La richiesta di avvio è fallita'); }
            const data = await response.json();
            const botReply = data.reply; // Questa sarà la domanda: "Hai un Bulldog Francese?"

            removeTypingIndicator();
            addBotMessage(botReply);

            // Ora iniziamo la cronologia con la prima vera domanda del bot
            chatHistory.push({ role: 'model', text: botReply });

        } catch (error) {
            console.error("Errore di avvio:", error);
            removeTypingIndicator();
            addBotMessage("Ops! Non riesco a connettermi. Riprova tra un attimo.");
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage(); 
        }
    });

    // Funzione per gestire tutti i messaggi DOPO il primo
    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;

        addUserMessage(messageText);
        chatHistory.push({ role: 'user', text: messageText });
        userInput.value = '';
        addBotMessage("sta scrivendo...", true);

        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, history: chatHistory }),
            });
            if (!response.ok) { throw new Error('La richiesta al bot è fallita'); }
            const data = await response.json();
            const botReply = data.reply;
            removeTypingIndicator();
            addBotMessage(botReply);
            chatHistory.push({ role: 'model', text: botReply });
        } catch (error)
        {
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
        if (isTyping) { el.classList.add('typing-indicator'); }
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function removeTypingIndicator() {
        const indicator = chatMessages.querySelector('.typing-indicator');
        if (indicator) { chatMessages.removeChild(indicator); }
    }
});
