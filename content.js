/**
 * This script is injected into the web page.
 * It finds all elements that represent story points, sums their values,
 * and sends the total back to the popup.
 */
(function() {
    console.log("Story Point Calculator: Content script injected.");

    let total = 0;
    let remainingCount = 0;
    
    // Find story point elements using the data-testid attribute
    // The story point value is in a span with data-testid="issue-field-story-point-estimate-readview-full.ui.story-point-estimate"
    const storyPointElements = document.querySelectorAll('[data-testid="issue-field-story-point-estimate-readview-full.ui.story-point-estimate"]');
    
    console.log(`Found ${storyPointElements.length} potential story point elements.`);

    storyPointElements.forEach((element, index) => {
        const text = element.textContent.trim();
        
        // Process numeric story points
        if (text && text !== 'None' && !isNaN(parseFloat(text))) {
            const points = parseFloat(text);
            total += points;
            console.log(`Element ${index}: Found value ${points}`);
        } else if (text === 'None' || text === '') {
            // Count issues with "None" or empty story points
            remainingCount++;
            console.log(`Element ${index}: Remaining (value: "${text}")`);
        }
    });

    console.log(`Calculated Total: ${total}`);
    console.log(`Remaining Count: ${remainingCount}`);

    // Send both totals back to the popup.js
    chrome.runtime.sendMessage({ 
        action: "sendTotal", 
        total: total,
        remaining: remainingCount
    });

})();
