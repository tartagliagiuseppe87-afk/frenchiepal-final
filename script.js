// Selezioni elementi
const startChatBtn = document.getElementById('start-chat-btn');
const chatContainer = document.getElementById('chat-container');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Mostra chat
startChatBtn.addEventListener('click', () => {
    chatContainer.classList.remove('hidden');
    scrollToBottom();
    addBotMessage("Ciao! 🐾 Posso chiederti se il tuo cane è un Bulldog Francese?");
});

// Chiudi chat
closeChatBtn.addEventListener('click', () => {
    chatContainer.classList.add('hidden');
});

// Invia messaggio con invio o clic
sendBtn.addEventListener('click', handleUserMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserMessage();
});

function handleUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    userInput.value = '';
    
    // Simula "sta scrivendo..."
    addTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        getBotReply(message);
    }, 700);
}

// Aggiunge messaggio utente
function addUserMessage(text) {
    const div = document.createElement('div');
    div.classList.add('chat-message', 'user-message');
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollToBottom();
}

// Aggiunge messaggio bot
function addBotMessage(text) {
    const div = document.createElement('div');
    div.classList.add('chat-message', 'bot-message');
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollToBottom();
}

// Scrolla chat in basso
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Indicatore "sta scrivendo..."
function addTypingIndicator() {
    const div = document.createElement('div');
    div.classList.add('chat-message', 'bot-message', 'typing-indicator');
    chatMessages.appendChild(div);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}

// Risposta bot semplice (puoi sostituire con API reale)
function getBotReply(userMessage) {
    let reply = '';

    const msg = userMessage.toLowerCase();
    if (msg.includes('sì') || msg.includes('si')) {
        reply = "Fantastico! 🥰 Come si chiama e quanti anni ha?";
    } else if (msg.includes('no')) {
        reply = "Capito! ❤️ Come si chiama il tuo cucciolo e di che razza è?";
    } else {
        reply = "Grazie! 🐾 Come posso aiutarti oggi con lui?";
    }

    addBotMessage(reply);
}
