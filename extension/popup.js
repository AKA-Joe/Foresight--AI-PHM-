const portInput = document.getElementById('port');
const tokenInput = document.getElementById('token');
const noteInput = document.getElementById('note');
const sendBtn = document.getElementById('sendBtn');
const statusEl = document.getElementById('status');

function setStatus(text, kind = 'normal') {
  statusEl.textContent = text;
  statusEl.dataset.kind = kind;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getPageContext(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTEXT' });
}

async function loadConfig() {
  const stored = await chrome.storage.local.get(['bridgePort', 'bridgeToken']);
  if (stored.bridgePort) portInput.value = stored.bridgePort;
  if (stored.bridgeToken) tokenInput.value = stored.bridgeToken;
}

async function saveConfig() {
  await chrome.storage.local.set({
    bridgePort: portInput.value.trim(),
    bridgeToken: tokenInput.value.trim(),
  });
}

sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  setStatus('正在读取页面上下文...', 'normal');

  try {
    await saveConfig();
    const tab = await getCurrentTab();
    if (!tab?.id) throw new Error('无法获取当前标签页');

    const context = await getPageContext(tab.id);
    const payload = {
      token: tokenInput.value.trim(),
      source: 'popup',
      page: {
        url: context?.url || tab.url || '',
        title: context?.title || tab.title || '',
      },
      selectedText: context?.selectedText || '',
      note: noteInput.value.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setStatus('正在发送到本地 Electron 应用...', 'normal');
    const response = await fetch(`http://127.0.0.1:${portInput.value.trim()}/extension/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`发送失败：HTTP ${response.status}`);
    }

    const data = await response.json();
    setStatus(`发送成功，事件 ID：${data.eventId}`, 'success');
  } catch (error) {
    setStatus(error?.message || '发送失败，请确认 Electron 已启动且 token 正确。', 'error');
  } finally {
    sendBtn.disabled = false;
  }
});

loadConfig();
