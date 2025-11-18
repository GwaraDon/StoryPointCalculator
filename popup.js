document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const calculateIcon = document.getElementById('calculateIcon');
    const calculateText = document.getElementById('calculateText');
    const totalPointsEl = document.getElementById('totalPoints');
    const statusEl = document.getElementById('status');
    const statusContainer = document.getElementById('statusContainer');

    // Helper function to set status with color
    function setStatus(message, type = 'info') {
        statusEl.textContent = message;
        statusEl.className = 'text-xs font-medium text-center transition-colors duration-200';
        
        switch(type) {
            case 'success':
                statusEl.classList.add('text-green-600');
                break;
            case 'error':
                statusEl.classList.add('text-red-600');
                break;
            case 'warning':
                statusEl.classList.add('text-yellow-600');
                break;
            default:
                statusEl.classList.add('text-gray-400');
        }
    }

    // Helper function to show loading state
    function setLoadingState(isLoading) {
        if (isLoading) {
            calculateBtn.disabled = true;
            calculateBtn.classList.add('opacity-75', 'cursor-not-allowed');
            calculateBtn.classList.remove('hover:scale-[1.02]', 'active:scale-[0.98]');
            
            // Show spinner
            calculateIcon.innerHTML = `
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" d="M12 2a10 10 0 0 1 10 10"></path>
            `;
            calculateIcon.classList.add('animate-spin');
            calculateText.textContent = 'Calculating...';
        } else {
            calculateBtn.disabled = false;
            calculateBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            calculateBtn.classList.add('hover:scale-[1.02]', 'active:scale-[0.98]');
            
            // Restore original icon
            calculateIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            `;
            calculateIcon.classList.remove('animate-spin');
            calculateText.textContent = 'Calculate Total';
        }
    }

    calculateBtn.addEventListener('click', () => {
        // Clear previous results and show loading
        totalPointsEl.textContent = '...';
        totalPointsEl.classList.add('loading');
        setStatus('Calculating story points...', 'info');
        setLoadingState(true);

        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Inject the content.js script into the active tab
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        totalPointsEl.textContent = '—';
                        totalPointsEl.classList.remove('loading');
                        setStatus('Error: Please make sure you\'re on a Jira page', 'error');
                        setLoadingState(false);
                        console.error(chrome.runtime.lastError.message);
                    }
                });
            } else {
                totalPointsEl.textContent = '—';
                totalPointsEl.classList.remove('loading');
                setStatus('Could not find active tab', 'error');
                setLoadingState(false);
            }
        });
    });

    // Listen for messages from the content.js script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "sendTotal") {
            setLoadingState(false);
            totalPointsEl.classList.remove('loading');
            
            if (request.total !== undefined && request.total > 0) {
                // Display the total with animation
                const resultCard = totalPointsEl.closest('.bg-white');
                resultCard.classList.add('result-animate');
                
                // Format number (remove .00 if whole number)
                const formattedTotal = request.total % 1 === 0 
                    ? request.total.toString() 
                    : request.total.toFixed(2);
                
                totalPointsEl.textContent = formattedTotal;
                setStatus('Calculation complete!', 'success');
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    resultCard.classList.remove('result-animate');
                }, 300);
            } else {
                totalPointsEl.textContent = '0';
                setStatus('No story points found on this page', 'warning');
            }
        }
    });
});