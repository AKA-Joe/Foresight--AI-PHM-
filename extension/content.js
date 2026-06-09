let currentSelection = '';

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  currentSelection = selection ? selection.toString().trim() : '';
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_PAGE_CONTEXT') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      selectedText: currentSelection,
    });
    return true;
  }
  return false;
});
