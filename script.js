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

    startChatBtn.addEventListener('click', () => {
        chatContainer.classList.remove('hidden');
        userInput.focus();
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

        // Aggiungi alla cronologia PRIMA di inviare
        chatHistory.push({ role: 'user', text: messageText }); 
        userInput.value = '';

        addBotMessage("sta scrivendo...", true);

        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, history: chatHistory, userId: userId }), 
            });

            if (!response.ok) throw new Error('La richiesta al bot è fallita');

            const data = await response.json();
            removeTypingIndicator();
            addBotMessage(data.reply);

            // ✅ Ruolo corretto 'assistant' per Gemini
            chatHistory.push({ role: 'assistant', text: data.reply }); 

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
