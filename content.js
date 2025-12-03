/**
 * This script is injected into the web page.
 * It finds all elements that represent story points, sums their values,
 * and sends the total back to the popup.
 */
(function () {

    // Function to calculate story points from current DOM and return processed element IDs
    function calculateStoryPoints(processedElements) {
        let total = 0;
        let remainingCount = 0;
        const newProcessed = new Set();

        // Find story point elements using the data-testid attribute
        const storyPointElements = document.querySelectorAll('[data-testid="issue-field-story-point-estimate-readview-full.ui.story-point-estimate"]');

        storyPointElements.forEach((element) => {
            // Try to find a unique identifier for this row
            // Look for the issue key or row identifier
            let elementId = null;

            // Try to find the parent row and get issue key or row identifier
            const row = element.closest('tr') || element.closest('[role="row"]');
            if (row) {
                // Try to find issue key link
                const issueLink = row.querySelector('a[href*="/browse/"]');
                if (issueLink) {
                    elementId = issueLink.href || issueLink.textContent.trim();
                } else {
                    // Use row index and first cell content as fallback
                    const firstCell = row.querySelector('td, [role="gridcell"]');
                    if (firstCell) {
                        elementId = firstCell.textContent.trim().substring(0, 50);
                    }
                }
            }

            // If we can't find a unique ID, use element's position in DOM
            if (!elementId) {
                elementId = Array.from(element.parentElement?.children || []).indexOf(element).toString();
            }

            // Skip if we've already processed this element
            if (processedElements.has(elementId)) {
                return;
            }

            // Mark as processed
            processedElements.add(elementId);
            newProcessed.add(elementId);

            const text = element.textContent.trim();

            // Process numeric story points
            if (text && text !== 'None' && !isNaN(parseFloat(text))) {
                const points = parseFloat(text);
                total += points;
            } else if (text === 'None' || text === '') {
                // Count issues with "None" or empty story points
                remainingCount++;
            }
        });

        return { total, remainingCount, newProcessed, processedCount: processedElements.size };
    }

    // Function to load all table data by scrolling and accumulate story points incrementally
    async function loadAllTableData() {
        const processedElements = new Set(); // Track processed rows to avoid duplicates
        let accumulatedTotal = 0;
        let accumulatedRemaining = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 200; // Prevent infinite loops
        const scrollDelay = 400; // Wait 400ms between scrolls for content to load
        const scrollStep = 500; // Scroll in increments of 500px

        // Find the Jira scroll container
        const jiraScrollContainer = document.querySelector('[data-testid="native-issue-table.ui.scroll-container.scroll-container"]');

        if (!jiraScrollContainer) {
            // Fallback calculation
            const result = calculateStoryPoints(processedElements);
            return { total: result.total, remainingCount: result.remainingCount, processedCount: result.processedCount };
        }

        let maxScrollHeight = jiraScrollContainer.scrollHeight;
        let lastScrollPosition = 0;
        let noNewDataCount = 0;
        const maxNoNewDataCount = 3; // Stop after 3 consecutive scrolls with no new data

        // Start from top and scroll incrementally
        jiraScrollContainer.scrollTop = 0;
        await new Promise(resolve => setTimeout(resolve, scrollDelay));

        while (scrollAttempts < maxScrollAttempts) {
            // Calculate story points from currently visible rows
            const result = calculateStoryPoints(processedElements);
            accumulatedTotal += result.total;
            accumulatedRemaining += result.remainingCount;

            // If no new data found, increment counter
            if (result.newProcessed.size === 0) {
                noNewDataCount++;
                if (noNewDataCount >= maxNoNewDataCount) {
                    break;
                }
            } else {
                noNewDataCount = 0; // Reset counter if we found new data
            }

            // Scroll down incrementally
            const currentScrollTop = jiraScrollContainer.scrollTop;
            const nextScrollTop = Math.min(currentScrollTop + scrollStep, maxScrollHeight);

            // Check if we've reached the bottom (can't scroll further)
            if (nextScrollTop >= maxScrollHeight - 10) {
                // One final check for any remaining items
                const finalResult = calculateStoryPoints(processedElements);
                accumulatedTotal += finalResult.total;
                accumulatedRemaining += finalResult.remainingCount;
                break;
            }

            lastScrollPosition = currentScrollTop;
            jiraScrollContainer.scrollTop = nextScrollTop;
            await new Promise(resolve => setTimeout(resolve, scrollDelay));

            // Update maxScrollHeight in case it increased (more content loaded)
            const newMaxScrollHeight = jiraScrollContainer.scrollHeight;
            if (newMaxScrollHeight > maxScrollHeight) {
                maxScrollHeight = newMaxScrollHeight;
            }

            scrollAttempts++;
        }

        // Final scroll to bottom and one last calculation
        jiraScrollContainer.scrollTop = maxScrollHeight;
        await new Promise(resolve => setTimeout(resolve, scrollDelay * 2));

        const finalResult = calculateStoryPoints(processedElements);
        accumulatedTotal += finalResult.total;
        accumulatedRemaining += finalResult.remainingCount;

        return { total: accumulatedTotal, remainingCount: accumulatedRemaining, processedCount: processedElements.size };
    }

    // Main execution: Load all data incrementally and accumulate totals
    (async () => {
        try {
            const { total, remainingCount, processedCount } = await loadAllTableData();
            // Send both totals back to the popup.js
            chrome.runtime.sendMessage({
                action: "sendTotal",
                total: total,
                remaining: remainingCount,
                processed: processedCount
            });
        } catch (error) {
            // Fallback: calculate with whatever is available
            const processedElements = new Set();
            const { total, remainingCount, processedCount } = calculateStoryPoints(processedElements);
            chrome.runtime.sendMessage({
                action: "sendTotal",
                total: total,
                remaining: remainingCount,
                processed: processedCount
            });
        }
    })();

})();
