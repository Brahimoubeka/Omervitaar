/**
 * Admin Funnels & Landing Page Builder Controller (Vanilla JS)
 */

let funnelsTreeData = [];
let allNodesList = [];
let productsList = [];

let currentEditingNodeId = null;
let currentBlocks = [];
let currentOffers = [];

let nodeModalInstance = null;
let blockModalInstance = null;
let offersModalInstance = null;
let offerCustomizerModalInstance = null;

// HTML Escaping Helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Show Toast
function showToast(message, isError = false) {
  const toastEl = document.getElementById('adminToast');
  const msgEl = document.getElementById('toastMessage');
  if (!toastEl || !msgEl) {
    alert(message);
    return;
  }
  msgEl.textContent = message;
  toastEl.className = `toast align-items-center text-white border-0 ${isError ? 'bg-danger' : 'bg-success'}`;
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
}

// Initialization on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  nodeModalInstance = new bootstrap.Modal(document.getElementById('nodeModal'));
  blockModalInstance = new bootstrap.Modal(document.getElementById('blockModal'));
  offersModalInstance = new bootstrap.Modal(document.getElementById('offersModal'));
  const offerCustEl = document.getElementById('offerCustomizerModal');
  if (offerCustEl) {
    offerCustomizerModalInstance = new bootstrap.Modal(offerCustEl);
  }

  await loadProductsList();
  await loadFunnelsTree();

  // If URL has query param ?edit=123, switch directly to builder
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  if (editId) {
    switchToBuilder(parseInt(editId, 10));
  }
});

// Load Products List for dropdowns
async function loadProductsList() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      productsList = await res.json();
    }
  } catch (err) {
    console.warn('Could not load products list:', err);
  }
}

// ==========================================================================
// 1. TREE HIERARCHY MANAGEMENT
// ==========================================================================

async function loadFunnelsTree() {
  const container = document.getElementById('treeContainer');
  try {
    const res = await fetch('/api/admin/funnels/tree', {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        container.innerHTML = `
          <div class="alert alert-warning text-center">
            <i class="bi bi-shield-lock-fill fs-3 d-block mb-2"></i>
            يرجى تسجيل الدخول كمسؤول أولاً للوصول إلى لوحة إدارة الأقسام.
          </div>
        `;
        return;
      }
      throw new Error('فشل جلب الأقسام');
    }

    const data = await res.json();
    funnelsTreeData = data.tree || [];
    allNodesList = data.all || [];

    updateStats();
    populateLandingPagesDropdown();
    renderTree(funnelsTreeData);

  } catch (err) {
    console.error('Error loading tree:', err);
    container.innerHTML = `
      <div class="alert alert-danger text-center">
        حدث خطأ أثناء تحميل شجرة الأقسام: ${err.message}
      </div>
    `;
  }
}

// Update Top Counters
function updateStats() {
  const totalSections = allNodesList.filter(n => n.type === 'section').length;
  const totalLanding = allNodesList.filter(n => n.type === 'landing_page').length;
  const homeFeatured = allNodesList.filter(n => n.show_on_home).length;
  const totalBlocks = allNodesList.reduce((sum, n) => sum + parseInt(n.blocks_count || 0, 10) + parseInt(n.offers_count || 0, 10), 0);

  document.getElementById('statTotalSections').textContent = totalSections;
  document.getElementById('statTotalLandingPages').textContent = totalLanding;
  document.getElementById('statHomeFeatured').textContent = homeFeatured;
  document.getElementById('statTotalBlocks').textContent = totalBlocks;
}

// Populate landing pages dropdown in Builder Tab
function populateLandingPagesDropdown() {
  const select = document.getElementById('builderSelectLanding');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">-- اختر صفحة هبوط للبدء بتعديلها --</option>';

  const landingPages = allNodesList.filter(n => n.type === 'landing_page');
  landingPages.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    let path = p.title;
    if (p.parent_id) {
      const parent = allNodesList.find(n => n.id === p.parent_id);
      if (parent) {
        path = `[${parent.title}] ➔ ${p.title}`;
      }
    }
    opt.textContent = `${path} (${p.slug})`;
    select.appendChild(opt);
  });

  if (currentVal && landingPages.some(p => p.id == currentVal)) {
    select.value = currentVal;
  }
}

