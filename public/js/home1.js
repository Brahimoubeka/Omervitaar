document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch('/api/products/latest');
    if (!response.ok) {
      throw new Error('Son ürünler alınamadı');
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
      price.innerHTML = `Fiyat: TL${product.price}`;
      cardBody.appendChild(price);

      const detailsButton = document.createElement('button');
      detailsButton.classList.add('btn', 'btn-primary', 'mt-auto');
      detailsButton.innerHTML = 'Detayları Gör';
      detailsButton.addEventListener('click', () => {
        window.location.href = `product-detail.html?id=${product.id}`;
      });
      cardBody.appendChild(detailsButton);

      productCard.appendChild(cardBody);
      productCol.appendChild(productCard);
      container.appendChild(productCol);
    });
  } catch (error) {
    console.error('Son ürünler yüklenirken hata oluştu:', error);
  }
});
