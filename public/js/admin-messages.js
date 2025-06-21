// This file manages the admin messages view.
// It loads all messages, allows for viewing and archiving.
// It includes pagination to show messages in increments.

let allMessages = []; // Store all fetched messages globally
let displayedCount = 0; // Keep track of how many messages are currently shown
const messagesIncrement = 5; // How many messages to show at a time

/**
 * Renders a single message item and appends it to the container.
 * @param {object} message - The message object to render.
 */
function renderMessage(message) {
    const container = document.getElementById('messages-container');

    let displayName, displayContact;
    if (message.user_id) {
        displayName = `${message.user_name || ''}`;
        displayContact = `${message.user_email || ''}`;
    } else {
        displayName = message.full_name ? message.full_name + ' (زائر)' : 'زائر';
        displayContact = message.phone_number || '';
    }
    const displaySubject = message.subject || '-';

    // Each message as a Bootstrap list group item (with archive button)
    const wrapper = document.createElement('div');
    wrapper.className = 'list-group-item d-flex justify-content-between align-items-center flex-wrap';
    wrapper.style.gap = '10px';

    const infoBtn = document.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'btn btn-link p-0 text-start flex-grow-1 text-decoration-none';
    infoBtn.innerHTML = `<strong>${displayName}</strong> <small>${displayContact}</small><br><span>الموضوع: ${displaySubject}</span>`;
    infoBtn.setAttribute('data-bs-toggle', 'modal');
    infoBtn.setAttribute('data-bs-target', '#messageModal');
    
    // Add event listener to populate the modal on click
    infoBtn.addEventListener('click', () => {
        document.getElementById('modal-message-sender').innerHTML = displayName;
        document.getElementById('modal-message-contact').innerHTML = displayContact;
        document.getElementById('modal-message-subject').innerHTML = displaySubject;
        document.getElementById('modal-message-text').innerHTML = message.message_text;
        document.getElementById('modal-message-date').innerHTML = `تاريخ الإرسال: ${new Date(message.sent_at).toLocaleString()}`;
    });

    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn btn-warning btn-sm';
    archiveBtn.innerHTML = '<i class="bi bi-archive"></i> أرشفة';
    archiveBtn.setAttribute('title', 'أرشفة الرسالة');
    archiveBtn.setAttribute('data-bs-toggle', 'modal');
    archiveBtn.setAttribute('data-bs-target', '#archiveModal');
    
    // Add event listener to set up the archive confirmation modal
    archiveBtn.addEventListener('click', () => {
        document.getElementById('archive-modal-message').innerText = `${displayName}\nالموضوع: ${displaySubject}`;
        document.getElementById('archive-confirm-btn').dataset.messageId = message.id;
    });

    wrapper.appendChild(infoBtn);
    wrapper.appendChild(archiveBtn);
    container.appendChild(wrapper);
}

/**
 * Updates the visibility of the 'Show More' and 'Show Less' buttons
 * based on the number of messages displayed.
 */
function updatePaginationButtons() {
    const showMoreBtn = document.getElementById('show-more-btn');
    const showLessBtn = document.getElementById('show-less-btn');
    const paginationControls = document.getElementById('pagination-controls');

    if (allMessages.length <= messagesIncrement) {
        paginationControls.style.display = 'none';
        return;
    }

    paginationControls.style.display = 'block';
    showMoreBtn.style.display = (displayedCount >= allMessages.length) ? 'none' : 'inline-block';
    showLessBtn.style.display = (displayedCount > messagesIncrement) ? 'inline-block' : 'none';
}

/**
 * Displays the next set of messages.
 */
function showMoreMessages() {
    const end = Math.min(displayedCount + messagesIncrement, allMessages.length);
    for (let i = displayedCount; i < end; i++) {
        renderMessage(allMessages[i]);
    }
    displayedCount = end;
    updatePaginationButtons();
}

/**
 * Re-renders the list of messages to reflect changes (like archiving)
 * without resetting the pagination.
 */
function refreshDisplayedMessages() {
    // Note how many items were on the screen before the change.
    const targetCount = displayedCount;

    // Clear the container and reset the counter.
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    displayedCount = 0;

    // Re-render messages up to the previous target count, or the new total length.
    const newEnd = Math.min(targetCount, allMessages.length);
    for (let i = 0; i < newEnd; i++) {
        renderMessage(allMessages[i]);
    }
    // Update the global count to reflect the new state.
    displayedCount = newEnd;

    // Update the pagination buttons visibility.
    updatePaginationButtons();
}


/**
 * Main function to fetch messages, sort them, and render the first page.
 */
async function loadMessages() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('messages-container');
    const paginationControls = document.getElementById('pagination-controls');

    container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جارٍ التحميل...</span></div></div>';
    paginationControls.style.display = 'none';

    try {
        const response = await fetch('/api/admin/messages', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const messages = await response.json();
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = '<p class="text-center">لم يتم العثور على أي رسائل.</p>';
            return;
        }

        // Sort messages by date, newest first, and store them
        allMessages = messages.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
        
        displayedCount = 0; // Reset display count
        showMoreMessages(); // Display the initial set

    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<p class="text-center text-danger">حدث خطأ أثناء تحميل الرسائل.</p>';
    }
}

/**
 * Handles the archive confirmation and API call.
 * @param {string} messageId - The ID of the message to archive.
 */
async function archiveMessage(messageId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/admin/messages/${messageId}/archive`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل في الأرشفة!');
        
        const archiveModal = bootstrap.Modal.getInstance(document.getElementById('archiveModal'));
        if (archiveModal) {
            archiveModal.hide();
        }
        
        // Instead of reloading the whole page, filter out the archived message
        // and refresh the current view to maintain the user's position.
        allMessages = allMessages.filter(msg => msg.id != messageId);
        refreshDisplayedMessages();

    } catch (err) {
        alert('حدث خطأ أثناء الأرشفة: ' + err.message);
    }
}

/**
 * Sets up event listeners when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadMessages();

    // Listener for the archive confirmation
    document.getElementById('archive-confirm-btn').addEventListener('click', function() {
        const messageId = this.dataset.messageId;
        if (messageId) archiveMessage(messageId);
    });

    // Listener for "Show More"
    document.getElementById('show-more-btn').addEventListener('click', showMoreMessages);

    // Listener for "Show Less"
    document.getElementById('show-less-btn').addEventListener('click', () => {
        const container = document.getElementById('messages-container');
        container.innerHTML = ''; // Clear view
        displayedCount = 0; // Reset counter
        showMoreMessages(); // Show first page
    });
});
