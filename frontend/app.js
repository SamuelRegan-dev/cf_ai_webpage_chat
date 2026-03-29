// Manages session state, URL ingestion via Cloudflare Workflows, and RAG chat
const sessionID = sessionStorage.getItem('sessionID') || crypto.randomUUID();
sessionStorage.setItem('sessionID', sessionID);

const BASE_URL = window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://cf-ai-webpage-chat.cf-ai-sregan.workers.dev';

const urlBar       = document.getElementById('url-bar');
const urlInput     = document.getElementById('urlInput');
const ingestBtn    = document.getElementById('ingest-btn');
const ingestStatus = document.getElementById('ingest-status');
const addUrlBtn    = document.getElementById('add-url-btn');
const app          = document.getElementById('app');
const urlList      = document.getElementById('url-list');
const sidebarEmpty = document.getElementById('sidebar-empty');
const messages     = document.getElementById('messages');
const emptyState   = document.getElementById('empty-state');
const chatInput    = document.getElementById('chat-input');
const sendBtn      = document.getElementById('send-btn');

let ingestedUrls = [];
let hasIngested  = false;
let isWaiting    = false;

const storedUrls = JSON.parse(sessionStorage.getItem('ingestedUrls') || '[]');
storedUrls.forEach(url => addToSidebar(url));
if (storedUrls.length > 0) {
    hasIngested = true;
    enableChat();
    urlBar.classList.add('hidden');
    app.classList.add('no-bar');
    addUrlBtn.classList.add('visible');
}

ingestBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return;

    ingestBtn.disabled = true;
    ingestStatus.textContent = 'Ingesting…';
    document.getElementById('progress-bar').classList.add('active');

    try {
        const res = await fetch(`${BASE_URL}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, sessionID }),
        });

        const data = await res.json();

        if (res.ok) {
            addToSidebar(url);
            urlInput.value = '';

            const poll = setInterval(async () => {
                const statusRes = await fetch(`${BASE_URL}/status/${data.workflowId}`);
                const { status } = await statusRes.json();

                if (status === 'complete') {
                    clearInterval(poll);
                    document.getElementById('progress-bar').classList.remove('active');
                    ingestStatus.textContent = '✓ Done';
                    if (!hasIngested) {
                        hasIngested = true;
                        setTimeout(() => {
                            urlBar.classList.add('hidden');
                            app.classList.add('no-bar');
                            addUrlBtn.classList.add('visible');
                            enableChat();
                        }, 800);
                    } else {
                        setTimeout(() => {
                            urlBar.classList.add('hidden');
                            app.classList.add('no-bar');
                            ingestStatus.textContent = '';
                        }, 800);
                    }
                } else if (status === 'errored') {
                    clearInterval(poll);
                    document.getElementById('progress-bar').classList.remove('active');
                    ingestStatus.textContent = '✗ Failed';
                } else {
                    ingestStatus.textContent = '⏳ Ingesting…';
                }
            }, 2000);
        } else {
            document.getElementById('progress-bar').classList.remove('active');
            ingestStatus.textContent = '✗ Failed';
        }
    } catch {
        document.getElementById('progress-bar').classList.remove('active');
        ingestStatus.textContent = '✗ Error';
    } finally {
        ingestBtn.disabled = false;
    }
});

addUrlBtn.addEventListener('click', () => {
    urlBar.classList.remove('hidden');
    app.classList.remove('no-bar');
    addUrlBtn.classList.remove('visible');
    ingestStatus.textContent = '';
    urlInput.focus();
});

function addToSidebar(url) {
    if (ingestedUrls.includes(url)) return;
    ingestedUrls.push(url);

    const stored = JSON.parse(sessionStorage.getItem('ingestedUrls') || '[]');
    if (!stored.includes(url)) {
        stored.push(url);
        sessionStorage.setItem('ingestedUrls', JSON.stringify(stored));
    }

    sidebarEmpty.style.display = 'none';

    let domain = url;
    try { domain = new URL(url).hostname.replace('www.', ''); } catch {}

    const item = document.createElement('div');
    item.className = 'url-item';
    item.innerHTML = `
        <span class="url-domain">${domain}</span>
        <span class="url-full">${url}</span>
    `;
    item.title = url;
    urlList.appendChild(item);
}

function enableChat() {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = 'Ask something about the ingested pages…';
    emptyState.style.display = 'none';
    chatInput.focus();
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isWaiting) return;

    isWaiting = true;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';

    appendMessage('user', text);
    const typing = appendTyping();

    try {
        const res = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userPrompt: text, sessionID }),
        });

        const data = await res.json();
        typing.remove();
        appendMessage('ai', data.response ?? 'No response.');
    } catch {
        typing.remove();
        appendMessage('ai', 'Something went wrong. Please try again.');
    } finally {
        isWaiting = false;
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

function appendMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
}

function appendTyping() {
    const msg = document.createElement('div');
    msg.className = 'message ai typing';
    msg.innerHTML = `<div class="bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
});