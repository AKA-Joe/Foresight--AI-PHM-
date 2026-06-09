chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    bridgePort: '17654',
    bridgeToken: 'demo-bridge-token',
  });
});
