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

  openChatbotBtn.addEventListener('click', () => {
    chatbotWindow.style.display = 'flex';
    openChatbotBtn.style.display = 'none';
  });

  closeChatbotBtn.addEventListener('click', () => {
    chatbotWindow.style.display = 'none';
    openChatbotBtn.style.display = 'block';
  });

  sendMessageBtn.addEventListener('click', sendMessage);
  chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

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
      requestBody.lastProductId = lastSuggestedProductId;
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
    // Split and add each class separately to handle space-separated class names
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
          '<a href="$1" class="chatbot-link url-link" target="_blank">$1</a>'
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
    // Add 'more like this' link if a product was suggested and originalUserMessage is present
    if (originalUserMessage && /\[PRODUCT:\{"id":\d+\}\]/.test(message)) {
      const moreBtn = document.createElement('button');
      moreBtn.textContent = 'المزيد من المنتجات لهذا الطلب';
      moreBtn.className = 'chatbot-more-btn';
      moreBtn.onclick = function() {
        chatbotInput.value = `أحتاج المزيد من المنتجات لـ ${originalUserMessage}`;
        sendMessage(chatbotInput.value);
      };
      chatbotMessages.appendChild(moreBtn);
    }
    // Removed automatic scrolling - user can scroll manually
  }

  function createProductCard(product) {
    const card = document.createElement('div');
    card.innerHTML = `
      <div class="product-card-chatbot">
        <a href="/product-detail.html?id=${product.id}" target="_blank">
          <div class="product-img-box">
            <img src="${product.imagePath || 'images/logo.png'}" alt="${product.name}">
          </div>
          <div class="product-card-body">
            <h5 class="product-card-title">${product.name}</h5>
            <p class="product-card-price">${product.price} DZD</p>
          </div>
        </a>
      </div>
    `;
    return card.firstElementChild;
  }
});
