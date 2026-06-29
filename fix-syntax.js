const fs = require('fs');
const p = 'public/js/product-detail.js';
let c = fs.readFileSync(p, 'utf8');

const targetStr = `                <div class="mt-auto">
      return \`<a href="/categories/\${categorySlug}" class="badge bg-light border text-dark me-1 text-decoration-none" style="font-size:0.90em;padding:.25em .48em;"><i class="bi bi-tag"></i> \${cat.name}</a>\`;
    }).join('')}`;

const replacementStr = `                <div class="mt-auto">
                  <span class="d-block" style="color:var(--orange-accent,#ffbf00);font-weight:800;font-size:1.05rem;">دج\${p.price}</span>`;

c = c.replace(targetStr, replacementStr);
fs.writeFileSync(p, c);
console.log('Fixed syntax error');
