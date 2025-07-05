document.addEventListener('DOMContentLoaded', () => {
  const openChatbotBtn = document.getElementById('open-chatbot');
  const closeChatbotBtn = document.getElementById('close-chatbot');
  const chatbotWindow = document.getElementById('chatbot-window');
  const sendMessageBtn = document.getElementById('send-message');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const md = window.markdownit();
  let allProducts = [];
  let lastSuggestedProductId = null;
  const chatbotHeader = document.getElementById('chatbot-header');

  // Fix for iOS zoom-in on input focus
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    // Prevent zoom on input focus
    document.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    });
    
    // Set font size to 16px minimum to prevent iOS zoom
    chatbotInput.style.fontSize = '16px';
    
    // Add blur handler to ensure keyboard closes on mobile
    chatbotInput.addEventListener('blur', function() {
      window.scrollTo(0, 0);
    });
  }

  // Session flag to show welcome/options only once per session
  const CHATBOT_SESSION_KEY = 'chatbot_welcome_shown';

  // Add Start New Chat button to new container (top right inside chat window, not header)
  const newChatBtnContainer = document.getElementById('new-chat-btn-container');
  if (newChatBtnContainer && !document.getElementById('start-new-chat-btn')) {
    const newChatBtn = document.createElement('button');
    newChatBtn.id = 'start-new-chat-btn';
    newChatBtn.innerHTML = '<span style="font-size:1.5em;line-height:1;">+</span>';
    newChatBtn.className = 'chatbot-new-chat-btn';
    newChatBtn.title = 'بدء محادثة جديدة';
    newChatBtn.onclick = () => showWelcomeAndOptions();
    newChatBtnContainer.appendChild(newChatBtn);
  }

  function showWelcomeAndOptions() {
    chatbotMessages.innerHTML = '';
    // Welcome/note text
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'chatbot-welcome';
    welcomeDiv.innerHTML = `هذا روبوت ذكاء اصطناعي يساعدك في إيجاد حل لمشكلتك وقد يرتكب أخطاء. عندما يقترح عليك منتجًا، يرجى قراءة وصف المنتج في صفحة المنتج أو يمكنك التواصل معنا على واتساب للتحدث مع موظف حقيقي.<br>مرحباً! كيف يمكنني مساعدتك اليوم؟`;
    chatbotMessages.appendChild(welcomeDiv);

    // Options
    const options = [
      { text: 'أبحث عن حل لمشكلتي', value: 'find_solution' },
      { text: 'أريد تتبع طلبي', value: 'track_order' },
      { text: 'أريد التواصل مع شخص حقيقي', value: 'contact_person' }
    ];
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'chatbot-options';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chatbot-option-btn chatbot-suggestion-btn';
      btn.textContent = opt.text;
      btn.onclick = () => handleMainOption(opt.value);
      optionsDiv.appendChild(btn);
    });
    chatbotMessages.appendChild(optionsDiv);
    // Hide input and send button
    chatbotInput.style.display = 'none';
    sendMessageBtn.style.display = 'none';
  }

  // Fetch categories from backend
  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (e) {
      console.error('Error fetching categories:', e);
      return [];
    }
  }

  // Handle main option selection
  function handleMainOption(option) {
    chatbotMessages.innerHTML = '';
    if(option === 'track_order') {
      chatbotInput.style.display = 'none';
      sendMessageBtn.style.display = 'none';
      chatbotMessages.innerHTML += '<div class="chatbot-link-box"><a href="/orders.html" class="chatbot-link" target="_blank">اذهب إلى صفحة تتبع الطلبات</a></div>';
    } else if(option === 'contact_person') {
      chatbotInput.style.display = 'none';
      sendMessageBtn.style.display = 'none';
      chatbotMessages.innerHTML += '<div class="chatbot-link-box"><a href="https://wa.me/905518560018" class="chatbot-link" target="_blank">تواصل عبر واتساب</a></div>';
    } else if(option === 'find_solution') {
      // Fetch and show categories for problem solution
      chatbotInput.style.display = 'none';
      sendMessageBtn.style.display = 'none';
      chatbotMessages.innerHTML = '<div>في أي فئة تقع مشكلتك؟</div>';
      fetchCategories().then(categories => {
        const catDiv = document.createElement('div');
        catDiv.className = 'chatbot-categories';
        categories.forEach(cat => {
          const btn = document.createElement('button');
          btn.className = 'chatbot-category-btn';
          btn.textContent = cat.name;
          btn.onclick = () => handleSolutionCategory(cat);
          catDiv.appendChild(btn);
        });
        chatbotMessages.appendChild(catDiv);
      });
    } else {
      // Will implement for option 1 in next step
    }
  }

  // Handle category selection for solution
  function handleSolutionCategory(category) {
    chatbotMessages.innerHTML = `<div>يرجى وصف مشكلتك في فئة: <b>${category.name}</b></div>`;
    chatbotInput.style.display = 'block';
    sendMessageBtn.style.display = 'block';
    chatbotInput.focus();
    // Attach category to next message
    sendMessageBtn.onclick = () => sendMessageWithCategory('find_solution', category);
    chatbotInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        sendMessageWithCategory('find_solution', category);
      }
    };
  }

  // Send message with selected category for solution
  async function sendMessageWithCategory(type, category) {
    const message = chatbotInput.value.trim();
    if (!validateMessage(message)) {
      appendMessage('Invalid input. Please try again with a proper message.', 'bot-message arabic');
      chatbotInput.value = '';
      return;
    }
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.classList.add('loading-indicator');
    loadingIndicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatbotMessages.appendChild(loadingIndicator);
    // Sanitize message for display
    const sanitizedMessage = sanitizeMessage(message);
    appendMessage(sanitizedMessage, 'user-message');
    chatbotInput.value = '';
    // Prepare request body
    const requestBody = { message: sanitizedMessage, categoryId: category.id, type };
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      const loadingIndicator = document.querySelector('.loading-indicator');
      if (loadingIndicator) loadingIndicator.remove();
      // Handle tryAgain: ask user to rephrase and keep the process in the same category
      if (data.tryAgain) {
        appendMessage(data.response, 'bot-message arabic');
        chatbotInput.style.display = 'block';
        sendMessageBtn.style.display = 'block';
        chatbotInput.value = '';
        chatbotInput.focus();
        sendMessageBtn.onclick = () => sendMessageWithCategory('find_solution', category);
        chatbotInput.onkeypress = (e) => {
          if (e.key === 'Enter') {
            sendMessageWithCategory('find_solution', category);
          }
        };
        return;
      }
      // Handle showContactButton: show contact a real person button
      if (data.showContactButton) {
        appendMessage(data.response, 'bot-message arabic');
        const contactDiv = document.createElement('div');
        contactDiv.className = 'chatbot-link-box';
        contactDiv.innerHTML = `<a href="https://wa.me/905518560018" class="chatbot-link" target="_blank">تواصل مع شخص حقيقي من فريقنا عبر واتساب</a>`;
        chatbotMessages.appendChild(contactDiv);
        chatbotInput.style.display = 'none';
        sendMessageBtn.style.display = 'none';
        return;
      }
      // Handle typo suggestion confirmation
      if (data.typoPending) {
        appendMessage(data.response, 'bot-message arabic');
        // Hide input and send button
        chatbotInput.style.display = 'none';
        sendMessageBtn.style.display = 'none';
        // Show confirmation buttons only
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'chatbot-typo-confirm';
        const yesBtn = document.createElement('button');
        yesBtn.textContent = 'نعم';
        yesBtn.className = 'chatbot-suggestion-btn';
        yesBtn.onclick = async () => {
          confirmDiv.remove();
          await sendTypoConfirm('yes', type, category);
        };
        const noBtn = document.createElement('button');
        noBtn.textContent = 'لا';
        noBtn.className = 'chatbot-suggestion-btn';
        noBtn.onclick = async () => {
          confirmDiv.remove();
          await sendTypoConfirm('no', type, category);
        };
        confirmDiv.appendChild(yesBtn);
        confirmDiv.appendChild(noBtn);
        chatbotMessages.appendChild(confirmDiv);
        return;
      }
      // Render product cards if products are present
      if (Array.isArray(data.products) && data.products.length > 0) {
        // Create a horizontal scrollable row for product cards
        const cardsRow = document.createElement('div');
        cardsRow.className = 'chatbot-product-cards-row';
        data.products.forEach(product => {
          const sanitizedProduct = {
            id: Number(product.id) || 0,
            name: sanitizeMessage(product.name || ''),
            description: sanitizeMessage(product.description || ''),
            price: typeof product.price === 'number' ? product.price : 0,
            imagePath: typeof product.imagePath === 'string' ? sanitizeMessage(product.imagePath) : null
          };
          const card = createProductCard(sanitizedProduct);
          cardsRow.appendChild(card);
        });
        chatbotMessages.appendChild(cardsRow);
      }
      if (typeof data.response === 'string') {
        appendMessage(sanitizeMessage(data.response), 'bot-message arabic', message);
      } else if (!Array.isArray(data.products) || data.products.length === 0) {
        // Only show error if no products and no response
        throw new Error('Invalid response format');
      }
    } catch (error) {
      appendMessage('عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.', 'bot-message arabic');
    }
  }

  // Sanitize message content to prevent XSS
  function sanitizeMessage(message) {
    const div = document.createElement('div');
    div.textContent = message;
    return div.innerHTML;
  }

  // Validate message length and content
  function validateMessage(message) {
    if (typeof message !== 'string') return false;
    if (message.length < 1 || message.length > 500) return false; // Reasonable length limits
    // Basic pattern to detect potential harmful content
    const harmfulPatterns = /(<script|javascript:|data:|file:|vbscript:|onload=)/i;
    return !harmfulPatterns.test(message);
  }

  async function sendMessage(customMessage) {
    const message = (typeof customMessage === 'string' ? customMessage : chatbotInput.value.trim());
    if (!message) return;

    // Validate input before sending
    if (!validateMessage(message)) {
      appendMessage('Invalid input. Please try again with a proper message.', 'bot-message arabic');
      chatbotInput.value = '';
      return;
    }

    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.classList.add('loading-indicator');
    loadingIndicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatbotMessages.appendChild(loadingIndicator);

    // Sanitize message for display
    const sanitizedMessage = sanitizeMessage(message);
    appendMessage(sanitizedMessage, 'user-message');
    chatbotInput.value = '';

    // Detect if user is asking for more/another suggestion
    const moreKeywords = [
      'more', 'another', 'else', 'other', 'suggestion', 'اقتراح', 'آخر', 'ثاني', 'مزيد', 'غيره', 'غيرها', 'شيء آخر', 'شي اخر', 'منتج آخر', 'منتج اخر', 'هل لديك المزيد', 'هل يوجد غير', 'هل يوجد منتج آخر', 'هل يوجد منتج اخر'
    ];
    const isMoreRequest = moreKeywords.some(word => message.toLowerCase().includes(word));

    // Prepare request body
    const requestBody = { message: sanitizedMessage };
    if (isMoreRequest && lastSuggestedProductId) {
      requestBody.lastSuggestedProductId = lastSuggestedProductId;
    }

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      // Remove loading indicator
      const loadingIndicator = document.querySelector('.loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      // Validate and sanitize response data
      if (Array.isArray(data.products)) {
        allProducts = data.products.map(product => ({
          id: Number(product.id) || 0,
          name: sanitizeMessage(product.name || ''),
          description: sanitizeMessage(product.description || ''),
          price: typeof product.price === 'number' ? product.price : 0,
          imagePath: typeof product.imagePath === 'string' ? sanitizeMessage(product.imagePath) : null
        }));
      }
      // Try to extract the last suggested product ID from the bot's response
      const productIdMatch = data.response.match(/\[PRODUCT:\{"id":(\d+)\}\]/);
      if (productIdMatch) {
        lastSuggestedProductId = Number(productIdMatch[1]);
      }
      if (typeof data.response === 'string') {
        appendMessage(sanitizeMessage(data.response), 'bot-message arabic', message);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error:', error);
      appendMessage('عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.', 'bot-message arabic');
    } finally {
      // No need to remove loading indicator here; already handled above
    }
  }

  function appendMessage(message, className, originalUserMessage) {
    // First, try to replace any text-based product IDs with numeric ones
    let processedMessage = message;
    
    // This regex finds product references with text IDs
    const textIdRegex = /\[PRODUCT:\{"id":\s*([^0-9][^}]*)\s*\}\]/g;
    
    // Replace text IDs with a message indicating the issue
    processedMessage = processedMessage.replace(textIdRegex, '[Product mention - Contact support for details]');

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    className.split(' ').forEach(cls => messageElement.classList.add(cls));

    const productRegex = /\[PRODUCT:\{"id":\s*(\d+)\s*\}\]/g;
    const parts = processedMessage.split(productRegex);

    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        const productId = part;
        const product = allProducts.find(p => p.id == productId);
        if (product) {
          const productCard = createProductCard(product);
          messageElement.appendChild(productCard);
        }
      } else if (part.trim() !== '') {
        const textElement = document.createElement('div');
        
        // Convert URLs, phone numbers, and email addresses to clickable links
        let enhancedText = part;
        
        // Convert email addresses to mailto links
        enhancedText = enhancedText.replace(
          /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi,
          '<a href="mailto:$1" class="chatbot-link email-link" target="_blank">$1</a>'
        );
        
        // Convert phone numbers to tel links
        enhancedText = enhancedText.replace(
          /(\+\d{1,3}[-\s]?\d{1,14}[-\s]?\d{1,14})/g,
          '<a href="tel:$1" class="chatbot-link phone-link" target="_blank">$1</a>'
        );
        
        // Convert URLs to clickable links (handles http, https, www)
        enhancedText = enhancedText.replace(
          /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
          '<a href="$1" class="chatbot-link url-link chatbot-suggestion-link" target="_blank">$1</a>'
        );
        
        // Fix URLs that don't have http/https prefix
        enhancedText = enhancedText.replace(
          /<a href="www/gi,
          '<a href="https://www'
        );
        
        // Render markdown with the enhanced text
        textElement.innerHTML = md.render(enhancedText);
        messageElement.appendChild(textElement);
      }
    });
    chatbotMessages.appendChild(messageElement);
    // Remove 'more like this' button after product suggestions (do not show it anymore)
    // No more: if (originalUserMessage && /\[PRODUCT:\{"id":\d+\}\]/.test(message)) { ... }
    // Removed automatic scrolling - user can scroll manually
  }

  function createProductCard(product) {
    // Use the same structure as the main product card, but smaller for chatbot
    const card = document.createElement('div');
    card.innerHTML = `
      <a href="product-detail.html?id=${product.id}" target="_blank" style="text-decoration:none;color:inherit;">
        <div class="product-card product-card-chatbot shadow-sm h-100" style="min-width:140px;max-width:140px;cursor:pointer;">
          <div class="product-img-box" style="min-height:80px;max-height:90px;">
            <img src="${product.imagePath || 'images/logo.png'}" alt="${product.name}" style="height:80px;object-fit:contain;width:100%;background:#f8f8f8;">
          </div>
          <div class="product-card-body" style="padding:0.5rem 0.5rem 0.7rem 0.5rem;min-height:60px;">
            <h5 class="product-card-title" style="font-size:0.85rem;min-height:28px;line-height:1.1;margin-bottom:0.2rem;">${product.name.length > 40 ? product.name.substring(0, 40) + '...' : product.name}</h5>
            <div class="product-card-price" style="font-size:0.95rem;margin:0.1em 0 0 0;color:rgb(255,115,0);font-weight:700;">
              <i class="bi bi-tag me-1"></i>دج${product.price}
            </div>
          </div>
        </div>
      </a>
    `;
    return card.firstElementChild;
  }

  openChatbotBtn.addEventListener('click', () => {
    chatbotWindow.style.display = 'flex';
    openChatbotBtn.style.display = 'none';
    // Always show the welcome/options UI and hide input on open
    showWelcomeAndOptions();
    sessionStorage.setItem(CHATBOT_SESSION_KEY, '1');
  });

  closeChatbotBtn.addEventListener('click', () => {
    chatbotWindow.style.display = 'none';
    openChatbotBtn.style.display = 'block';
  });
});
