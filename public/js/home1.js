document.addEventListener('DOMContentLoaded', async function () {
  // Function to load latest products
  async function loadLatestProducts() {
    try {
      const response = await fetch('/api/products/latest');
      if (!response.ok) {
        throw new Error('تعذر جلب أحدث المنتجات');
      }
      const latestProducts = await response.json();
      const container = document.getElementById('latest-products-container');
      container.innerHTML = ''; // Clear any existing content

      latestProducts.forEach(product => {
        const productCol = document.createElement('div');
        productCol.classList.add('col'); // Bootstrap column wrapper

        const productCard = document.createElement('div');
        productCard.classList.add('card', 'h-100', 'shadow-sm');

        const img = document.createElement('img');
        img.src = product.imagePath ? product.imagePath : 'images/default-product.jpg';
        img.alt = product.name;
        img.classList.add('card-img-top');
        productCard.appendChild(img);

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body', 'd-flex', 'flex-column');

        const name = document.createElement('h5');
        name.classList.add('card-title');
        name.innerHTML = product.name;
        cardBody.appendChild(name);

        const price = document.createElement('p');
        price.classList.add('card-text', 'mb-3');
        price.innerHTML = `السعر: دج${product.price}`;
        cardBody.appendChild(price);

        const detailsButton = document.createElement('button');
        detailsButton.classList.add('btn', 'btn-primary', 'mt-auto');
        detailsButton.innerHTML = 'عرض التفاصيل';
        detailsButton.addEventListener('click', () => {
          window.location.href = `/products/${product.slug || SlugUtil.generateProductSlug(product)}`;
        });
        cardBody.appendChild(detailsButton);

        productCard.appendChild(cardBody);
        productCol.appendChild(productCard);
        container.appendChild(productCol);
      });
    } catch (error) {
      console.error('حدث خطأ أثناء تحميل أحدث المنتجات:', error);
    }
  }

  // Function to enable auto-refresh for real-time data
  function enableAutoRefresh(intervalMs = 60000) { // 60 seconds default (longer for home page)
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }

    autoRefreshInterval = setInterval(async () => {
      try {
        // Only refresh if page is visible to avoid unnecessary requests
        if (!isPageVisible) return;

        // Silently refresh latest products
        console.log('Auto-refreshing latest products...');
        await loadLatestProducts();

      } catch (error) {
        console.log('Auto-refresh failed:', error);
      }
    }, intervalMs);
  }

  // Function to disable auto-refresh
  function disableAutoRefresh() {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }

  // Handle page visibility changes to optimize auto-refresh
  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;

    if (isPageVisible) {
      // Page became visible, resume auto-refresh if it was enabled
      if (autoRefreshInterval === null) {
        enableAutoRefresh();
      }
    } else {
      // Page became hidden, pause auto-refresh to save resources
      // Keep the interval but just check visibility in the function
    }
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    disableAutoRefresh();
  });

  // Initial load of latest products
  await loadLatestProducts();
  // Auto-refresh disabled - service worker removed
  // enableAutoRefresh(); // Removed - no longer needed without service worker caching
});
