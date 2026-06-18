document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseData = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedItemId = null;
    
    // Character Limit details
    const MAX_TWEET_CHARS = 280;
    const URL_CHAR_COUNT = 23; // X/Twitter counts all links as 23 characters
    
    // Active hashtags in the composer
    let activeHashtags = ['#BigQuery', '#GoogleCloud'];

    // DOM Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const exportBtn = document.getElementById('export-btn');
    const lastUpdatedText = document.getElementById('last-updated-text');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    const filterTagsContainer = document.getElementById('filter-tags');
    const timelineContainer = document.getElementById('releases-timeline');
    
    // States
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const tweetEditorTextarea = document.getElementById('tweet-editor-textarea');
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    const charCountText = document.getElementById('char-count-text');
    const charProgressCircle = document.getElementById('char-progress');
    const hashtagPillsContainer = document.getElementById('hashtag-pills');

    // Init progress ring constants
    const circleRadius = 14;
    const circleCircumference = 2 * Math.PI * circleRadius;
    if (charProgressCircle) {
        charProgressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
        charProgressCircle.style.strokeDashoffset = circleCircumference;
    }

    // ==========================================================================
    // Fetch and Load Data
    // ==========================================================================
    async function loadReleases(refresh = false) {
        showState('loading');
        
        if (refresh) {
            refreshIcon.classList.add('spin');
            refreshBtn.disabled = true;
        }

        try {
            const response = await fetch(`/api/releases?refresh=${refresh}`);
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch release data.');
            }
            
            releaseData = data.releases;
            
            // Format Last Updated Text
            const lastUpdatedDate = new Date(data.last_fetched * 1000);
            lastUpdatedText.textContent = `Updated: ${lastUpdatedDate.toLocaleTimeString()}`;
            
            renderTimeline();
            
        } catch (err) {
            console.error('Error fetching release notes:', err);
            errorMessage.textContent = err.message || 'Could not connect to the server feed.';
            showState('error');
        } finally {
            if (refresh) {
                refreshIcon.classList.remove('spin');
                refreshBtn.disabled = false;
            }
        }
    }

    // ==========================================================================
    // Rendering & Filtering Logic
    // ==========================================================================
    function getFilteredData() {
        let results = [];
        
        // Loop through dates
        releaseData.forEach(day => {
            const filteredItems = day.items.filter(item => {
                // Category Filter
                const categoryMatches = (currentFilter === 'all' || item.type.toLowerCase() === currentFilter.toLowerCase());
                
                // Search query match
                const searchMatches = !searchQuery || 
                    item.type.toLowerCase().includes(searchQuery) || 
                    item.raw_text.toLowerCase().includes(searchQuery) ||
                    day.date.toLowerCase().includes(searchQuery);
                    
                return categoryMatches && searchMatches;
            });
            
            if (filteredItems.length > 0) {
                results.push({
                    date: day.date,
                    updated: day.updated,
                    items: filteredItems
                });
            }
        });
        
        return results;
    }

    function updateBadgeCounts() {
        // We compute counts based on the current text search query, but ignoring the category filters
        let counts = { all: 0, Feature: 0, Announcement: 0, Issue: 0, Deprecation: 0, Update: 0 };
        
        releaseData.forEach(day => {
            day.items.forEach(item => {
                // Apply search filter only to counts
                const searchMatches = !searchQuery || 
                    item.type.toLowerCase().includes(searchQuery) || 
                    item.raw_text.toLowerCase().includes(searchQuery) ||
                    day.date.toLowerCase().includes(searchQuery);
                
                if (searchMatches) {
                    counts.all++;
                    if (counts[item.type] !== undefined) {
                        counts[item.type]++;
                    } else {
                        counts.Update++;
                    }
                }
            });
        });

        // Update UI Badges
        document.getElementById('badge-all').textContent = counts.all;
        document.getElementById('badge-feature').textContent = counts.Feature;
        document.getElementById('badge-announcement').textContent = counts.Announcement;
        document.getElementById('badge-issue').textContent = counts.Issue;
        document.getElementById('badge-deprecation').textContent = counts.Deprecation;
    }

    function renderTimeline() {
        const filteredData = getFilteredData();
        updateBadgeCounts();
        
        if (releaseData.length === 0) {
            showState('empty');
            return;
        }

        if (filteredData.length === 0) {
            showState('empty');
            return;
        }

        showState('content');
        timelineContainer.innerHTML = '';

        filteredData.forEach(day => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'date-group-header';
            groupHeader.innerHTML = `
                <div class="date-bullet"></div>
                <h3 class="date-title">${day.date}</h3>
            `;
            
            const dateItemsContainer = document.createElement('div');
            dateItemsContainer.className = 'date-items';
            
            day.items.forEach(item => {
                const card = document.createElement('div');
                card.className = `release-card ${selectedItemId === item.id ? 'selected' : ''}`;
                card.dataset.id = item.id;
                
                // Get badge class
                let badgeClass = 'badge-update';
                const typeLower = item.type.toLowerCase();
                if (typeLower === 'feature') badgeClass = 'badge-feature';
                else if (typeLower === 'announcement') badgeClass = 'badge-announcement';
                else if (typeLower === 'issue') badgeClass = 'badge-issue';
                else if (typeLower === 'deprecation') badgeClass = 'badge-deprecation';
                
                card.innerHTML = `
                    <div class="card-header-row">
                        <span class="badge-type ${badgeClass}">${item.type}</span>
                        <div class="card-actions">
                            <button class="btn-card-copy" data-id="${item.id}" title="Copy plain text to clipboard">
                                <i class="fa-regular fa-copy"></i> Copy
                            </button>
                            <button class="btn-card-tweet" data-id="${item.id}" title="Tweet about this update">
                                <i class="fa-brands fa-x-twitter"></i> Tweet
                            </button>
                            <div class="card-select-indicator" title="Select update">
                                <i class="fa-solid fa-check"></i>
                            </div>
                        </div>
                    </div>
                    <div class="card-body-content">
                        ${item.content_html}
                    </div>
                `;
                
                // Clicking card selects it
                card.addEventListener('click', (e) => {
                    // If user clicked a link, don't trigger selection
                    if (e.target.tagName === 'A' || e.target.closest('a')) {
                        return;
                    }
                    
                    // If user clicked action buttons inside card, don't change selection
                    if (e.target.closest('.btn-card-tweet') || e.target.closest('.btn-card-copy')) {
                        return;
                    }
                    
                    toggleCardSelection(item.id);
                });
                
                // Hook Tweet button
                const cardTweetBtn = card.querySelector('.btn-card-tweet');
                cardTweetBtn.addEventListener('click', () => {
                    openTweetComposer(item, day.date);
                });

                // Hook Copy button
                const cardCopyBtn = card.querySelector('.btn-card-copy');
                cardCopyBtn.addEventListener('click', () => {
                    copyToClipboard(item.raw_text, cardCopyBtn);
                });

                dateItemsContainer.appendChild(card);
            });
            
            dateGroup.appendChild(groupHeader);
            dateGroup.appendChild(dateItemsContainer);
            timelineContainer.appendChild(dateGroup);
        });
    }

    function toggleCardSelection(id) {
        if (selectedItemId === id) {
            selectedItemId = null; // deselect
        } else {
            selectedItemId = id; // select new
        }
        
        // Quick visual toggle instead of full re-render
        document.querySelectorAll('.release-card').forEach(card => {
            if (card.dataset.id === selectedItemId) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    function showState(state) {
        loadingState.style.display = state === 'loading' ? 'flex' : 'none';
        errorState.style.display = state === 'error' ? 'flex' : 'none';
        emptyState.style.display = state === 'empty' ? 'flex' : 'none';
        timelineContainer.style.display = state === 'content' ? 'flex' : 'none';
        
        // Toggle Export CSV Button visibility depending on content loading success
        if (exportBtn) {
            exportBtn.style.display = state === 'content' ? 'inline-flex' : 'none';
        }
    }

    // ==========================================================================
    // Tweet Composer & Modal Logic
    // ==========================================================================
    function calculateTweetLength(text) {
        // Find all URLs in the text
        const urlRegex = /https?:\/\/[^\s]+/g;
        const matches = text.match(urlRegex) || [];
        
        let length = text.length;
        
        // For each URL, subtract its actual length and add 23 characters
        matches.forEach(url => {
            length = length - url.length + URL_CHAR_COUNT;
        });
        
        return length;
    }

    function openTweetComposer(item, dateString) {
        // Select this card as active context
        selectedItemId = item.id;
        toggleCardSelection(item.id);
        
        // Compose default text
        const hashtagsStr = activeHashtags.join(' ');
        
        // Header prefix
        const prefix = `📢 BigQuery ${item.type} (${dateString}): `;
        
        // Clean Text limit sizing
        // Length of prefix + spaces + link placeholder (23 chars) + hashtags
        const fixedLength = calculateTweetLength(prefix) + 1 + URL_CHAR_COUNT + 1 + calculateTweetLength(hashtagsStr);
        const availableTextSpace = MAX_TWEET_CHARS - fixedLength - 4; // -4 for " ... "
        
        let tweetBody = item.raw_text;
        if (tweetBody.length > availableTextSpace) {
            tweetBody = tweetBody.substring(0, availableTextSpace) + '...';
        }
        
        const defaultTweet = `${prefix}"${tweetBody}"\n\n${item.link}\n\n${hashtagsStr}`;
        
        tweetEditorTextarea.value = defaultTweet;
        updateTweetPreview();
        
        // Reset hashtag pills active state based on activeHashtags
        document.querySelectorAll('.hashtag-pill').forEach(pill => {
            const tag = pill.dataset.tag;
            if (activeHashtags.includes(tag)) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
        
        // Open Modal
        tweetModal.classList.add('open');
        tweetEditorTextarea.focus();
    }

    function closeTweetComposer() {
        tweetModal.classList.remove('open');
    }

    function updateTweetPreview() {
        const text = tweetEditorTextarea.value;
        const length = calculateTweetLength(text);
        
        // Update character counter
        const remaining = MAX_TWEET_CHARS - length;
        charCountText.textContent = remaining;
        
        if (remaining < 0) {
            charCountText.classList.add('warning');
            charProgressCircle.style.stroke = 'var(--color-issue)';
        } else {
            charCountText.classList.remove('warning');
            charProgressCircle.style.stroke = 'var(--color-feature)';
        }
        
        // Update SVG circle
        const percent = Math.min(100, (length / MAX_TWEET_CHARS) * 100);
        const offset = circleCircumference - (percent / 100) * circleCircumference;
        charProgressCircle.style.strokeDashoffset = offset;
        
        // Update live HTML preview with highlighted links & hashtags
        let htmlPreview = escapeHTML(text);
        
        // Highlight URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        htmlPreview = htmlPreview.replace(urlRegex, '<span class="tweet-link">$1</span>');
        
        // Highlight Hashtags
        const tagRegex = /(#[a-zA-Z0-9_]+)/g;
        htmlPreview = htmlPreview.replace(tagRegex, '<span class="tweet-hashtag">$1</span>');
        
        tweetPreviewText.innerHTML = htmlPreview;
        
        // Disable submit button if empty or over limit
        submitTweetBtn.disabled = length === 0 || remaining < 0;
    }

    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Toggle hashtag in composer textarea
    function toggleHashtagInTextarea(tag) {
        let text = tweetEditorTextarea.value;
        const hasTag = text.includes(tag);
        
        if (hasTag) {
            // Remove the tag and clean up spaces
            const regex = new RegExp(`\\s*${tag}\\s*`, 'g');
            text = text.replace(regex, ' ').trim();
            activeHashtags = activeHashtags.filter(t => t !== tag);
        } else {
            // Append the tag to the end, adding a newline or space if needed
            if (text.length > 0 && !text.endsWith('\n') && !text.endsWith(' ')) {
                text += ' ';
            }
            text += tag;
            activeHashtags.push(tag);
        }
        
        tweetEditorTextarea.value = text;
        updateTweetPreview();
        
        // Toggle pill UI
        document.querySelectorAll('.hashtag-pill').forEach(pill => {
            if (pill.dataset.tag === tag) {
                pill.classList.toggle('active', !hasTag);
            }
        });
    }

    function postToTwitter() {
        const text = tweetEditorTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        closeTweetComposer();
    }

    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            button.classList.add('copied');
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error('Clipboard copy failed: ', err);
        });
    }

    function exportToCSV() {
        const filteredData = getFilteredData();
        if (filteredData.length === 0) return;
        
        const headers = ["Date", "Category", "Description", "Link"];
        const rows = [headers];
        
        filteredData.forEach(day => {
            day.items.forEach(item => {
                const dateVal = `"${day.date.replace(/"/g, '""')}"`;
                const categoryVal = `"${item.type.replace(/"/g, '""')}"`;
                const descVal = `"${item.raw_text.replace(/"/g, '""')}"`;
                const linkVal = `"${item.link.replace(/"/g, '""')}"`;
                
                rows.push([dateVal, categoryVal, descVal, linkVal]);
            });
        });
        
        const csvString = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${currentFilter}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // ==========================================================================
    // Theme Management
    // ==========================================================================
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeIconDark.style.display = 'none';
            themeIconLight.style.display = 'block';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeIconDark.style.display = 'block';
            themeIconLight.style.display = 'none';
        }
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }

    // ==========================================================================
    // Event Listeners
    // ==========================================================================
    
    // Refresh feed
    refreshBtn.addEventListener('click', () => loadReleases(true));
    retryBtn.addEventListener('click', () => loadReleases(true));
    
    // Export CSV
    exportBtn.addEventListener('click', exportToCSV);
    
    // Live Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderTimeline();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderTimeline();
        searchInput.focus();
    });

    // Reset from empty state
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        currentFilter = 'all';
        
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.toggle('active', tag.dataset.type === 'all');
        });
        
        renderTimeline();
    });

    // Category Tags
    filterTagsContainer.addEventListener('click', (e) => {
        const tagButton = e.target.closest('.filter-tag');
        if (!tagButton) return;
        
        // Toggle Active
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        tagButton.classList.add('active');
        
        currentFilter = tagButton.dataset.type;
        renderTimeline();
    });

    // Modal Closing hooks
    closeModalBtn.addEventListener('click', closeTweetComposer);
    cancelTweetBtn.addEventListener('click', closeTweetComposer);
    submitTweetBtn.addEventListener('click', postToTwitter);
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            closeTweetComposer();
        }
    });

    // Close modal when clicking backdrop
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Live update editor characters
    tweetEditorTextarea.addEventListener('input', updateTweetPreview);

    // Click hashtag pills
    hashtagPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.hashtag-pill');
        if (!pill) return;
        
        const tag = pill.dataset.tag;
        toggleHashtagInTextarea(tag);
    });

    // Toggle theme
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Initialize theme
    initTheme();

    // Load initial data
    loadReleases();
});