// Render Recursive Tree in Tab 1 (Handles infinite depth / layers)
function renderTree(tree) {
  const container = document.getElementById('treeContainer');
  if (!container) return;

  if (!tree || tree.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-folder-plus text-muted display-4"></i>
        <p class="text-muted mt-2">لا توجد أقسام منشأة بعد. اضغط "إضافة قسم رئيسي جديد" للبدء.</p>
      </div>
    `;
    return;
  }

  let html = '';

  function walk(nodes, depth = 0, parentTitle = null) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(node => {
      html += renderNodeItem(node, depth, parentTitle);
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children, depth + 1, node.title);
      }
    });
  }

  walk(tree, 0, null);
  container.innerHTML = html;
}

function renderNodeItem(node, depth = 0, parentTitle = null) {
  const isLanding = node.type === 'landing_page';
  const depthClass = `depth-${Math.min(depth, 3)}`;

  // Type badge
  const typeBadge = isLanding
    ? '<span class="badge bg-primary-subtle text-primary border" style="font-size: 0.68rem; padding: 2px 6px;"><i class="bi bi-file-earmark-text me-1"></i>صفحة هبوط</span>'
    : `<span class="badge bg-secondary-subtle text-secondary border" style="font-size: 0.68rem; padding: 2px 6px;"><i class="bi bi-folder2 me-1"></i>قسم ${node.children_count > 0 ? `(${node.children_count})` : ''}</span>`;

  // Home badge
  const homeBadge = node.show_on_home
    ? '<span class="badge bg-warning-subtle text-dark border" style="font-size: 0.68rem; padding: 2px 6px;"><i class="bi bi-star-fill text-warning me-1"></i>الرئيسية</span>'
    : '';

  // Active status badge
  const activeBadge = node.is_active
    ? '<span class="badge bg-success-subtle text-success border" style="font-size: 0.68rem; padding: 2px 6px;">نشط</span>'
    : '<span class="badge bg-danger-subtle text-danger border" style="font-size: 0.68rem; padding: 2px 6px;">معطل</span>';

  // Parent relationship badge
  const parentBadge = parentTitle
    ? `<span class="badge bg-light text-secondary border" style="font-size: 0.68rem; padding: 2px 6px;" title="فرع من: ${escapeQuotes(parentTitle)}"><i class="bi bi-arrow-return-left me-1"></i>تابع لـ: <strong>${escapeQuotes(parentTitle)}</strong></span>`
    : '';

  const img = node.image_url || '/images/category-banner-oil.jpg';
  const liveUrl = `/solutions/${node.slug}`;

  // Custom margin for depths > 3 if hierarchy gets very deep
  const extraIndent = depth > 3 ? `style="margin-right: ${depth * 22}px !important;"` : '';

  return `
    <div class="tree-node-item ${depthClass}" id="node-card-${node.id}" ${extraIndent}>
      <div class="tree-node-header">
        <div class="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden" style="min-width: 0;">
          ${depth > 0 ? `
            <span class="text-muted opacity-75 tree-branch-symbol" style="font-size: 0.95rem; flex-shrink: 0;" title="مستوى ${depth + 1}">
              <i class="bi bi-arrow-return-left"></i>
            </span>
          ` : ''}
          <img src="${img}" alt="${node.title}" class="tree-node-thumb" onerror="this.onerror=null; this.src='/images/category-banner-oil.jpg';">
          <div class="overflow-hidden" style="min-width: 0;">
            <div class="d-flex align-items-center gap-1.5 flex-wrap">
              <strong class="tree-node-title text-truncate" title="${node.title}">${node.title}</strong>
              ${typeBadge}
              ${parentBadge}
              ${homeBadge}
              ${activeBadge}
            </div>
            <div class="tree-node-meta mt-0.5">
              <span>الرابط: <code>${node.slug}</code></span>
              ${node.subtitle ? ` · <span class="text-muted text-truncate" style="max-width: 250px;">${node.subtitle}</span>` : ''}
              ${isLanding ? ` · <span class="fw-bold text-success">${node.blocks_count || 0} كتل | ${node.offers_count || 0} عروض</span>` : ` · <span class="fw-bold text-primary">${node.children_count || 0} أقسام فرعية</span>`}
            </div>
          </div>
        </div>

        <div class="tree-node-actions">
          ${!isLanding ? `
            <button class="btn btn-sm btn-outline-success rounded-pill fw-bold" onclick="openAddChildNodeModal(${node.id}, '${escapeQuotes(node.title)}')">
              <i class="bi bi-plus me-0.5"></i>إضافة داخله
            </button>
          ` : `
            <button class="btn btn-sm btn-primary rounded-pill fw-bold" onclick="switchToBuilder(${node.id})">
              <i class="bi bi-palette me-1"></i>بناء الصفحة
            </button>
          `}

          <a href="${liveUrl}" target="_blank" class="btn btn-sm btn-outline-secondary rounded-pill" title="معاينة الرابط">
            <i class="bi bi-box-arrow-up-right"></i>
          </a>

          <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="openEditNodeModal(${node.id})" title="تعديل">
            <i class="bi bi-pencil"></i>
          </button>

          <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteNode(${node.id}, '${escapeQuotes(node.title)}')" title="حذف">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

let nodeGalleryImages = [];

function renderNodeGallery() {
  const container = document.getElementById('nodeImagesGalleryContainer');
  const primaryInput = document.getElementById('nodeImageUrl');
  if (!container) return;

  if (nodeGalleryImages.length === 0) {
    container.innerHTML = '<span class="text-muted small">لم يتم رفع أي صور بعد.</span>';
    return;
  }

  const currentPrimary = primaryInput ? primaryInput.value.trim() : '';

  container.innerHTML = nodeGalleryImages.map((url, idx) => {
    const isPrimary = currentPrimary === url || (!currentPrimary && idx === 0);
    if (isPrimary && primaryInput && !primaryInput.value) {
      primaryInput.value = url;
    }

    return `
      <div class="position-relative border rounded-3 p-1 bg-white shadow-sm" style="width: 90px; text-align: center;">
        <img src="${url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px;" alt="Image ${idx}">
        <div class="mt-1">
          ${isPrimary ? `
            <span class="badge bg-success" style="font-size: 0.65rem;"><i class="bi bi-star-fill"></i> رئيسية</span>
          ` : `
            <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-1" style="font-size: 0.65rem;" onclick="setPrimaryNodeImage('${url}')">
              تعيين
            </button>
          `}
          <button type="button" class="btn btn-outline-danger btn-sm py-0 px-1 ms-1" style="font-size: 0.65rem;" onclick="removeNodeImage(${idx})">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function setPrimaryNodeImage(url) {
  const primaryInput = document.getElementById('nodeImageUrl');
  if (primaryInput) primaryInput.value = url;
  renderNodeGallery();
}

function removeNodeImage(idx) {
  const removed = nodeGalleryImages[idx];
  nodeGalleryImages.splice(idx, 1);
  const primaryInput = document.getElementById('nodeImageUrl');
  if (primaryInput && primaryInput.value === removed) {
    primaryInput.value = nodeGalleryImages[0] || '';
  }
  renderNodeGallery();
}

// Upload multiple images from device for node
async function uploadNodeImagesFromDevice() {
  const fileInput = document.getElementById('nodeDeviceFileInput');
  const spinner = document.getElementById('nodeUploadSpinner');
  const uploadBtn = document.getElementById('nodeUploadBtn');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert('يرجى اختيار صورة واحدة على الأقل من جهازك');
    return;
  }

  const formData = new FormData();
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('images', fileInput.files[i]);
  }

  if (spinner) spinner.style.display = 'block';
  if (uploadBtn) uploadBtn.disabled = true;

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    const res = await fetch('/api/admin/funnels/upload-images', {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل رفع الصور');

    if (Array.isArray(data.urls)) {
      data.urls.forEach(u => {
        if (!nodeGalleryImages.includes(u)) {
          nodeGalleryImages.push(u);
        }
      });
      const primaryInput = document.getElementById('nodeImageUrl');
      if (primaryInput && !primaryInput.value) {
        primaryInput.value = nodeGalleryImages[0] || '';
      }
      renderNodeGallery();
      showToast(`تم رفع ${data.urls.length} صور بنجاح! 🎉`);
      fileInput.value = '';
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert(`حدث خطأ أثناء رفع الصور: ${err.message}`);
  } finally {
    if (spinner) spinner.style.display = 'none';
    if (uploadBtn) uploadBtn.disabled = false;
  }
}

// Open Modal: Add Root Node
function openCreateNodeModal() {
  document.getElementById('nodeForm').reset();
  document.getElementById('nodeId').value = '';
  document.getElementById('nodeParentId').value = '';
  document.getElementById('nodeParentRow').style.display = 'none';
  document.getElementById('nodeModalTitle').innerHTML = '<i class="bi bi-folder-plus me-2"></i>إضافة قسم رئيسي جديد';
  document.getElementById('nodeType').value = 'section';
  document.getElementById('nodeShowOnHome').checked = true;
  document.getElementById('nodeIsActive').checked = true;
  
  // Custom appearance & colors defaults
  document.getElementById('nodeCardBadge').value = '';
  document.getElementById('nodeSectionTag').value = '';
  document.getElementById('nodeSectionHeading').value = '';
  document.getElementById('nodeTitleColor').value = '#222222';
  document.getElementById('nodeTextColor').value = '#666666';
  document.getElementById('nodeButtonColor').value = '#5a6344';
  document.getElementById('nodeButtonTextColor').value = '#ffffff';
  if (document.getElementById('nodePriceColor')) document.getElementById('nodePriceColor').value = '#5a6344';
  if (document.getElementById('nodePageBgColor')) document.getElementById('nodePageBgColor').value = '#ffffff';
  document.getElementById('nodeTagColor').value = '#5a6344';
  document.getElementById('nodeTagBgColor').value = '#f4f6f1';

  nodeGalleryImages = [];
  renderNodeGallery();
  nodeModalInstance.show();
}

// Open Modal: Add Child Node inside a Parent Section
function openAddChildNodeModal(parentId, parentTitle) {
  document.getElementById('nodeForm').reset();
  document.getElementById('nodeId').value = '';
  document.getElementById('nodeParentId').value = parentId;
  document.getElementById('nodeParentRow').style.display = 'block';
  document.getElementById('nodeParentName').textContent = parentTitle;
  document.getElementById('nodeModalTitle').innerHTML = `<i class="bi bi-node-plus me-2"></i>إضافة قسم فرعي داخل [${parentTitle}]`;
  document.getElementById('nodeType').value = 'landing_page';
  document.getElementById('nodeShowOnHome').checked = false;
  document.getElementById('nodeIsActive').checked = true;

  // Custom appearance & colors defaults
  document.getElementById('nodeCardBadge').value = '';
  document.getElementById('nodeSectionTag').value = '';
  document.getElementById('nodeSectionHeading').value = '';
  document.getElementById('nodeTitleColor').value = '#222222';
  document.getElementById('nodeTextColor').value = '#666666';
  document.getElementById('nodeButtonColor').value = '#5a6344';
  document.getElementById('nodeButtonTextColor').value = '#ffffff';
  if (document.getElementById('nodePriceColor')) document.getElementById('nodePriceColor').value = '#5a6344';
  if (document.getElementById('nodePageBgColor')) document.getElementById('nodePageBgColor').value = '#ffffff';
  document.getElementById('nodeTagColor').value = '#5a6344';
  document.getElementById('nodeTagBgColor').value = '#f4f6f1';

  nodeGalleryImages = [];
  renderNodeGallery();
  nodeModalInstance.show();
}

// Open Modal: Edit Node
function openEditNodeModal(nodeId) {
  const node = allNodesList.find(n => n.id === nodeId);
  if (!node) return;

  document.getElementById('nodeId').value = node.id;
  document.getElementById('nodeParentId').value = node.parent_id || '';
  document.getElementById('nodeTitle').value = node.title || '';
  document.getElementById('nodeSlug').value = node.slug || '';
  document.getElementById('nodeSubtitle').value = node.subtitle || '';
  document.getElementById('nodeImageUrl').value = node.image_url || '';
  document.getElementById('nodeButtonText').value = node.button_text || 'اكتشف الحل المناسب لبشرتك ➔';
  document.getElementById('nodeType').value = node.type || 'section';
  document.getElementById('nodeShowOnHome').checked = Boolean(node.show_on_home);
  document.getElementById('nodeIsActive').checked = node.is_active !== false;

  const nodeSettings = typeof node.settings === 'object' && node.settings !== null ? node.settings : {};
  
  // Custom appearance & colors from settings
  document.getElementById('nodeCardBadge').value = nodeSettings.card_badge || '';
  document.getElementById('nodeSectionTag').value = nodeSettings.section_tag || '';
  document.getElementById('nodeSectionHeading').value = nodeSettings.section_heading || '';
  document.getElementById('nodeTitleColor').value = nodeSettings.title_color || '#222222';
  document.getElementById('nodeTextColor').value = nodeSettings.text_color || '#666666';
  document.getElementById('nodeButtonColor').value = nodeSettings.button_color || '#5a6344';
  document.getElementById('nodeButtonTextColor').value = nodeSettings.button_text_color || '#ffffff';
  if (document.getElementById('nodePriceColor')) document.getElementById('nodePriceColor').value = nodeSettings.price_color || '#5a6344';
  if (document.getElementById('nodePageBgColor')) document.getElementById('nodePageBgColor').value = nodeSettings.page_bg_color || '#ffffff';
  document.getElementById('nodeTagColor').value = nodeSettings.tag_color || '#5a6344';
  document.getElementById('nodeTagBgColor').value = nodeSettings.tag_bg_color || '#f4f6f1';

  if (Array.isArray(nodeSettings.images) && nodeSettings.images.length > 0) {
    nodeGalleryImages = [...nodeSettings.images];
  } else if (node.image_url) {
    nodeGalleryImages = [node.image_url];
  } else {
    nodeGalleryImages = [];
  }
  renderNodeGallery();

  if (node.parent_id) {
    const parent = allNodesList.find(n => n.id === node.parent_id);
    document.getElementById('nodeParentRow').style.display = 'block';
    document.getElementById('nodeParentName').textContent = parent ? parent.title : `القسم #${node.parent_id}`;
  } else {
    document.getElementById('nodeParentRow').style.display = 'none';
  }

  document.getElementById('nodeModalTitle').innerHTML = `<i class="bi bi-pencil-square me-2"></i>تعديل [${node.title}]`;
  nodeModalInstance.show();
}

// Submit Node Form (Create or Update)
async function handleNodeFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('nodeId').value;
  const parentId = document.getElementById('nodeParentId').value;

  const existingNode = id ? allNodesList.find(n => n.id == id) : null;
  const existingSettings = (existingNode && typeof existingNode.settings === 'object') ? existingNode.settings : {};

  const primaryImg = document.getElementById('nodeImageUrl').value.trim() || (nodeGalleryImages[0] || null);

  const payload = {
    parent_id: parentId ? parseInt(parentId, 10) : null,
    title: document.getElementById('nodeTitle').value.trim(),
    slug: document.getElementById('nodeSlug').value.trim(),
    subtitle: document.getElementById('nodeSubtitle').value.trim(),
    image_url: primaryImg,
    button_text: document.getElementById('nodeButtonText').value.trim(),
    type: document.getElementById('nodeType').value,
    show_on_home: document.getElementById('nodeShowOnHome').checked,
    is_active: document.getElementById('nodeIsActive').checked,
    settings: {
      ...existingSettings,
      images: nodeGalleryImages,
      card_badge: document.getElementById('nodeCardBadge').value.trim() || '',
      section_tag: document.getElementById('nodeSectionTag').value.trim() || '',
      section_heading: document.getElementById('nodeSectionHeading').value.trim() || '',
      title_color: document.getElementById('nodeTitleColor').value || '',
      text_color: document.getElementById('nodeTextColor').value || '',
      button_color: document.getElementById('nodeButtonColor').value || '',
      button_text_color: document.getElementById('nodeButtonTextColor').value || '',
      price_color: document.getElementById('nodePriceColor')?.value || '',
      page_bg_color: document.getElementById('nodePageBgColor')?.value || '',
      tag_color: document.getElementById('nodeTagColor').value || '',
      tag_bg_color: document.getElementById('nodeTagBgColor').value || ''
    }
  };

  const btn = document.getElementById('nodeSubmitBtn');
  btn.disabled = true;

  try {
    const url = id ? `/api/admin/funnels/node/${id}` : '/api/admin/funnels/node';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ بيانات القسم');

    nodeModalInstance.hide();
    showToast(id ? 'تم تعديل القسم بنجاح' : 'تم إنشاء القسم بنجاح 🎉');
    await loadFunnelsTree();

  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
}

// Delete Node
async function deleteNode(id, title) {
  if (!confirm(`هل أنت متأكد من رغبتك في حذف "${title}"؟\nتنبيه: سيتم حذف جميع الأقسام الفرعية وكتل صفحة الهبوط المرتبطة به نهائياً.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/funnels/node/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'فشل حذف القسم');
    }

    showToast('تم حذف القسم بنجاح');
    await loadFunnelsTree();
  } catch (err) {
    alert(err.message);
  }
}

// ==========================================================================
// 2. LANDING PAGE VISUAL BUILDER (TAB 2)
// ==========================================================================

function switchToBuilder(nodeId) {
  // Activate Tab 2
  const tabBtn = document.getElementById('tabBuilder-btn');
  const tab = new bootstrap.Tab(tabBtn);
  tab.show();

  const select = document.getElementById('builderSelectLanding');
  select.value = nodeId;
  onLandingPageSelected();
}

async function onLandingPageSelected() {
  const select = document.getElementById('builderSelectLanding');
  const nodeId = parseInt(select.value, 10);
  const detailsBox = document.getElementById('builderNodeDetails');
  const canvas = document.getElementById('builderBlocksCanvas');

  if (!nodeId) {
    currentEditingNodeId = null;
    detailsBox.style.display = 'none';
    canvas.innerHTML = '<div class="text-center py-5 text-muted">اختر صفحة هبوط للبدء بتعديلها</div>';
    return;
  }

  currentEditingNodeId = nodeId;
  detailsBox.style.display = 'block';

  const node = allNodesList.find(n => n.id === nodeId);
  if (node) {
    document.getElementById('builderSlugText').textContent = `/solutions/${node.slug}`;
    document.getElementById('builderLiveLink').href = `/solutions/${node.slug}`;
  }

  canvas.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p class="mt-2 text-muted">جاري تحميل كتل وعروض الصفحة...</p></div>';

  try {
    const res = await fetch(`/api/admin/funnels/node/${nodeId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('فشل جلب تفاصيل صفحة الهبوط');

    const data = await res.json();
    currentBlocks = data.blocks || [];
    currentOffers = data.offers || [];

    renderBlocksCanvas();
  } catch (err) {
    canvas.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// Render list of blocks in canvas
function renderBlocksCanvas() {
  const canvas = document.getElementById('builderBlocksCanvas');
  const countEl = document.getElementById('builderBlocksCount');
  if (!canvas) return;

  countEl.textContent = `${currentBlocks.length} كتل`;

  if (currentBlocks.length === 0) {
    canvas.innerHTML = `
      <div class="text-center py-5 bg-light rounded-4 border p-4">
        <i class="bi bi-layers-half display-4 text-muted"></i>
        <h5 class="fw-bold mt-3">لا توجد كتل مضافة لهذه الصفحة بعد</h5>
        <p class="text-muted small">ابدأ بإضافة كتل مثل: بانر البداية (Hero)، المميزات، بطاقة المنتج، باقات العروض، ونموذج الطلب.</p>
        <button class="btn btn-success rounded-pill fw-bold mt-2" onclick="openAddBlockModal()">
          <i class="bi bi-plus-lg me-1"></i> إضافة أول كتلة
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  currentBlocks.forEach((block, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === currentBlocks.length - 1;

    let badgeClass = 'bg-secondary';
    let typeName = block.block_type;
    switch (block.block_type) {
      case 'hero': badgeClass = 'bg-primary'; typeName = 'بانر البداية (Hero)'; break;
      case 'heading': badgeClass = 'bg-info text-dark'; typeName = 'عنوان رئيسي (Heading)'; break;
      case 'text': badgeClass = 'bg-secondary'; typeName = 'نص ومحتوى (Text)'; break;
      case 'image_text': badgeClass = 'bg-warning text-dark'; typeName = 'صورة مع نص'; break;
      case 'features': badgeClass = 'bg-success'; typeName = 'مميزات (Features)'; break;
      case 'product_card': badgeClass = 'bg-dark'; typeName = 'بطاقة منتج (Product)'; break;
      case 'offers': badgeClass = 'bg-danger'; typeName = 'باقات وعروض الخصم'; break;
      case 'order_form': badgeClass = 'bg-success'; typeName = 'نموذج الطلب المباشر'; break;
      case 'faq': badgeClass = 'bg-light text-dark border'; typeName = 'أسئلة شائعة (FAQ)'; break;
    }

    html += `
      <div class="builder-block-card" id="block-item-${idx}">
        <div class="builder-block-header">
          <div class="d-flex align-items-center gap-2">
            <span class="badge ${badgeClass} builder-block-badge">${typeName}</span>
            <span class="fw-bold text-dark">${block.title || '(بدون عنوان)'}</span>
          </div>

          <div class="d-flex align-items-center gap-1">
            <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="moveBlock(${idx}, -1)" ${isFirst ? 'disabled' : ''} title="تحريك لأعلى">
              <i class="bi bi-arrow-up"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="moveBlock(${idx}, 1)" ${isLast ? 'disabled' : ''} title="تحريك لأسفل">
              <i class="bi bi-arrow-down"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="openEditBlockModal(${idx})" title="تعديل">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="removeBlock(${idx})" title="حذف">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

        <div class="builder-block-body small text-muted">
          ${renderBlockSummarySnippet(block)}
        </div>
      </div>
    `;
  });

  canvas.innerHTML = html;
}

function renderBlockSummarySnippet(block) {
  const content = typeof block.content === 'object' ? block.content : {};
  if (block.block_type === 'hero') {
    return `<div>${content.description || ''}</div><div class="small text-success mt-1"><i class="bi bi-link-45deg"></i> زر: ${content.cta_text || 'أطلب الآن'}</div>`;
  }
  if (block.block_type === 'text') {
    return `<div>${(content.text || '').slice(0, 140)}...</div>`;
  }
  if (block.block_type === 'offers') {
    return `<div class="text-danger fw-bold"><i class="bi bi-gift-fill me-1"></i> يتم عرض الباقات المحددة في الصفحة (${currentOffers.length} باقات منشأة).</div>`;
  }
  if (block.block_type === 'order_form') {
    return `<div class="text-success fw-bold"><i class="bi bi-check-circle me-1"></i> نموذج طلب مباشر مع تحديد الولاية والبلدية وكود الخصم.</div>`;
  }
  return `<div>الكتلة جاهزة للعرض في مسار الزائر.</div>`;
}

// Move Block Up or Down
function moveBlock(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentBlocks.length) return;

  const temp = currentBlocks[index];
  currentBlocks[index] = currentBlocks[targetIndex];
  currentBlocks[targetIndex] = temp;

  renderBlocksCanvas();
}

// Remove Block
function removeBlock(index) {
  if (!confirm('هل أنت متأكد من حذف هذه الكتلة من الصفحة؟')) return;
  currentBlocks.splice(index, 1);
  renderBlocksCanvas();
}

// ==========================================================================
// 3. ADD / EDIT BLOCK MODAL LOGIC
// ==========================================================================

function openAddBlockModal() {
  document.getElementById('blockForm').reset();
  document.getElementById('blockEditIndex').value = '-1';
  document.getElementById('blockModalTitle').innerHTML = '<i class="bi bi-plus-square me-2"></i>إضافة كتلة جديدة';
  document.getElementById('blockType').value = 'text';

  // Reset visual customizer controls
  if (document.getElementById('blockTitleSize')) document.getElementById('blockTitleSize').value = '2.0rem';
  if (document.getElementById('blockTextSize')) document.getElementById('blockTextSize').value = '1.05rem';
  if (document.getElementById('blockFontFamily')) document.getElementById('blockFontFamily').value = 'Cairo';
  if (document.getElementById('blockFontWeight')) document.getElementById('blockFontWeight').value = '700';
  if (document.getElementById('blockTextAlign')) document.getElementById('blockTextAlign').value = 'right';
  if (document.getElementById('blockTitleColor')) document.getElementById('blockTitleColor').value = '#222222';
  if (document.getElementById('blockTextColor')) document.getElementById('blockTextColor').value = '#555555';
  if (document.getElementById('blockBtnBgColor')) document.getElementById('blockBtnBgColor').value = '#5a6344';
  if (document.getElementById('blockBtnTextColor')) document.getElementById('blockBtnTextColor').value = '#ffffff';
  if (document.getElementById('blockPriceColor')) document.getElementById('blockPriceColor').value = '#5a6344';
  if (document.getElementById('blockBgColor')) {
    document.getElementById('blockBgColor').value = '#ffffff';
    delete document.getElementById('blockBgColor').dataset.transparent;
    document.getElementById('blockBgColor').style.opacity = '1';
  }
  if (document.getElementById('blockImageAspectRatio')) document.getElementById('blockImageAspectRatio').value = '1:1';
  if (document.getElementById('blockImageFit')) document.getElementById('blockImageFit').value = 'cover';
  if (document.getElementById('blockIconSymbol')) document.getElementById('blockIconSymbol').value = '';

  onBlockTypeChange();
  blockModalInstance.show();
}

function openEditBlockModal(index) {
  const block = currentBlocks[index];
  if (!block) return;

  document.getElementById('blockEditIndex').value = index;
  document.getElementById('blockModalTitle').innerHTML = `<i class="bi bi-pencil-square me-2"></i>تعديل الكتلة #${index + 1}`;
  document.getElementById('blockType').value = block.block_type;
  document.getElementById('blockTitleInput').value = block.title || '';

  const styles = typeof block.styles === 'object' && block.styles !== null ? block.styles : {};
  if (document.getElementById('blockFontFamily')) document.getElementById('blockFontFamily').value = styles.font_family || 'Cairo';
  if (document.getElementById('blockFontWeight')) document.getElementById('blockFontWeight').value = styles.font_weight || '700';
  if (document.getElementById('blockTitleSize')) document.getElementById('blockTitleSize').value = styles.title_size || '2.0rem';
  if (document.getElementById('blockTextSize')) document.getElementById('blockTextSize').value = styles.text_size || '1.05rem';
  if (document.getElementById('blockTextAlign')) document.getElementById('blockTextAlign').value = styles.text_align || 'right';

  if (document.getElementById('blockTitleColor')) document.getElementById('blockTitleColor').value = styles.title_color || '#222222';
  if (document.getElementById('blockTextColor')) document.getElementById('blockTextColor').value = styles.text_color || '#555555';
  if (document.getElementById('blockBtnBgColor')) document.getElementById('blockBtnBgColor').value = styles.btn_bg_color || '#5a6344';
  if (document.getElementById('blockBtnTextColor')) document.getElementById('blockBtnTextColor').value = styles.btn_text_color || '#ffffff';
  if (document.getElementById('blockPriceColor')) document.getElementById('blockPriceColor').value = styles.price_color || '#5a6344';

  if (document.getElementById('blockBgColor')) {
    if (styles.bg_color === 'transparent') {
      document.getElementById('blockBgColor').dataset.transparent = 'true';
      document.getElementById('blockBgColor').style.opacity = '0.4';
    } else {
      delete document.getElementById('blockBgColor').dataset.transparent;
      document.getElementById('blockBgColor').style.opacity = '1';
      document.getElementById('blockBgColor').value = styles.bg_color || '#ffffff';
    }
  }

  if (document.getElementById('blockImageAspectRatio')) document.getElementById('blockImageAspectRatio').value = styles.image_aspect_ratio || '1:1';
  if (document.getElementById('blockImageFit')) document.getElementById('blockImageFit').value = styles.image_fit || 'cover';
  if (document.getElementById('blockIconSymbol')) document.getElementById('blockIconSymbol').value = styles.icon_symbol || '';

  onBlockTypeChange();
  populateBlockDynamicFields(block);
  blockModalInstance.show();
}

// Dynamic fields switcher based on block type
function onBlockTypeChange() {
  const type = document.getElementById('blockType').value;
  const container = document.getElementById('blockDynamicFields');

  switch (type) {
    case 'hero':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">الشارة العلوية (Badge):</label>
          <input type="text" id="fieldHeroBadge" class="form-control" placeholder="مثال: حل طبيعي ومضمون 100%">
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold">الوصف التسويقي الرئيسي:</label>
          <textarea id="fieldHeroDesc" class="form-control" rows="3" placeholder="اشرح الحل والفوائد باختصار..."></textarea>
        </div>
        <div class="mb-3 p-3 bg-light rounded border">
          <label class="form-label small fw-bold"><i class="bi bi-image me-1 text-primary"></i>صورة البانر الرئيسية:</label>
          <div class="input-group mb-2">
            <input type="file" class="form-control form-control-sm" accept="image/*" onchange="uploadSingleImageForBlock(this, 'fieldHeroImg')">
          </div>
          <input type="text" id="fieldHeroImg" class="form-control form-control-sm" placeholder="/images/category-banner-oil.jpg">
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold">نص زر الدعوة للشراء (CTA):</label>
          <input type="text" id="fieldHeroCta" class="form-control" value="أطلب الآن واستفد من العرض ➔">
        </div>
      `;
      break;

    case 'heading':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">وصف تحتي خفيف (اختياري):</label>
          <input type="text" id="fieldHeadingSub" class="form-control" placeholder="سطر توضيحي خفيف يظهر تحت العنوان...">
        </div>
      `;
      break;

    case 'video':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">مصدر الفيديو (Video Source):</label>
          <div class="d-flex gap-3 mb-2">
            <div class="form-check">
              <input class="form-check-input" type="radio" name="videoSourceType" id="videoSourceYoutube" value="youtube" checked onchange="toggleVideoSourceType()">
              <label class="form-check-label small fw-bold" for="videoSourceYoutube">
                <i class="bi bi-youtube text-danger me-1"></i>رابط يوتيوب (YouTube URL)
              </label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="videoSourceType" id="videoSourceLocal" value="local" onchange="toggleVideoSourceType()">
              <label class="form-check-label small fw-bold" for="videoSourceLocal">
                <i class="bi bi-upload text-primary me-1"></i>رفع من الجهاز (MP4 / WebM)
              </label>
            </div>
          </div>
        </div>

        <!-- YouTube Field -->
        <div id="videoSourceYoutubeWrap" class="mb-3 p-3 bg-light rounded border">
          <label class="form-label small fw-bold"><i class="bi bi-youtube text-danger me-1"></i>رابط فيديو يوتيوب:</label>
          <input type="text" id="fieldVideoYoutubeUrl" class="form-control form-control-sm" placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/... أو شورتس">
          <div class="form-text small">يدعم جميع صيغ روابط يوتيوب: العادية، الشورتس (Shorts)، والـ Embed تلقائياً.</div>
        </div>

        <!-- Local Upload Field -->
        <div id="videoSourceLocalWrap" class="mb-3 p-3 bg-light rounded border" style="display:none;">
          <label class="form-label small fw-bold"><i class="bi bi-file-earmark-play text-primary me-1"></i>رفع ملف فيديو من جهازك:</label>
          <div class="input-group mb-2">
            <input type="file" class="form-control form-control-sm" accept="video/mp4,video/webm,video/ogg,video/quicktime" id="localVideoFileInput" onchange="uploadSingleVideoForBlock(this)">
          </div>
          <div id="videoUploadSpinner" style="display:none;" class="text-primary small mb-2">
            <span class="spinner-border spinner-border-sm me-1"></span> جاري رفع الفيديو (يرجى الانتظار)...
          </div>
          <input type="text" id="fieldVideoLocalUrl" class="form-control form-control-sm" placeholder="/uploads/videos/video.mp4">
        </div>

        <!-- Video Aspect Ratio Dimension -->
        <div class="mb-3 p-3 bg-light rounded border">
          <div class="small fw-bold text-secondary mb-2"><i class="bi bi-aspect-ratio me-1"></i>أبعاد وأحجام الفيديو (Video Dimensions & Aspect Ratio):</div>
          <div class="row g-2">
            <div class="col-12 col-md-6">
              <label class="form-label small mb-1">نسبة أبعاد الفيديو (Aspect Ratio):</label>
              <select class="form-select form-select-sm" id="fieldVideoRatio">
                <option value="16:9" selected>16:9 (عريض أفقي سينمائي Widescreen - شاشات ويوتيوب)</option>
                <option value="9:16">9:16 (طولي ريلز / تيك توك / ستوري Vertical Reels - ممتاز للجوال)</option>
                <option value="1:1">1:1 (مربع متساوي Square - رائع ومضغوط)</option>
                <option value="4:3">4:3 (كلاسيكي Classic TV)</option>
                <option value="3:4">3:4 (طولي بورتريه معتدل Portrait)</option>
              </select>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small mb-1">أقصى عرض للفيديو (Max Width):</label>
              <select class="form-select form-select-sm" id="fieldVideoMaxWidth">
                <option value="100%">100% (عرض كامل الصفحة)</option>
                <option value="760px" selected>760px (متوسط متناسق)</option>
                <option value="420px">420px (مخصص للفيديوهات الطولية 9:16 مثل تيك توك)</option>
                <option value="560px">560px (مضغوط وأنيق)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Video Controls & Settings -->
        <div class="mb-3 p-3 bg-light rounded border">
          <div class="small fw-bold text-secondary mb-2"><i class="bi bi-gear me-1"></i>إعدادات التشغيل:</div>
          <div class="d-flex flex-wrap gap-4">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="fieldVideoAutoplay">
              <label class="form-check-label small" for="fieldVideoAutoplay">تشغيل تلقائي بدون صوت (Autoplay muted)</label>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="fieldVideoLoop">
              <label class="form-check-label small" for="fieldVideoLoop">تكرار الفيديو مستمر (Loop)</label>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="fieldVideoControls" checked>
              <label class="form-check-label small" for="fieldVideoControls">إظهار أزرار التحكم (Controls)</label>
            </div>
          </div>
        </div>

        <!-- Caption -->
        <div class="mb-3">
          <label class="form-label small fw-bold">نص توضيحي تحت الفيديو (اختياري):</label>
          <input type="text" id="fieldVideoCaption" class="form-control" placeholder="شاهد تجربة واستخدام المنتج على أرض الواقع...">
        </div>
      `;
      break;

    case 'text':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">نص المقال أو الفقرة التسويقية:</label>
          <textarea id="fieldTextBody" class="form-control" rows="6" placeholder="اكتب الفقرات التوضيحية هنا..."></textarea>
        </div>
      `;
      break;

    case 'image_text':
      container.innerHTML = `
        <div class="mb-3 p-3 bg-light rounded border">
          <label class="form-label small fw-bold"><i class="bi bi-image me-1 text-primary"></i>صورة توضيحية من جهازك:</label>
          <div class="input-group mb-2">
            <input type="file" class="form-control form-control-sm" accept="image/*" onchange="uploadSingleImageForBlock(this, 'fieldSplitImg')">
          </div>
          <input type="text" id="fieldSplitImg" class="form-control form-control-sm" placeholder="/images/category-banner-oil.jpg">
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold">النص التوضيحي:</label>
          <textarea id="fieldSplitText" class="form-control" rows="4" placeholder="اكتب نص الشرح بجانب الصورة..."></textarea>
        </div>
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="fieldSplitReverse">
          <label class="form-check-label small" for="fieldSplitReverse">عكس الاتجاه (الصورة على اليسار)</label>
        </div>
      `;
      break;

    case 'carousel':
      container.innerHTML = `
        <div class="mb-3 p-3 bg-light rounded border">
          <label class="form-label small fw-bold"><i class="bi bi-images me-1 text-primary"></i>رفع صور المعرض من جهازك (اختر عدة صور معاً):</label>
          <div class="input-group mb-2">
            <input type="file" class="form-control form-control-sm" accept="image/*" multiple onchange="uploadMultipleImagesForBlock(this, 'fieldCarouselImgs')">
          </div>
          <div id="carouselUploadSpinner" style="display:none;" class="text-primary small mb-2">
            <span class="spinner-border spinner-border-sm me-1"></span> جاري رفع الصور من جهازك...
          </div>
          <label class="form-label small text-muted">روابط الصور (رابط في كل سطر):</label>
          <textarea id="fieldCarouselImgs" class="form-control" rows="4" placeholder="/uploads/funnels/image1.jpg&#10;/uploads/funnels/image2.jpg"></textarea>
        </div>
      `;
      break;

    case 'features':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">قائمة المميزات والفوائد (نقطة في كل سطر: العنوان | الشرح):</label>
          <textarea id="fieldFeaturesList" class="form-control" rows="5" placeholder="طبيعي 100% | مستخلص من أنقى الزيوت العضوية
نتائج مثبتة | نتائج ملحوظة من أول أسبوع
دفع عند الاستلام | فحص الطرد قبل الدفع"></textarea>
          <span class="text-muted small">تنسيق كل سطر: <code>العنوان | الشرح التوضيحي</code></span>
        </div>
      `;
      break;

    case 'product_card':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">اختر المنتج من قاعدة البيانات:</label>
          <select id="fieldProductSelect" class="form-select">
            ${productsList.map(p => `<option value="${p.id}">${p.name} (${p.price} دج)</option>`).join('')}
          </select>
        </div>
      `;
      break;

    case 'offers':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">وصف / نص فرعي للقسم (اختياري - يظهر تحت عنوان العروض):</label>
          <input type="text" id="fieldOffersSub" class="form-control" placeholder="اتركه فارغاً إذا كنت لا ترغب بظهور نص فرعي">
          <div class="form-text small">إذا تركته فارغاً لن يظهر أي نص تلقائي.</div>
        </div>
        <div class="alert alert-info py-2 small mb-0">
          <i class="bi bi-info-circle me-1"></i> يتم سحب الباقات والعروض من مدير العروض الخاص بالصفحة. يمكنك تعديل العروض من زر "إدارة باقات وعروض الخصم".
        </div>
      `;
      break;

    case 'order_form':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">وصف / نص فرعي للنموذج (اختياري - يظهر تحت عنوان الطلب):</label>
          <input type="text" id="fieldOrderFormSub" class="form-control" placeholder="اتركه فارغاً إذا كنت لا ترغب بظهور نص فرعي">
          <div class="form-text small">إذا تركته فارغاً لن يظهر أي نص تلقائي.</div>
        </div>
        <div class="alert alert-success py-2 small mb-0">
          <i class="bi bi-check-circle me-1"></i> يتم تضمين نموذج الطلب المباشر الكامل مع الولايات وأسعار التوصيل والخصومات تلقائياً.
        </div>
      `;
      break;

    case 'faq':
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label small fw-bold">الأسئلة الشائعة (سؤال | جواب في كل سطر):</label>
          <textarea id="fieldFaqList" class="form-control" rows="5" placeholder="متى تظهر النتيجة؟ | تظهر النتيجة عادة خلال 7 إلى 14 يوم من الاستخدام المنتظم.
هل التوصيل متوفر لولايتي؟ | نعم التوصيل متوفر لجميع الـ 58 ولاية حتى باب المنزل."></textarea>
          <span class="text-muted small">تنسيق كل سطر: <code>السؤال | الإجابة</code></span>
        </div>
      `;
      break;

    default:
      container.innerHTML = '';
  }
}

// Helpers to upload images from device for blocks
async function uploadSingleImageForBlock(input, targetFieldId) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('images', input.files[0]);

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    const res = await fetch('/api/admin/funnels/upload-images', {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل رفع الصورة');
    const field = document.getElementById(targetFieldId);
    if (field && data.primaryUrl) {
      field.value = data.primaryUrl;
      showToast('تم رفع الصورة بنجاح من جهازك! 🎉');
    }
  } catch (err) {
    alert(`فشل رفع الصورة: ${err.message}`);
  }
}

async function uploadMultipleImagesForBlock(input, targetFieldId) {
  if (!input.files || input.files.length === 0) return;
  const formData = new FormData();
  for (let i = 0; i < input.files.length; i++) {
    formData.append('images', input.files[i]);
  }

  const spinner = document.getElementById('carouselUploadSpinner');
  if (spinner) spinner.style.display = 'block';

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    const res = await fetch('/api/admin/funnels/upload-images', {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل رفع الصور');
    const field = document.getElementById(targetFieldId);
    if (field && Array.isArray(data.urls)) {
      const existing = (field.value || '').trim();
      field.value = existing ? `${existing}\n${data.urls.join('\n')}` : data.urls.join('\n');
      showToast(`تم رفع ${data.urls.length} صور بنجاح! 🎉`);
    }
  } catch (err) {
    alert(`فشل رفع الصور: ${err.message}`);
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

// Toggle Video Source Type (YouTube vs Local)
function toggleVideoSourceType() {
  const isLocal = document.getElementById('videoSourceLocal')?.checked;
  const ytWrap = document.getElementById('videoSourceYoutubeWrap');
  const localWrap = document.getElementById('videoSourceLocalWrap');
  if (ytWrap) ytWrap.style.display = isLocal ? 'none' : 'block';
  if (localWrap) localWrap.style.display = isLocal ? 'block' : 'none';
}

// Upload Single Video from Device
async function uploadSingleVideoForBlock(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (file.size > 100 * 1024 * 1024) {
    alert('حجم ملف الفيديو كبير جداً. الحد الأقصى المسموح به هو 100 ميغابايت.');
    input.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('video', file);

  const spinner = document.getElementById('videoUploadSpinner');
  if (spinner) spinner.style.display = 'block';

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    const res = await fetch('/api/admin/funnels/upload-video', {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل رفع الفيديو');
    const field = document.getElementById('fieldVideoLocalUrl');
    if (field && data.url) {
      field.value = data.url;
      showToast('تم رفع ملف الفيديو بنجاح! 🎬');
    }
  } catch (err) {
    alert(`فشل رفع الفيديو: ${err.message}`);
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

// Populate fields when editing an existing block
function populateBlockDynamicFields(block) {
  const content = typeof block.content === 'object' ? block.content : {};
  const type = block.block_type;

  if (type === 'hero') {
    if (document.getElementById('fieldHeroBadge')) document.getElementById('fieldHeroBadge').value = content.badge || '';
    if (document.getElementById('fieldHeroDesc')) document.getElementById('fieldHeroDesc').value = content.description || '';
    if (document.getElementById('fieldHeroImg')) document.getElementById('fieldHeroImg').value = content.image_url || '';
    if (document.getElementById('fieldHeroCta')) document.getElementById('fieldHeroCta').value = content.cta_text || '';
  } else if (type === 'heading') {
    if (document.getElementById('fieldHeadingSub')) document.getElementById('fieldHeadingSub').value = content.subtitle || '';
  } else if (type === 'video') {
    const srcType = content.video_source || 'youtube';
    if (srcType === 'local') {
      const rLocal = document.getElementById('videoSourceLocal');
      if (rLocal) rLocal.checked = true;
    } else {
      const rYt = document.getElementById('videoSourceYoutube');
      if (rYt) rYt.checked = true;
    }
    toggleVideoSourceType();

    if (document.getElementById('fieldVideoYoutubeUrl')) document.getElementById('fieldVideoYoutubeUrl').value = content.youtube_url || '';
    if (document.getElementById('fieldVideoLocalUrl')) document.getElementById('fieldVideoLocalUrl').value = content.local_url || '';
    if (document.getElementById('fieldVideoRatio')) document.getElementById('fieldVideoRatio').value = content.aspect_ratio || '16:9';
    if (document.getElementById('fieldVideoMaxWidth')) document.getElementById('fieldVideoMaxWidth').value = content.max_width || '760px';
    if (document.getElementById('fieldVideoAutoplay')) document.getElementById('fieldVideoAutoplay').checked = Boolean(content.autoplay);
    if (document.getElementById('fieldVideoLoop')) document.getElementById('fieldVideoLoop').checked = Boolean(content.loop);
    if (document.getElementById('fieldVideoControls')) document.getElementById('fieldVideoControls').checked = content.controls !== false;
    if (document.getElementById('fieldVideoCaption')) document.getElementById('fieldVideoCaption').value = content.caption || '';
  } else if (type === 'text') {
    if (document.getElementById('fieldTextBody')) document.getElementById('fieldTextBody').value = content.text || '';
  } else if (type === 'image_text') {
    if (document.getElementById('fieldSplitImg')) document.getElementById('fieldSplitImg').value = content.image_url || '';
    if (document.getElementById('fieldSplitText')) document.getElementById('fieldSplitText').value = content.text || '';
    if (document.getElementById('fieldSplitReverse')) document.getElementById('fieldSplitReverse').checked = Boolean(content.reverse);
  } else if (type === 'carousel') {
    if (document.getElementById('fieldCarouselImgs')) {
      const imgs = Array.isArray(content.images) ? content.images.join('\n') : (content.image_url || '');
      document.getElementById('fieldCarouselImgs').value = imgs;
    }
  } else if (type === 'features') {
    if (document.getElementById('fieldFeaturesList') && Array.isArray(content.items)) {
      document.getElementById('fieldFeaturesList').value = content.items.map(i => `${i.title} | ${i.text}`).join('\n');
    }
  } else if (type === 'product_card') {
    if (document.getElementById('fieldProductSelect')) document.getElementById('fieldProductSelect').value = content.product_id || '';
  } else if (type === 'offers') {
    if (document.getElementById('fieldOffersSub')) document.getElementById('fieldOffersSub').value = content.subtitle || '';
  } else if (type === 'order_form') {
    if (document.getElementById('fieldOrderFormSub')) document.getElementById('fieldOrderFormSub').value = content.subtitle || '';
  } else if (type === 'faq') {
    if (document.getElementById('fieldFaqList') && Array.isArray(content.items)) {
      document.getElementById('fieldFaqList').value = content.items.map(i => `${i.question} | ${i.answer}`).join('\n');
    }
  }
}

// Handle Block Save in Form
function handleBlockFormSubmit(e) {
  e.preventDefault();
  const index = parseInt(document.getElementById('blockEditIndex').value, 10);
  const type = document.getElementById('blockType').value;
  const title = document.getElementById('blockTitleInput').value.trim();

  const isBgTransparent = document.getElementById('blockBgColor')?.dataset.transparent === 'true';
  const styles = {
    font_family: document.getElementById('blockFontFamily')?.value || 'Cairo',
    font_weight: document.getElementById('blockFontWeight')?.value || '700',
    title_size: document.getElementById('blockTitleSize')?.value?.trim() || '2.0rem',
    text_size: document.getElementById('blockTextSize')?.value?.trim() || '1.05rem',
    text_align: document.getElementById('blockTextAlign')?.value || 'right',
    title_color: document.getElementById('blockTitleColor')?.value || '#222222',
    text_color: document.getElementById('blockTextColor')?.value || '#555555',
    btn_bg_color: document.getElementById('blockBtnBgColor')?.value || '#5a6344',
    btn_text_color: document.getElementById('blockBtnTextColor')?.value || '#ffffff',
    price_color: document.getElementById('blockPriceColor')?.value || '#5a6344',
    bg_color: isBgTransparent ? 'transparent' : (document.getElementById('blockBgColor')?.value || '#ffffff'),
    image_aspect_ratio: document.getElementById('blockImageAspectRatio')?.value || '1:1',
    image_fit: document.getElementById('blockImageFit')?.value || 'cover',
    icon_symbol: document.getElementById('blockIconSymbol')?.value?.trim() || ''
  };

  const content = {};

  if (type === 'hero') {
    content.badge = document.getElementById('fieldHeroBadge')?.value.trim() || '';
    content.description = document.getElementById('fieldHeroDesc')?.value.trim() || '';
    content.image_url = document.getElementById('fieldHeroImg')?.value.trim() || '';
    content.cta_text = document.getElementById('fieldHeroCta')?.value.trim() || 'أطلب الآن واستفد من العرض ➔';
  } else if (type === 'heading') {
    content.subtitle = document.getElementById('fieldHeadingSub')?.value.trim() || '';
  } else if (type === 'video') {
    const isLocal = document.getElementById('videoSourceLocal')?.checked;
    content.video_source = isLocal ? 'local' : 'youtube';
    content.youtube_url = document.getElementById('fieldVideoYoutubeUrl')?.value.trim() || '';
    content.local_url = document.getElementById('fieldVideoLocalUrl')?.value.trim() || '';
    content.aspect_ratio = document.getElementById('fieldVideoRatio')?.value || '16:9';
    content.max_width = document.getElementById('fieldVideoMaxWidth')?.value || '760px';
    content.autoplay = document.getElementById('fieldVideoAutoplay')?.checked || false;
    content.loop = document.getElementById('fieldVideoLoop')?.checked || false;
    content.controls = document.getElementById('fieldVideoControls')?.checked !== false;
    content.caption = document.getElementById('fieldVideoCaption')?.value.trim() || '';
  } else if (type === 'text') {
    content.text = document.getElementById('fieldTextBody')?.value.trim() || '';
  } else if (type === 'image_text') {
    content.image_url = document.getElementById('fieldSplitImg')?.value.trim() || '';
    content.text = document.getElementById('fieldSplitText')?.value.trim() || '';
    content.reverse = document.getElementById('fieldSplitReverse')?.checked || false;
  } else if (type === 'carousel') {
    const rawImgs = (document.getElementById('fieldCarouselImgs')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
    content.images = rawImgs;
    content.image_url = rawImgs[0] || '';
  } else if (type === 'features') {
    const rawLines = (document.getElementById('fieldFeaturesList')?.value || '').split('\n').filter(Boolean);
    content.items = rawLines.map(l => {
      const parts = l.split('|');
      return {
        title: (parts[0] || '').trim(),
        text: (parts[1] || '').trim()
      };
    });
  } else if (type === 'product_card') {
    content.product_id = parseInt(document.getElementById('fieldProductSelect')?.value, 10) || null;
  } else if (type === 'offers') {
    content.subtitle = document.getElementById('fieldOffersSub')?.value.trim() || '';
  } else if (type === 'order_form') {
    content.subtitle = document.getElementById('fieldOrderFormSub')?.value.trim() || '';
  } else if (type === 'faq') {
    const rawLines = (document.getElementById('fieldFaqList')?.value || '').split('\n').filter(Boolean);
    content.items = rawLines.map(l => {
      const parts = l.split('|');
      return {
        question: (parts[0] || '').trim(),
        answer: (parts[1] || '').trim()
      };
    });
  }

  const blockData = {
    block_type: type,
    title,
    content,
    styles,
    is_active: true
  };

  if (index >= 0) {
    currentBlocks[index] = blockData;
  } else {
    currentBlocks.push(blockData);
  }

  blockModalInstance.hide();
  renderBlocksCanvas();
}

// ==========================================================================
// 4. OFFERS MODAL MANAGEMENT
// ==========================================================================

function openManageOffersModal() {
  renderOffersModalTable();
  offersModalInstance.show();
}

// Harvest all current input values from the DOM to avoid resetting on adding/removing rows
function harvestOffersFromDOM() {
  const rows = document.querySelectorAll('#offersTableBody tr[data-offer-idx]');
  if (!rows || rows.length === 0) return;

  const harvested = [];
  rows.forEach((tr, idx) => {
    const existing = currentOffers[idx] || {};
    const title = tr.querySelector('[data-field="title"]')?.value.trim() || '';
    const quantity = parseInt(tr.querySelector('[data-field="quantity"]')?.value, 10) || 1;
    const price = parseFloat(tr.querySelector('[data-field="price"]')?.value) || 0;
    const origPrice = parseFloat(tr.querySelector('[data-field="original_price"]')?.value) || null;
    const badge = tr.querySelector('[data-field="badge"]')?.value.trim() || '';
    const imageUrl = tr.querySelector('[data-field="image_url"]')?.value.trim() || '';
    const freeDelivery = tr.querySelector('[data-field="free_delivery"]')?.checked || false;

    const images = Array.isArray(existing.images) && existing.images.length > 0
      ? existing.images
      : (imageUrl ? [imageUrl] : []);

    harvested.push({
      ...existing,
      title: title || 'عرض خاص',
      quantity,
      price,
      original_price: origPrice,
      badge,
      image_url: imageUrl || (images[0] || ''),
      images: images,
      settings: existing.settings || {},
      free_delivery: freeDelivery,
      is_popular: Boolean(badge && badge.includes('طلب'))
    });
  });

  currentOffers = harvested;
}

function renderOffersModalTable() {
  const tbody = document.getElementById('offersTableBody');
  if (!tbody) return;

  if (currentOffers.length === 0) {
    tbody.innerHTML = `
      <tr id="emptyOffersRow">
        <td colspan="9" class="text-center py-4 text-muted">
          <i class="bi bi-gift display-6 d-block mb-2 text-warning"></i>
          لا توجد باقات منشأة بعد. اضغط "إضافة عرض جديد" للبدء في تخصيص العروض.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  currentOffers.forEach((offer, idx) => {
    const imagesCount = Array.isArray(offer.images) ? offer.images.length : (offer.image_url ? 1 : 0);
    const featuresCount = Array.isArray(offer.settings?.features) ? offer.settings.features.length : 0;
    const hasCustomOptions = Boolean(offer.settings?.has_custom_options);
    const optionsCount = Array.isArray(offer.settings?.options) ? offer.settings.options.length : 0;

    html += `
      <tr data-offer-idx="${idx}">
        <td><input type="text" class="form-control form-control-sm fw-bold" value="${escapeHtml(offer.title || '')}" data-field="title" placeholder="باقة 1"></td>
        <td><input type="number" class="form-control form-control-sm" value="${offer.quantity || 1}" min="1" data-field="quantity"></td>
        <td><input type="number" class="form-control form-control-sm text-success fw-bold" value="${offer.price || 0}" min="0" data-field="price"></td>
        <td><input type="number" class="form-control form-control-sm text-muted" value="${offer.original_price || ''}" min="0" data-field="original_price"></td>
        <td><input type="text" class="form-control form-control-sm" value="${escapeHtml(offer.badge || '')}" data-field="badge" placeholder="الأكثر طلباً"></td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <img src="${offer.image_url || (offer.images && offer.images[0]) || '/images/category-banner-oil.jpg'}" id="offer-img-preview-${idx}" class="rounded border" style="width:34px; height:34px; object-fit:cover; display:${offer.image_url || (offer.images && offer.images[0]) ? 'block' : 'none'};" alt="معاينة">
            <input type="text" class="form-control form-control-sm" value="${escapeHtml(offer.image_url || (offer.images && offer.images[0]) || '')}" data-field="image_url" placeholder="رابط الصورة" oninput="updateOfferImagePreview(${idx}, this.value)">
            <label class="btn btn-sm btn-outline-primary mb-0 p-1 px-2" title="رفع صورة سريعة من الجهاز" style="cursor:pointer;">
              <i class="bi bi-upload"></i>
              <input type="file" accept="image/*" style="display:none;" onchange="uploadSingleOfferImage(event, ${idx})">
            </label>
          </div>
        </td>
        <td>
          <div class="d-flex flex-column gap-1">
            <button type="button" class="btn btn-sm btn-outline-primary rounded-pill py-1 px-2 text-nowrap fw-bold" onclick="openOfferCustomizerModal(${idx})">
              <i class="bi bi-sliders me-1"></i>تخصيص وتفاصيل العرض
            </button>
            <div class="d-flex flex-wrap gap-1 align-items-center">
              ${imagesCount > 1 ? `<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle" style="font-size:0.7rem;"><i class="bi bi-images me-1"></i>${imagesCount} صور</span>` : ''}
              ${featuresCount > 0 ? `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle" style="font-size:0.7rem;"><i class="bi bi-check2-circle me-1"></i>${featuresCount} ميزات</span>` : ''}
              ${hasCustomOptions ? `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style="font-size:0.7rem;"><i class="bi bi-ui-checks me-1"></i>${optionsCount} خيارات مخصصة</span>` : ''}
            </div>
          </div>
        </td>
        <td class="text-center">
          <input type="checkbox" class="form-check-input" ${offer.free_delivery ? 'checked' : ''} data-field="free_delivery">
        </td>
        <td class="text-center">
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeOfferRow(${idx})" title="حذف العرض">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function addNewOfferRow() {
  harvestOffersFromDOM();
  currentOffers.push({
    title: `باقة رقم ${currentOffers.length + 1}`,
    quantity: currentOffers.length + 1,
    price: 3500,
    original_price: 4500,
    badge: currentOffers.length === 1 ? 'الأكثر طلباً 🔥' : '',
    image_url: '',
    images: [],
    settings: {
      description: '',
      title_color: '#111827',
      title_size: '1.15rem',
      price_color: '#5a6344',
      price_size: '1.35rem',
      features: [],
      has_custom_options: false,
      fixed_option: '',
      options_mode: 'multiple',
      options: []
    },
    free_delivery: currentOffers.length >= 1
  });
  renderOffersModalTable();
}

function removeOfferRow(idx) {
  harvestOffersFromDOM();
  currentOffers.splice(idx, 1);
  renderOffersModalTable();
}

function updateOfferImagePreview(idx, val) {
  const img = document.getElementById(`offer-img-preview-${idx}`);
  if (img) {
    img.src = val || '/images/category-banner-oil.jpg';
    img.style.display = val ? 'block' : 'none';
  }
}

async function uploadSingleOfferImage(event, idx) {
  const file = event.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('images', file);

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    const res = await fetch('/api/admin/funnels/upload-images', {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      body: formData
    });

    if (!res.ok) throw new Error('فشل رفع صورة العرض');
    const data = await res.json();
    if (Array.isArray(data.urls) && data.urls[0]) {
      harvestOffersFromDOM();
      if (currentOffers[idx]) {
        currentOffers[idx].image_url = data.urls[0];
        if (!Array.isArray(currentOffers[idx].images) || currentOffers[idx].images.length === 0) {
          currentOffers[idx].images = [data.urls[0]];
        } else {
          currentOffers[idx].images[0] = data.urls[0];
        }
      }
      renderOffersModalTable();
      showToast('تم رفع صورة العرض بنجاح 🖼️');
    }
  } catch (err) {
    alert(`خطأ أثناء رفع الصورة: ${err.message}`);
  }
}

function saveOffersFromModal() {
  harvestOffersFromDOM();
  offersModalInstance.hide();
  showToast('تم تحديث قائمة العروض. اضغط "حفظ جميع التعديلات" لحفظها نهائياً.');
}

// ==========================================================================
// ADVANCED OFFER CUSTOMIZER (IMAGES, CONTENT, OPTIONS)
// ==========================================================================

let activeCustomizingOfferIdx = null;
let activeCustomizingOfferImages = [];
let activeCustomizingOfferFeatures = [];
let activeCustomizingOfferChoices = [];

const CURATED_ICONS_LIST = [
  { id: 'bi-check2-circle', label: 'علامة صح دائرية (Check)' },
  { id: 'bi-patch-check-fill', label: 'شارة توثيق خضراء (Verified)' },
  { id: 'bi-star-fill', label: 'نجمة ذهبية (Star)' },
  { id: 'bi-shield-check', label: 'درع حماية وأمان (Shield)' },
  { id: 'bi-gift-fill', label: 'هدية مجانية (Gift)' },
  { id: 'bi-truck', label: 'توصيل سريع (Delivery)' },
  { id: 'bi-fire', label: 'عرض حصري حار (Fire)' },
  { id: 'bi-gem', label: 'جودة فاخرة (Gem)' },
  { id: 'bi-heart-fill', label: 'رضا العملاء (Heart)' },
  { id: 'bi-award-fill', label: 'ضمان ذهبي أصلي (Award)' },
  { id: 'bi-lightning-charge-fill', label: 'فعالية فائقة (Lightning)' },
  { id: 'bi-box-seam', label: 'طرد مغلف بعناية (Box)' }
];

function openOfferCustomizerModal(idx) {
  harvestOffersFromDOM();
  activeCustomizingOfferIdx = idx;
  const offer = currentOffers[idx];
  if (!offer) return;

  const modalTitle = document.getElementById('offerCustomizerTitle');
  if (modalTitle) {
    modalTitle.innerHTML = `<i class="bi bi-sliders me-2"></i>تخصيص وتفاصيل: <span class="text-warning">${escapeHtml(offer.title || `باقة ${idx + 1}`)}</span>`;
  }

  // 1. Images
  activeCustomizingOfferImages = Array.isArray(offer.images) && offer.images.length > 0
    ? [...offer.images]
    : (offer.image_url ? [offer.image_url] : []);
  renderOfferImagesGalleryPreview();

  // 2. Content & Styling
  const settings = offer.settings || {};
  document.getElementById('customOfferDesc').value = settings.description || '';
  document.getElementById('customOfferTitleColor').value = settings.title_color || '#111827';
  document.getElementById('customOfferTitleSize').value = settings.title_size || '1.15rem';
  document.getElementById('customOfferPriceColor').value = settings.price_color || '#5a6344';
  document.getElementById('customOfferPriceSize').value = settings.price_size || '1.35rem';

  activeCustomizingOfferFeatures = Array.isArray(settings.features)
    ? JSON.parse(JSON.stringify(settings.features))
    : [];
  renderOfferFeaturesList();

  // 3. Options
  document.getElementById('customOfferHasOptions').checked = Boolean(settings.has_custom_options);
  document.getElementById('customOfferFixedItem').value = settings.fixed_option || '';
  document.getElementById('customOfferSelectionMode').value = settings.options_mode || 'multiple';
  activeCustomizingOfferChoices = Array.isArray(settings.options)
    ? JSON.parse(JSON.stringify(settings.options))
    : [];
  renderOfferChoicesList();
  toggleCustomOfferOptionsFields();

  // Reset tab to tab 1
  const firstTabBtn = document.getElementById('tab-offer-images-btn');
  if (firstTabBtn && window.bootstrap) {
    bootstrap.Tab.getOrCreateInstance(firstTabBtn).show();
  }

  if (offerCustomizerModalInstance) {
    offerCustomizerModalInstance.show();
  }
}

// Upload multiple images for the active offer
async function uploadMultipleOfferImages(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }

  const spinner = document.getElementById('offerUploadSpinner');
  if (spinner) spinner.style.display = 'block';

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    const res = await fetch('/api/admin/funnels/upload-images', {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل رفع الصور');

    if (Array.isArray(data.urls)) {
      data.urls.forEach(u => {
        if (!activeCustomizingOfferImages.includes(u)) {
          activeCustomizingOfferImages.push(u);
        }
      });
      renderOfferImagesGalleryPreview();
      showToast(`تم رفع ${data.urls.length} صور للعرض بنجاح! 🖼️`);
    }
  } catch (err) {
    alert(`خطأ أثناء رفع الصور: ${err.message}`);
  } finally {
    if (spinner) spinner.style.display = 'none';
    event.target.value = '';
  }
}

function addOfferImageFromUrl() {
  const input = document.getElementById('offerSingleImageUrlInput');
  const url = (input?.value || '').trim();
  if (!url) return;

  if (!activeCustomizingOfferImages.includes(url)) {
    activeCustomizingOfferImages.push(url);
    renderOfferImagesGalleryPreview();
  }
  input.value = '';
}

function removeOfferImage(imgIdx) {
  activeCustomizingOfferImages.splice(imgIdx, 1);
  renderOfferImagesGalleryPreview();
}

function setOfferPrimaryImage(imgIdx) {
  if (imgIdx <= 0 || imgIdx >= activeCustomizingOfferImages.length) return;
  const target = activeCustomizingOfferImages.splice(imgIdx, 1)[0];
  activeCustomizingOfferImages.unshift(target);
  renderOfferImagesGalleryPreview();
}

function renderOfferImagesGalleryPreview() {
  const container = document.getElementById('offerImagesGalleryPreview');
  if (!container) return;

  if (activeCustomizingOfferImages.length === 0) {
    container.innerHTML = `
      <div class="text-muted small py-4 text-center w-100">
        <i class="bi bi-images fs-3 d-block mb-1 text-secondary"></i>
        لم يتم إضافة أي صور بعد. قم برفع صور أو إضافة رابط صورة من الحقول أعلاه.
      </div>
    `;
    return;
  }

  let html = '';
  activeCustomizingOfferImages.forEach((imgUrl, idx) => {
    const isPrimary = idx === 0;
    html += `
      <div class="position-relative border rounded-3 p-1 bg-light text-center shadow-sm" style="width: 120px;">
        <img src="${imgUrl}" class="rounded w-100" style="height: 90px; object-fit: cover;" alt="صورة ${idx + 1}">
        <span class="badge ${isPrimary ? 'bg-success' : 'bg-secondary'} position-absolute top-0 start-0 m-1" style="font-size:0.65rem;">
          ${isPrimary ? 'رئيسية ★' : `#${idx + 1}`}
        </span>
        <button type="button" class="btn btn-sm btn-danger py-0 px-1 position-absolute top-0 end-0 m-1 rounded-circle" onclick="removeOfferImage(${idx})" title="حذف الصورة">
          ✕
        </button>
        ${!isPrimary ? `
          <button type="button" class="btn btn-xs btn-outline-primary w-100 mt-1 py-0" style="font-size:0.7rem;" onclick="setOfferPrimaryImage(${idx})">
            تعيين كرئيسية
          </button>
        ` : '<div class="small text-success fw-bold mt-1" style="font-size:0.7rem;">الصورة البارزة</div>'}
      </div>
    `;
  });

  container.innerHTML = html;
}

// Feature list with icons management
function addOfferFeatureItem(featObj = null) {
  harvestFeaturesFromDOM();
  activeCustomizingOfferFeatures.push(featObj || {
    icon: 'bi-check2-circle',
    icon_color: '#5a6344',
    icon_size: '1.1rem',
    text: '',
    text_color: '#222222',
    text_size: '0.95rem'
  });
  renderOfferFeaturesList();
}

function removeOfferFeatureItem(featIdx) {
  harvestFeaturesFromDOM();
  activeCustomizingOfferFeatures.splice(featIdx, 1);
  renderOfferFeaturesList();
}

function harvestFeaturesFromDOM() {
  const rows = document.querySelectorAll('#offerFeaturesListContainer .feature-item-row');
  if (!rows || rows.length === 0) return;

  const harvested = [];
  rows.forEach(row => {
    harvested.push({
      icon: row.querySelector('.feat-icon-select')?.value || 'bi-check2-circle',
      icon_color: row.querySelector('.feat-icon-color')?.value || '#5a6344',
      icon_size: row.querySelector('.feat-icon-size')?.value || '1.1rem',
      text: row.querySelector('.feat-text-input')?.value?.trim() || '',
      text_color: row.querySelector('.feat-text-color')?.value || '#222222',
      text_size: row.querySelector('.feat-text-size')?.value || '0.95rem'
    });
  });

  activeCustomizingOfferFeatures = harvested;
}

function renderOfferFeaturesList() {
  const container = document.getElementById('offerFeaturesListContainer');
  if (!container) return;

  if (activeCustomizingOfferFeatures.length === 0) {
    container.innerHTML = `
      <div class="text-muted small py-3 text-center border rounded bg-white">
        لا توجد نقاط أو ميزات مضافة بعد. اضغط "إضافة نقطة" لإدراج فوائد الباقة مع أيقونات ملونة.
      </div>
    `;
    return;
  }

  let html = '';
  activeCustomizingOfferFeatures.forEach((feat, idx) => {
    html += `
      <div class="feature-item-row p-2 bg-white rounded border shadow-sm" data-feat-idx="${idx}">
        <div class="row g-2 align-items-center">
          <!-- Icon Selector & Preview -->
          <div class="col-12 col-md-4">
            <label class="form-label small mb-1 fw-bold">الأيقونة والمظهر:</label>
            <div class="d-flex align-items-center gap-1">
              <span class="p-2 border rounded bg-light text-center" style="width: 38px; height: 38px;">
                <i class="bi ${feat.icon || 'bi-check2-circle'}" style="color: ${feat.icon_color || '#5a6344'}; font-size: ${feat.icon_size || '1.1rem'};"></i>
              </span>
              <select class="form-select form-select-sm feat-icon-select" onchange="harvestFeaturesFromDOM(); renderOfferFeaturesList();">
                ${CURATED_ICONS_LIST.map(ic => `
                  <option value="${ic.id}" ${feat.icon === ic.id ? 'selected' : ''}>${ic.label}</option>
                `).join('')}
              </select>
              <input type="color" class="form-control form-control-color form-control-sm feat-icon-color" value="${feat.icon_color || '#5a6344'}" title="لون الأيقونة" onchange="harvestFeaturesFromDOM(); renderOfferFeaturesList();">
              <select class="form-select form-select-sm feat-icon-size" style="width: 75px;" title="حجم الأيقونة" onchange="harvestFeaturesFromDOM(); renderOfferFeaturesList();">
                <option value="0.9rem" ${feat.icon_size === '0.9rem' ? 'selected' : ''}>صغير</option>
                <option value="1.1rem" ${feat.icon_size === '1.1rem' || !feat.icon_size ? 'selected' : ''}>عادي</option>
                <option value="1.35rem" ${feat.icon_size === '1.35rem' ? 'selected' : ''}>كبير</option>
                <option value="1.65rem" ${feat.icon_size === '1.65rem' ? 'selected' : ''}>بارز</option>
              </select>
            </div>
          </div>

          <!-- Text Input & Styling -->
          <div class="col-12 col-md-7">
            <label class="form-label small mb-1 fw-bold">نص الميزة / الفائدة ولونه:</label>
            <div class="d-flex align-items-center gap-1">
              <input type="text" class="form-control form-control-sm feat-text-input" value="${escapeHtml(feat.text || '')}" placeholder="مثال: ضمان استبدال مجاني لمدة 12 شهر">
              <input type="color" class="form-control form-control-color form-control-sm feat-text-color" value="${feat.text_color || '#222222'}" title="لون النص">
              <select class="form-select form-select-sm feat-text-size" style="width: 75px;" title="حجم النص">
                <option value="0.85rem" ${feat.text_size === '0.85rem' ? 'selected' : ''}>صغير</option>
                <option value="0.95rem" ${feat.text_size === '0.95rem' || !feat.text_size ? 'selected' : ''}>عادي</option>
                <option value="1.1rem" ${feat.text_size === '1.1rem' ? 'selected' : ''}>كبير</option>
              </select>
            </div>
          </div>

          <!-- Delete Button -->
          <div class="col-12 col-md-1 text-center">
            <button type="button" class="btn btn-sm btn-outline-danger mt-3" onclick="removeOfferFeatureItem(${idx})" title="حذف النقطة">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Custom options management
function toggleCustomOfferOptionsFields() {
  const isChecked = document.getElementById('customOfferHasOptions')?.checked;
  const wrap = document.getElementById('customOfferOptionsFieldsWrap');
  if (wrap) wrap.style.display = isChecked ? 'block' : 'none';
}

function addOfferSelectableChoice(choiceObj = null) {
  harvestChoicesFromDOM();
  activeCustomizingOfferChoices.push(choiceObj || {
    id: 'opt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: '',
    price: 500,
    default_selected: false
  });
  renderOfferChoicesList();
}

function removeOfferSelectableChoice(choiceIdx) {
  harvestChoicesFromDOM();
  activeCustomizingOfferChoices.splice(choiceIdx, 1);
  renderOfferChoicesList();
}

function harvestChoicesFromDOM() {
  const rows = document.querySelectorAll('#offerChoicesContainer .choice-item-row');
  if (!rows || rows.length === 0) return;

  const harvested = [];
  rows.forEach(row => {
    const id = row.getAttribute('data-choice-id') || ('opt_' + Date.now());
    const name = row.querySelector('.choice-name-input')?.value?.trim() || '';
    const price = parseFloat(row.querySelector('.choice-price-input')?.value) || 0;
    const defaultSel = row.querySelector('.choice-default-checkbox')?.checked || false;

    harvested.push({
      id,
      name,
      price,
      default_selected: defaultSel
    });
  });

  activeCustomizingOfferChoices = harvested;
}

function renderOfferChoicesList() {
  const container = document.getElementById('offerChoicesContainer');
  if (!container) return;

  if (activeCustomizingOfferChoices.length === 0) {
    container.innerHTML = `
      <div class="text-muted small py-3 text-center border rounded bg-white">
        لم يتم إضافة أي خيارات إضافية بعد. اضغط "إضافة خيار" لإنشاء إضافات يحددها الزبون بسعر إضافي.
      </div>
    `;
    return;
  }

  let html = '';
  activeCustomizingOfferChoices.forEach((choice, idx) => {
    html += `
      <div class="choice-item-row p-2 bg-white rounded border shadow-sm" data-choice-id="${choice.id || 'opt_' + idx}">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-6">
            <label class="form-label small mb-1 fw-bold">اسم الخيار أو الإضافة:</label>
            <input type="text" class="form-control form-control-sm choice-name-input" value="${escapeHtml(choice.name || '')}" placeholder="مثال: شاحن سريع أصلي أو علبة إضافية">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small mb-1 fw-bold">السعر الإضافي (دج):</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text text-success fw-bold">+</span>
              <input type="number" class="form-control choice-price-input" value="${choice.price || 0}" min="0" placeholder="500">
              <span class="input-group-text">دج</span>
            </div>
          </div>
          <div class="col-4 col-md-2 text-center">
            <label class="form-label small mb-1 text-muted d-block">محدد مسبقاً؟</label>
            <div class="form-check d-inline-block">
              <input class="form-check-input choice-default-checkbox" type="checkbox" ${choice.default_selected ? 'checked' : ''} id="def_check_${idx}">
              <label class="form-check-label small" for="def_check_${idx}">نعم</label>
            </div>
          </div>
          <div class="col-2 col-md-1 text-center">
            <button type="button" class="btn btn-sm btn-outline-danger mt-3" onclick="removeOfferSelectableChoice(${idx})" title="حذف الخيار">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function saveOfferCustomizerChanges() {
  if (activeCustomizingOfferIdx === null || !currentOffers[activeCustomizingOfferIdx]) {
    if (offerCustomizerModalInstance) offerCustomizerModalInstance.hide();
    return;
  }

  harvestFeaturesFromDOM();
  harvestChoicesFromDOM();

  const desc = document.getElementById('customOfferDesc')?.value.trim() || '';
  const titleColor = document.getElementById('customOfferTitleColor')?.value || '#111827';
  const titleSize = document.getElementById('customOfferTitleSize')?.value || '1.15rem';
  const priceColor = document.getElementById('customOfferPriceColor')?.value || '#5a6344';
  const priceSize = document.getElementById('customOfferPriceSize')?.value || '1.35rem';

  const hasOptions = document.getElementById('customOfferHasOptions')?.checked || false;
  const fixedOption = document.getElementById('customOfferFixedItem')?.value.trim() || '';
  const optionsMode = document.getElementById('customOfferSelectionMode')?.value || 'multiple';

  // Apply to current offer
  const offer = currentOffers[activeCustomizingOfferIdx];
  offer.images = [...activeCustomizingOfferImages];
  if (activeCustomizingOfferImages.length > 0) {
    offer.image_url = activeCustomizingOfferImages[0];
  }
  offer.settings = {
    ...(offer.settings || {}),
    description: desc,
    title_color: titleColor,
    title_size: titleSize,
    price_color: priceColor,
    price_size: priceSize,
    features: activeCustomizingOfferFeatures.filter(f => f.text),
    has_custom_options: hasOptions,
    fixed_option: fixedOption,
    options_mode: optionsMode,
    options: activeCustomizingOfferChoices.filter(c => c.name)
  };

  if (offerCustomizerModalInstance) {
    offerCustomizerModalInstance.hide();
  }

  renderOffersModalTable();
  showToast('تم حفظ وتطبيق التخصيصات على العرض بنجاح! 🎉');
}

// ==========================================================================
// 5. ATOMIC SAVE OF BLOCKS & OFFERS
// ==========================================================================

async function saveLandingPageBlocksAndOffers() {
  if (!currentEditingNodeId) {
    alert('يرجى اختيار صفحة هبوط أولاً');
    return;
  }

  try {
    // 1. Save Blocks
    const resBlocks = await fetch(`/api/admin/funnels/blocks/${currentEditingNodeId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ blocks: currentBlocks })
    });
    if (!resBlocks.ok) {
      const err = await resBlocks.json();
      throw new Error(err.error || 'فشل حفظ الكتل');
    }

    // 2. Save Offers
    const resOffers = await fetch(`/api/admin/funnels/offers/${currentEditingNodeId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ offers: currentOffers })
    });
    if (!resOffers.ok) {
      const err = await resOffers.json();
      throw new Error(err.error || 'فشل حفظ باقات العروض');
    }

    showToast('تم حفظ ونشر جميع تعديلات صفحة الهبوط بنجاح! 🎉');
    await loadFunnelsTree();

  } catch (err) {
    alert(`حدث خطأ أثناء الحفظ: ${err.message}`);
  }
}
