document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const totalPointsEl = document.getElementById('totalPoints');
    const statusEl = document.getElementById('status');

    calculateBtn.addEventListener('click', () => {
        // Clear previous results and show loading
        totalPointsEl.textContent = '...';
        statusEl.textContent = 'Calculating...';

        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Inject the content.js script into the active tab
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        statusEl.textContent = 'Error injecting script. Are you on the right page?';
                        totalPointsEl.textContent = 'Error';
                        console.error(chrome.runtime.lastError.message);
                    }
                });
            } else {
                statusEl.textContent = 'Could not find active tab.';
                totalPointsEl.textContent = 'Error';
            }
        });
    });

    // Listen for messages from the content.js script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "sendTotal") {
            if (request.total !== undefined) {
                // Display the total, rounded to 2 decimal places
                totalPointsEl.textContent = request.total.toFixed(2);
                statusEl.textContent = 'Calculation complete!';
            } else {
                totalPointsEl.textContent = 'Error';
                statusEl.textContent = 'Could not find story points.';
            }
        }
    });
});