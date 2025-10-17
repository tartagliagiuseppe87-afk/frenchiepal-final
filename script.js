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
            sendMessage(true);
        }
    });

    closeChatBtn.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
    });

    sendBtn.addEventListener('click', () => sendMessage(false));
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage(false); 
        }
    });

    async function sendMessage(isInitiation = false) {
        const messageText = isInitiation ? "Inizia la conversazione" : userInput.value.trim();
        if (!isInitiation && messageText === '') return;

        if (!isInitiation) {
            addUserMessage(messageText);
        }

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
        if (isTyping) { el.classList.add('typing-indicator'); }
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = chatMessages.querySelector('.typing-indicator');
        if (indicator) { chatMessages.removeChild(indicator); }
    }
});
