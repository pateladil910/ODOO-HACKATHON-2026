// Dashboard controller logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Guard route: redirect if not authenticated
  if (!window.auth.guardRoute()) return;

  // Render active user details in UI
  window.auth.renderUserProfile();

  // State Management
  let allItems = [];
  let editingItemId = null;

  // DOM Elements Selection
  const itemsTableBody = document.getElementById('items-table-body');
  const searchInput = document.getElementById('search-input');
  const btnCreateItem = document.getElementById('btn-create-item');
  const btnLogout = document.getElementById('btn-logout');
  
  // Modals DOM Selection
  const itemModal = document.getElementById('item-modal');
  const itemForm = document.getElementById('item-form');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  
  // Metrics DOM Selection
  const metricTotalCount = document.getElementById('metric-total-count');
  const metricActiveCount = document.getElementById('metric-active-count');
  const metricInactiveCount = document.getElementById('metric-inactive-count');
  const metricDbStatus = document.getElementById('metric-db-status');
  
  // Mobile Sidebar Toggle selection
  const btnMenuToggle = document.getElementById('btn-menu-toggle');
  const sidebar = document.getElementById('sidebar');

  /**
   * Fetch health and update DB metric status
   */
  const loadDatabaseHealth = async () => {
    try {
      const health = await window.api.get('/health');
      const dbMetric = document.getElementById('metric-db-status');
      if (dbMetric) {
        dbMetric.textContent = health.database === 'CONNECTED' ? 'ONLINE' : 'OFFLINE';
        dbMetric.style.color = health.database === 'CONNECTED' ? 'var(--status-success)' : 'var(--status-error)';
      }
    } catch (error) {
      if (metricDbStatus) {
        metricDbStatus.textContent = 'OFFLINE';
        metricDbStatus.style.color = 'var(--status-error)';
      }
    }
  };

  /**
   * Calculate and render numeric metrics
   */
  const updateMetrics = (items) => {
    if (!metricTotalCount) return;
    
    const total = items.length;
    const active = items.filter(i => i.is_active).length;
    const inactive = total - active;

    metricTotalCount.textContent = total;
    metricActiveCount.textContent = active;
    metricInactiveCount.textContent = inactive;
  };

  /**
   * Fetch items from API and render list table
   */
  const loadItems = async (searchQuery = '') => {
    try {
      const endpoint = searchQuery ? `/items?search=${encodeURIComponent(searchQuery)}` : '/items';
      allItems = await window.api.get(endpoint);
      
      renderItemsTable(allItems);
      updateMetrics(allItems);
    } catch (error) {
      console.error('Failed to load items', error);
    }
  };

  /**
   * Draw tabular rows dynamically
   */
  const renderItemsTable = (items) => {
    if (!itemsTableBody) return;
    itemsTableBody.innerHTML = '';

    if (items.length === 0) {
      itemsTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-dimmed); padding: var(--space-xl);">
            No records found. Click "Create Item" to add data.
          </td>
        </tr>
      `;
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      
      const badgeClass = item.is_active ? 'badge-active' : 'badge-inactive';
      const badgeText = item.is_active ? 'Active' : 'Inactive';
      const createdDate = new Date(item.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Parse metadata category safely
      let category = 'N/A';
      if (item.metadata && item.metadata.category) {
        category = item.metadata.category;
      }

      tr.innerHTML = `
        <td>#${item.id}</td>
        <td>
          <div style="font-weight: 600; color: #fff;">${escapeHTML(item.title)}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHTML(item.description || '')}</div>
        </td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td><span style="font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${escapeHTML(category)}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">
          <div>${escapeHTML(item.creator_email || 'System')}</div>
          <div style="font-size: 0.75rem; color: var(--text-dimmed);">${createdDate}</div>
        </td>
        <td>
          <div style="display: flex; gap: var(--space-sm);">
            <button class="btn btn-glass btn-edit" data-id="${item.id}" style="padding: 0.35rem 0.6rem; font-size: 0.8rem;">Edit</button>
            <button class="btn btn-danger btn-delete" data-id="${item.id}" style="padding: 0.35rem 0.6rem; font-size: 0.8rem;">Delete</button>
          </div>
        </td>
      `;

      itemsTableBody.appendChild(tr);
    });

    // Attach actions event listeners
    attachTableActionListeners();
  };

  /**
   * Bind event listeners to edit/delete buttons inside data rows
   */
  const attachTableActionListeners = () => {
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete item #${id}? (Requires administrator privileges)`)) {
          try {
            await window.api.delete(`/items/${id}`);
            window.api.showToast(`Item #${id} deleted successfully.`, 'success');
            loadItems(searchInput.value);
          } catch (error) {
            // Error handled globally
          }
        }
      });
    });

    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        editingItemId = id;
        
        try {
          const item = await window.api.get(`/items/${id}`);
          
          // Pre-fill inputs
          document.getElementById('item-title').value = item.title;
          document.getElementById('item-desc').value = item.description || '';
          document.getElementById('item-active').checked = item.is_active;
          document.getElementById('item-category').value = (item.metadata && item.metadata.category) ? item.metadata.category : 'general';
          
          // Update Modal title and show
          modalTitle.textContent = `Edit Item #${id}`;
          itemModal.classList.add('active');
        } catch (error) {
          console.error(error);
        }
      });
    });
  };

  // --- Modal Control Functions ---
  const closeModal = () => {
    itemModal.classList.remove('active');
    itemForm.reset();
    editingItemId = null;
  };

  // Open modal for Create
  if (btnCreateItem) {
    btnCreateItem.addEventListener('click', () => {
      editingItemId = null;
      modalTitle.textContent = 'Create New Item';
      itemModal.classList.add('active');
    });
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  // Close modal on escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && itemModal.classList.contains('active')) {
      closeModal();
    }
  });

  // --- Form submission ---
  if (itemForm) {
    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('item-title').value;
      const description = document.getElementById('item-desc').value;
      const is_active = document.getElementById('item-active').checked;
      const category = document.getElementById('item-category').value;

      const payload = {
        title,
        description,
        is_active,
        metadata: {
          category
        }
      };

      try {
        if (editingItemId) {
          // Update action
          await window.api.put(`/items/${editingItemId}`, payload);
          window.api.showToast(`Item #${editingItemId} updated successfully.`, 'success');
        } else {
          // Create action
          await window.api.post('/items', payload);
          window.api.showToast('New item created successfully.', 'success');
        }
        closeModal();
        loadItems(searchInput.value);
      } catch (error) {
        // Error toast will show automatically
      }
    });
  }

  // --- Search filter listener (Debounced search API query) ---
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadItems(e.target.value);
      }, 300);
    });
  }

  // --- Logout functionality ---
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      window.auth.logout();
    });
  }

  // --- Mobile Sidebar toggling ---
  if (btnMenuToggle && sidebar) {
    btnMenuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });

    // Close sidebar clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && 
          !sidebar.contains(e.target) && 
          !btnMenuToggle.contains(e.target) && 
          sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  }

  // Simple HTML Escaping to prevent XSS attacks
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // --- System Initialization ---
  loadDatabaseHealth();
  loadItems();
  // Poll database status every 10 seconds
  setInterval(loadDatabaseHealth, 10000);
});
