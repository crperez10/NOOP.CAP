const state = {
  user: null,
  clients: [],
  items: [],
  selectedClient: "",
  selectedCategories: [],
  selectedSubcategories: [],
  selectedImportance: [],
  clientSearch: "",
  sort: "alpha",
  sortDirection: "asc",
  sortExplicit: false,
  page: 1,
  totalItems: 0,
  pageSize: 10,
  hasMore: false,
  view: "table",
  files: [],
  clientFiles: [],
  editingItem: null,
  richSelection: null,
};

const ROLE_LABELS = {
  admin: "Administrador",
  collaborator: "Colaborador",
  viewer: "Invitado",
};

const DEFAULT_TABLE_SORT = "alpha";
const DEFAULT_TABLE_DIRECTION = "asc";

const els = {
  app: document.querySelector("#app"),
  loginView: document.querySelector("#login-view"),
  toast: document.querySelector("#toast"),
  clientList: document.querySelector("#client-list"),
  clientSearchInput: document.querySelector("#client-search-input"),
  userSummary: document.querySelector("#user-summary"),
  resultCount: document.querySelector("#result-count"),
  cardsView: document.querySelector("#cards-view"),
  tableView: document.querySelector("#table-view"),
  tbody: document.querySelector("#items-tbody"),
  tableHead: document.querySelector("thead"),
  resetTableBtn: document.querySelector("#reset-table-btn"),
  loader: document.querySelector("#loader"),
  paginationControls: document.querySelector("#pagination-controls"),
  prevPageBtn: document.querySelector("#prev-page-btn"),
  nextPageBtn: document.querySelector("#next-page-btn"),
  pageStatus: document.querySelector("#page-status"),
  keywordFilter: document.querySelector("#keyword-filter"),
  categoryOptions: document.querySelector("#category-options"),
  subcategoryOptions: document.querySelector("#subcategory-options"),
  fromFilter: document.querySelector("#from-filter"),
  toFilter: document.querySelector("#to-filter"),
  filterMenuBtn: document.querySelector("#filter-menu-btn"),
  filterPopover: document.querySelector("#filter-popover"),
  clearFiltersBtn: document.querySelector("#clear-filters-btn"),
  cardViewBtn: document.querySelector("#card-view-btn"),
  tableViewBtn: document.querySelector("#table-view-btn"),
  themeToggle: document.querySelector("#theme-toggle"),
  clientDetailPanel: document.querySelector("#client-detail-panel"),
  pageHeading: document.querySelector("#page-heading"),
  hamburgerBtn: document.querySelector("#hamburger-btn"),
  hamburgerMenu: document.querySelector("#hamburger-menu"),
  clientsAdminDialog: document.querySelector("#clients-admin-dialog"),
  clientsAdminList: document.querySelector("#clients-admin-list"),
  adminNewClientBtn: document.querySelector("#admin-new-client-btn"),
  clientDialog: document.querySelector("#client-dialog"),
  clientForm: document.querySelector("#client-form"),
  clientId: document.querySelector("#client-id"),
  clientName: document.querySelector("#client-name"),
  clientContractType: document.querySelector("#client-contract-type"),
  addValidatorAccessBtn: document.querySelector("#add-validator-access-btn"),
  validatorAccessList: document.querySelector("#validator-access-list"),
  clientColor: document.querySelector("#client-color"),
  clientNotes: document.querySelector("#client-notes"),
  clientFiles: document.querySelector("#client-files"),
  clientFilePreview: document.querySelector("#client-file-preview"),
  itemDialog: document.querySelector("#item-dialog"),
  itemForm: document.querySelector("#item-form"),
  itemDialogTitle: document.querySelector("#item-dialog-title"),
  itemId: document.querySelector("#item-id"),
  itemClient: document.querySelector("#item-client"),
  itemClientList: document.querySelector("#item-client-list"),
  itemSubject: document.querySelector("#item-subject"),
  itemDate: document.querySelector("#item-date"),
  itemImportance: document.querySelector("#item-importance"),
  itemCategory: document.querySelector("#item-category"),
  itemSubcategory: document.querySelector("#item-subcategory"),
  itemDescriptionEditor: document.querySelector("#item-description-editor"),
  itemDescription: document.querySelector("#item-description"),
  richFontFamily: document.querySelector("#rich-font-family"),
  richFontSize: document.querySelector("#rich-font-size"),
  richTextColor: document.querySelector("#rich-text-color"),
  richHighlightColor: document.querySelector("#rich-highlight-color"),
  itemFiles: document.querySelector("#item-files"),
  dropZone: document.querySelector("#drop-zone"),
  filePreview: document.querySelector("#file-preview"),
  usersDialog: document.querySelector("#users-dialog"),
  settingsTabs: document.querySelector("#settings-tabs"),
  usersList: document.querySelector("#users-list"),
  userCreateForm: document.querySelector("#user-create-form"),
  userName: document.querySelector("#user-name"),
  userEmail: document.querySelector("#user-email"),
  userPassword: document.querySelector("#user-password"),
  userRole: document.querySelector("#user-role"),
  userEditDialog: document.querySelector("#user-edit-dialog"),
  userEditForm: document.querySelector("#user-edit-form"),
  editUserId: document.querySelector("#edit-user-id"),
  editUserName: document.querySelector("#edit-user-name"),
  editUserEmail: document.querySelector("#edit-user-email"),
  editUserRole: document.querySelector("#edit-user-role"),
  editUserStatus: document.querySelector("#edit-user-status"),
  editUserPassword: document.querySelector("#edit-user-password"),
  editUserPasswordMeta: document.querySelector("#edit-user-password-meta"),
  passwordForm: document.querySelector("#password-form"),
  currentPassword: document.querySelector("#current-password"),
  newPassword: document.querySelector("#new-password"),
  accountDialog: document.querySelector("#account-dialog"),
  accountForm: document.querySelector("#account-form"),
  accountContent: document.querySelector("#account-content"),
  accountAvatar: document.querySelector("#account-avatar"),
  accountAvatarPreview: document.querySelector("#account-avatar-preview"),
  itemDetailDialog: document.querySelector("#item-detail-dialog"),
  itemDetailContent: document.querySelector("#item-detail-content"),
  guestLoginBtn: document.querySelector("#guest-login-btn"),
  nativeLoginForm: document.querySelector("#native-login-form"),
  nativeLoginUser: document.querySelector("#native-login-user"),
  nativeLoginPassword: document.querySelector("#native-login-password"),
};

boot();

async function boot() {
  bindEvents();
  document.body.classList.toggle("light", localStorage.getItem("theme") === "light");

  const session = await api("/api/auth/me", { authOptional: true });
  state.user = session.user;

  if (!state.user) {
    els.loginView.hidden = false;
    await loadLoginUsers();
    return;
  }

  els.app.hidden = false;
  syncRoleUI();
  await loadWorkspaceData();
}

function bindEvents() {
  const filterInputs = [
    els.keywordFilter,
    els.fromFilter,
    els.toFilter,
  ];

  filterInputs.forEach((input) => input.addEventListener("input", debounce(() => loadItems(true), 250)));
  els.clientSearchInput.addEventListener("input", () => {
    state.clientSearch = els.clientSearchInput.value.trim().toLowerCase();
    renderClients();
  });
  els.filterMenuBtn.addEventListener("click", toggleFilterPopover);
  els.filterPopover.addEventListener("change", handleFilterChange);
  els.clearFiltersBtn.addEventListener("click", clearAdvancedFilters);
  els.prevPageBtn.addEventListener("click", () => goToPage(state.page - 1));
  els.nextPageBtn.addEventListener("click", () => goToPage(state.page + 1));
  els.tableHead.addEventListener("click", handleTableSort);
  els.resetTableBtn.addEventListener("click", resetTableFilters);
  els.cardViewBtn.addEventListener("click", () => setView("cards"));
  els.tableViewBtn.addEventListener("click", () => setView("table"));
  els.themeToggle.addEventListener("click", toggleTheme);
  els.guestLoginBtn.addEventListener("click", guestLogin);
  els.nativeLoginForm.addEventListener("submit", nativeLogin);
  els.hamburgerBtn.addEventListener("click", toggleHamburgerMenu);
  els.hamburgerMenu.addEventListener("click", handleMenuClick);
  els.adminNewClientBtn.addEventListener("click", () => openClientDialog());
  els.addValidatorAccessBtn.addEventListener("click", () => addValidatorAccessRow());
  els.clientsAdminList.addEventListener("click", handleClientsAdminClick);
  els.clientForm.addEventListener("submit", saveClient);
  els.clientForm.addEventListener("click", handleClientFormTools);
  els.clientFiles.addEventListener("change", (event) => setClientFiles([...event.target.files]));
  els.itemForm.addEventListener("submit", saveItem);
  els.userCreateForm.addEventListener("submit", createNativeUser);
  els.userEditForm.addEventListener("submit", saveEditedUser);
  els.passwordForm.addEventListener("submit", changePassword);
  els.settingsTabs.addEventListener("click", handleSettingsTabClick);
  els.accountForm.addEventListener("submit", saveProfile);
  els.accountAvatar.addEventListener("change", previewAccountAvatar);
  els.itemForm.addEventListener("click", handleRichToolbarClick);
  els.itemDescriptionEditor.addEventListener("keyup", saveRichSelection);
  els.itemDescriptionEditor.addEventListener("mouseup", saveRichSelection);
  els.itemDescriptionEditor.addEventListener("input", () => {
    saveRichSelection();
    syncRichDescription();
  });
  els.richFontFamily.addEventListener("change", () => applyRichStyle("fontFamily", els.richFontFamily.value));
  els.richFontSize.addEventListener("change", () => applyRichStyle("fontSize", els.richFontSize.value));
  els.richTextColor.addEventListener("input", () => applyRichStyle("color", els.richTextColor.value));
  els.richHighlightColor.addEventListener("input", () => applyRichStyle("backgroundColor", els.richHighlightColor.value));
  els.itemFiles.addEventListener("change", (event) => setFiles([...event.target.files]));
  els.dropZone.addEventListener("dragover", handleDragOver);
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("dragging"));
  els.dropZone.addEventListener("drop", handleDrop);

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
  });

  document.addEventListener("click", (event) => {
    if (!els.hamburgerMenu.contains(event.target) && !els.hamburgerBtn.contains(event.target)) {
      closeHamburgerMenu();
    }
    if (!els.filterPopover.contains(event.target) && !els.filterMenuBtn.contains(event.target)) {
      closeFilterPopover();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.user) {
      refreshWorkspaceData().catch((error) => notify(error.message));
    }
  });
}

async function loadClients() {
  if (!hasClientAccess()) {
    state.clients = [];
    renderClients();
    syncClientSelect();
    return;
  }

  const data = await api("/api/clients");
  state.clients = sortClientsByName(data.clients);
  renderClients();
  syncClientSelect();
  if (state.user) syncRoleUI();
}

async function loadItems(reset = true) {
  if (!hasClientAccess()) {
    state.items = [];
    state.hasMore = false;
    state.totalItems = 0;
    els.loader.hidden = true;
    renderItems();
    return;
  }

  if (reset) {
    state.page = 1;
  }

  els.loader.hidden = false;
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.pageSize),
    sort: state.sort,
    direction: state.sortDirection,
    t: String(Date.now()),
  });

  if (state.selectedClient) params.set("client", state.selectedClient);
  if (els.keywordFilter.value.trim()) params.set("keyword", els.keywordFilter.value.trim());
  if (state.selectedCategories.length) params.set("category", state.selectedCategories.join(","));
  if (state.selectedSubcategories.length) params.set("subcategory", state.selectedSubcategories.join(","));
  if (state.selectedImportance.length) params.set("importance", state.selectedImportance.join(","));
  if (els.fromFilter.value) params.set("from", els.fromFilter.value);
  if (els.toFilter.value) params.set("to", els.toFilter.value);

  try {
    const data = await api(`/api/items?${params}`);
    state.items = data.items;
    state.hasMore = data.hasMore;
    state.page = data.page;
    state.totalItems = data.total;
    updateFilterOptions();
    renderItems(data.total);
  } finally {
    els.loader.hidden = true;
  }
}

function goToPage(page) {
  const totalPages = totalPagesForItems();
  const nextPage = Math.min(Math.max(page, 1), totalPages);
  if (nextPage === state.page) return;
  state.page = nextPage;
  loadItems(false);
}

function handleTableSort(event) {
  const button = event.target.closest("[data-table-sort]");
  if (!button) return;
  const nextSort = button.dataset.tableSort;
  state.sortDirection = state.sort === nextSort
    ? (state.sortDirection === "desc" ? "asc" : "desc")
    : "asc";
  state.sort = nextSort;
  state.sortExplicit = true;
  syncSortIndicators();
  loadItems(true);
}

function renderClients() {
  const allButton = clientButton({ id: "", name: "Todos los clientes", contractType: "Vista global", color: "#22d3ee", itemCount: totalClientItemCount() });
  const visibleClients = state.clientSearch
    ? state.clients.filter((client) => clientMatchesSearch(client, state.clientSearch))
    : state.clients;
  els.clientList.innerHTML = allButton + visibleClients.map(clientButton).join("");

  els.clientList.querySelectorAll("[data-client-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClient = button.dataset.clientId;
      state.page = 1;
      loadItems(true);
      renderClients();
    });
  });

  const active = state.clients.find((client) => client.id === state.selectedClient);
  renderClientDetail(active);
  syncPageHeading();
  if (els.clientsAdminDialog.open) renderClientsAdminList();
}

function totalClientItemCount() {
  return state.clients.reduce((total, client) => total + (Number(client.itemCount) || 0), 0);
}

function sortClientsByName(clients = []) {
  return [...clients].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
      numeric: true,
    })
  );
}

function clientMatchesSearch(client, keyword) {
  return [client.name, client.address, client.contractType, client.notes]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function clientButton(client) {
  const active = client.id === state.selectedClient ? "active" : "";
  return `
    <button class="client-row ${active}" type="button" data-client-id="${client.id}">
      <span class="client-dot" style="background:${escapeHtml(client.color)}"></span>
      <span class="client-copy">
        <strong>${escapeHtml(client.name)}</strong>
        <span>${client.itemCount || 0} registros</span>
      </span>
    </button>
  `;
}

function renderClientDetail(client) {
  if (!client) {
    els.clientDetailPanel.hidden = true;
    els.clientDetailPanel.innerHTML = "";
    return;
  }

  els.clientDetailPanel.hidden = false;
  els.clientDetailPanel.innerHTML = `
    <div>
      <p class="eyebrow">Datos generales</p>
      <h3>${escapeHtml(client.name)}</h3>
      <p class="client-description">${escapeHtml(client.notes || "-")}</p>
      <div class="client-detail-actions">
        <button class="secondary-button" type="button" data-client-detail-action>Datos del cliente</button>
        ${client.validatorUrl ? `<a class="secondary-button validator-button" href="${escapeHtml(client.validatorUrl)}" target="_blank" rel="noopener noreferrer">Validador</a>` : ""}
      </div>
    </div>
  `;
  els.clientDetailPanel.querySelector("[data-client-detail-action]")?.addEventListener("click", () => openClientDialog(client, { readonly: !canModifyData() }));
  els.clientDetailPanel.querySelectorAll("[data-copy-secret]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copySecret));
  });
  els.clientDetailPanel.querySelectorAll("[data-toggle-secret]").forEach((button) => {
    button.addEventListener("click", () => toggleSecret(button));
  });
}

function credentialField(label, value, canView) {
  const displayValue = canView ? value : maskSecret(value);
  return `
    <div class="credential-field">
      <strong>${escapeHtml(label)}</strong>
      <code data-secret-value="${escapeHtml(value)}" data-secret-visible="${canView ? "true" : "false"}">${escapeHtml(displayValue)}</code>
      <button class="ghost-button" type="button" data-copy-secret="${escapeHtml(value)}">Copiar</button>
      <button class="ghost-button" type="button" data-toggle-secret>${canView ? "Ocultar" : "Ver"}</button>
    </div>
  `;
}

function syncPageHeading() {
  if (els.pageHeading) els.pageHeading.hidden = Boolean(state.selectedClient);
}

function renderItems(total = state.items.length) {
  els.resultCount.textContent = `${total} ${total === 1 ? "registro" : "registros"}`;
  syncPagination();
  syncSortIndicators();

  if (!state.items.length) {
    els.cardsView.innerHTML = `<article class="record-card"><h3>No hay registros</h3><p class="muted">Crea el primer item o ajusta los filtros.</p></article>`;
    els.tbody.innerHTML = "";
    return;
  }

  els.cardsView.innerHTML = state.items.map(itemCard).join("");
  els.tbody.innerHTML = state.items.map(itemRow).join("");
  bindItemActions();
  if (state.user) syncRoleUI();
}

function syncSortIndicators() {
  document.querySelectorAll("[data-table-sort]").forEach((button) => {
    const active = state.sortExplicit && button.dataset.tableSort === state.sort;
    const arrow = state.sortDirection === "asc" ? "↑" : "↓";
    button.classList.toggle("active", active);
    button.setAttribute("aria-sort", active ? (state.sortDirection === "asc" ? "ascending" : "descending") : "none");
    const indicator = button.querySelector(".sort-indicator");
    if (indicator) indicator.textContent = active ? arrow : "";
  });
}

function syncPagination() {
  const totalPages = totalPagesForItems();
  els.paginationControls.classList.toggle("is-hidden", state.totalItems <= state.pageSize);
  els.pageStatus.textContent = `Hoja ${Math.min(state.page, totalPages)} de ${totalPages}`;
  els.prevPageBtn.disabled = state.page <= 1;
  els.nextPageBtn.disabled = state.page >= totalPages;
}

function totalPagesForItems() {
  return Math.max(Math.ceil(state.totalItems / state.pageSize), 1);
}

function itemCard(item) {
  const client = findClient(item.client);
  const attachments = item.attachments || [];
  return `
    <article class="record-card">
      <header>
        <div>
          <h3>${escapeHtml(item.subject)}</h3>
          <div class="meta-line">${clientLabel(client)} / ${formatDate(item.date)}</div>
        </div>
        <span class="chip importance-${item.importance}">${labelImportance(item.importance)}</span>
      </header>
      <p class="muted">${escapeHtml(plainTextFromHtml(item.description) || "Sin descripcion")}</p>
      <div class="chip-row">
        <span class="chip">${escapeHtml(item.category)}</span>
        ${item.subcategory ? `<span class="chip">${escapeHtml(item.subcategory)}</span>` : ""}
        <span class="chip">${attachments.length} adjuntos</span>
      </div>
      ${attachments.length ? `<div class="file-preview">${attachments.map(attachmentLink).join("")}</div>` : ""}
      <div class="meta-line">${formatDateTime(item.createdAt)}</div>
      <div class="card-actions">
        ${favoriteControl(item)}
        <button class="ghost-button" type="button" data-view="${item.id}">Ver</button>
        <button class="secondary-button role-editor" type="button" data-edit="${item.id}">Editar</button>
        <button class="ghost-button danger-button role-admin" type="button" data-delete="${item.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function itemRow(item) {
  const client = findClient(item.client);
  return `
    <tr>
      <td class="subject-cell"><strong class="table-subject">${escapeHtml(item.subject)}</strong></td>
      <td>${clientLabel(client)}</td>
      <td>${escapeHtml(item.category)}<div class="muted">${escapeHtml(item.subcategory || "")}</div></td>
      <td>${formatDate(item.date)}</td>
      <td><span class="chip importance-${item.importance}">${labelImportance(item.importance)}</span></td>
      <td class="table-actions">
        ${favoriteControl(item)}
        <button class="ghost-button" type="button" data-view="${item.id}">Ver</button>
        <button class="ghost-button role-editor" type="button" data-edit="${item.id}">Editar</button>
        <button class="ghost-button danger-button role-admin" type="button" data-delete="${item.id}">Eliminar</button>
      </td>
    </tr>
  `;
}

function favoriteControl(item) {
  if (canFavoriteData()) {
    return `
      <button class="favorite-star-button ${item.favorite ? "active" : ""}" type="button" data-favorite="${item.id}" title="${item.favorite ? "Quitar favorito" : "Marcar favorito"}" aria-label="${item.favorite ? "Quitar favorito" : "Marcar favorito"}">
        &#9733;
      </button>
    `;
  }

  return item.favorite
    ? `<span class="favorite-star-button active readonly" title="Registro favorito" aria-label="Registro favorito">&#9733;</span>`
    : "";
}

function clientLabel(client) {
  const name = client?.name || "-";
  const color = client?.color || "#94a3b8";
  return `<span class="client-label"><i style="background:${escapeHtml(color)}"></i>${escapeHtml(name)}</span>`;
}

function attachmentLink(file) {
  const isImage = file.mimeType?.startsWith("image/");
  return `
    <a class="attachment-link" href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">
      ${isImage ? `<img src="${escapeHtml(file.url)}" alt="" />` : ""}
      <span>${escapeHtml(file.originalName || "Adjunto")}</span>
      <span>${formatBytes(file.size)}</span>
    </a>
  `;
}

function updateFilterOptions() {
  const categories = unique(state.items.map((item) => item.category));
  const subcategories = unique(state.items.map((item) => item.subcategory));
  state.selectedCategories = state.selectedCategories.filter((value) => categories.includes(value));
  state.selectedSubcategories = state.selectedSubcategories.filter((value) => subcategories.includes(value));
  renderCheckboxOptions(els.categoryOptions, "category-filter", categories, state.selectedCategories);
  renderCheckboxOptions(els.subcategoryOptions, "subcategory-filter", subcategories, state.selectedSubcategories);
  updateFilterButtonLabel();
}

function renderCheckboxOptions(container, name, values, selectedValues) {
  container.innerHTML = values.length
    ? values
        .map(
          (value) => `
            <label>
              <input type="checkbox" name="${name}" value="${escapeHtml(value)}" ${selectedValues.includes(value) ? "checked" : ""} />
              ${escapeHtml(value)}
            </label>
          `
        )
        .join("")
    : `<span class="muted">Sin opciones</span>`;
}

function handleRichToolbarClick(event) {
  const button = event.target.closest("[data-rich-command], [data-rich-block]");
  if (!button) return;

  if (button.dataset.richCommand) {
    applyRichCommand(button.dataset.richCommand);
    return;
  }

  if (button.dataset.richBlock) {
    applyRichCommand("formatBlock", button.dataset.richBlock);
  }
}

function applyRichCommand(command, value = null) {
  restoreRichSelection();
  els.itemDescriptionEditor.focus();
  document.execCommand(command, false, value);
  syncRichDescription();
}

function applyRichStyle(property, value) {
  if (!value) return;
  restoreRichSelection();
  els.itemDescriptionEditor.focus();
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (!els.itemDescriptionEditor.contains(range.commonAncestorContainer)) return;

  const span = document.createElement("span");
  span.style[property] = value;
  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.addRange(nextRange);
  saveRichSelection();
  syncRichDescription();
}

function saveRichSelection() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!els.itemDescriptionEditor.contains(range.commonAncestorContainer)) return;
  state.richSelection = range.cloneRange();
}

function restoreRichSelection() {
  if (!state.richSelection) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(state.richSelection);
}

function setRichDescription(value) {
  const safeHtml = sanitizeRichText(value);
  els.itemDescriptionEditor.innerHTML = safeHtml;
  els.itemDescription.value = safeHtml;
}

function syncRichDescription() {
  els.itemDescription.value = sanitizeRichText(els.itemDescriptionEditor.innerHTML);
}

function bindItemActions() {
  syncRoleUI();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => openItemDetail(state.items.find((item) => item.id === button.dataset.view)));
  });
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openItemDialog(state.items.find((item) => item.id === button.dataset.edit)));
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.delete));
  });
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(button.dataset.favorite));
  });
}

function openClientDialog(client = null, options = {}) {
  const readonly = Boolean(options.readonly);
  state.clientFiles = [];
  const clientFormTitle = els.clientForm.querySelector("h3");
  if (clientFormTitle) clientFormTitle.textContent = readonly ? "Datos del cliente" : "Cliente";
  const validatorAccesses = client?.validatorAccesses || legacyValidatorAccesses(client);
  const hasSavedValidatorAccesses = validatorAccesses.some((access) => access.title || access.url || access.user || access.password);
  els.clientId.value = client?.id || "";
  els.clientName.value = client?.name || "";
  els.clientContractType.value = client?.contractType || "";
  renderValidatorAccessRows(validatorAccesses);
  els.clientColor.value = client?.color || "#6d5dfc";
  els.clientNotes.value = client?.notes || "";
  els.clientFiles.value = "";
  setClientFormReadonly(readonly);
  renderClientFilePreview();
  els.clientDialog.showModal();
  if (!hasSavedValidatorAccesses) clearValidatorAutofillLater();
}

function setClientFormReadonly(readonly) {
  els.clientForm.querySelectorAll("input, textarea, select").forEach((field) => {
    if (field.type !== "hidden") field.disabled = readonly;
  });
  els.clientForm.querySelector("button[type='submit']").hidden = readonly;
  els.addValidatorAccessBtn.hidden = readonly;
  els.clientForm.querySelectorAll("[data-remove-validator-access]").forEach((button) => (button.hidden = readonly));
}

function legacyValidatorAccesses(client) {
  if (!client || !(client.validatorUrl || client.validatorUser || client.validatorPassword)) return [];
  return [{
    title: "Validador",
    url: client.validatorUrl || "",
    user: client.validatorUser || "",
    password: client.validatorPassword || "",
  }];
}

function renderValidatorAccessRows(accesses = []) {
  const rows = accesses.length ? accesses : [{ title: "Validador", url: "", user: "", password: "" }];
  els.validatorAccessList.innerHTML = rows.map(validatorAccessRow).join("");
}

function addValidatorAccessRow(access = { title: "", url: "", user: "", password: "" }) {
  els.validatorAccessList.insertAdjacentHTML("beforeend", validatorAccessRow(access));
}

function validatorAccessRow(access = {}) {
  return `
    <article class="validator-access-card">
      <div class="validator-access-card-heading">
        <strong>Acceso</strong>
        <button class="ghost-button" type="button" data-remove-validator-access>Quitar</button>
      </div>
      <div class="validator-access-grid">
        <label>Titulo<input data-validator-field="title" autocomplete="off" placeholder="Ej: Portal principal" value="${escapeHtml(access.title || "")}" /></label>
        <label>URL<input data-validator-field="url" type="url" autocomplete="off" placeholder="https://sitio.com" value="${escapeHtml(access.url || "")}" /></label>
        <label>Usuario<input data-validator-field="user" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Usuario" value="${escapeHtml(access.user || "")}" /></label>
        <label>Contraseña
          <span class="password-inline">
            <input data-validator-field="password" type="password" autocomplete="new-password" placeholder="Contraseña" value="${escapeHtml(access.password || "")}" />
            <button class="ghost-button icon-eye-button" type="button" data-toggle-client-field="password" aria-label="Mostrar contraseña"><span class="eye-icon"></span></button>
          </span>
        </label>
      </div>
      <div class="credential-actions">
        <button class="ghost-button" type="button" data-copy-client-field="user">Copiar usuario</button>
        <button class="ghost-button" type="button" data-copy-client-field="password">Copiar contraseña</button>
      </div>
    </article>
  `;
}

function clearValidatorAutofillLater() {
  [0, 80, 250, 600].forEach((delay) => {
    setTimeout(() => {
      els.validatorAccessList.querySelectorAll("[data-validator-field]").forEach((field) => {
        field.value = "";
      });
    }, delay);
  });
}

function readValidatorAccessRows() {
  return [...els.validatorAccessList.querySelectorAll(".validator-access-card")]
    .map((card) => ({
      title: card.querySelector('[data-validator-field="title"]')?.value.trim() || "",
      url: card.querySelector('[data-validator-field="url"]')?.value.trim() || "",
      user: card.querySelector('[data-validator-field="user"]')?.value.trim() || "",
      password: card.querySelector('[data-validator-field="password"]')?.value || "",
    }))
    .filter((access) => access.title || access.url || access.user || access.password);
}

function handleClientFormTools(event) {
  const removeButton = event.target.closest("[data-remove-validator-access]");
  if (removeButton) {
    removeButton.closest(".validator-access-card")?.remove();
    if (!els.validatorAccessList.querySelector(".validator-access-card")) addValidatorAccessRow();
    return;
  }

  const copyButton = event.target.closest("[data-copy-client-field]");
  if (copyButton) {
    const scope = copyButton.closest(".validator-access-card") || els.clientForm;
    const field = scope.querySelector(`[data-validator-field="${copyButton.dataset.copyClientField}"]`);
    copyText(field?.value || "");
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-client-field]");
  if (toggleButton) {
    const scope = toggleButton.closest(".validator-access-card") || els.clientForm;
    const field = scope.querySelector(`[data-validator-field="${toggleButton.dataset.toggleClientField}"]`);
    if (!field) return;
    field.type = field.type === "password" ? "text" : "password";
    toggleButton.classList.toggle("visible", field.type === "text");
    toggleButton.setAttribute("aria-label", field.type === "password" ? "Mostrar contraseña" : "Ocultar contraseña");
  }
}

async function saveClient(event) {
  event.preventDefault();
  if (!canModifyData()) return;
  try {
    const id = els.clientId.value;
    const payload = new FormData();
    payload.set("name", els.clientName.value);
    payload.set("industry", "");
    payload.set("address", "");
    payload.set("contractType", els.clientContractType.value);
    const accesses = readValidatorAccessRows();
    const primaryAccess = accesses[0] || {};
    payload.set("validatorUrl", primaryAccess.url || "");
    payload.set("validatorUser", primaryAccess.user || "");
    payload.set("validatorPassword", primaryAccess.password || "");
    payload.set("validatorAccesses", JSON.stringify(accesses));
    payload.set("contacts", JSON.stringify([]));
    payload.set("color", els.clientColor.value);
    payload.set("notes", els.clientNotes.value);
    state.clientFiles.forEach((file) => payload.append("attachments", file));

    await api(id ? `/api/clients/${id}` : "/api/clients", {
      method: id ? "PATCH" : "POST",
      body: payload,
      authRedirect: false,
    });
    els.clientDialog.close();
    notify("Cliente guardado.");
    await refreshWorkspaceData();
  } catch (error) {
    notify(error.message);
  }
}

async function deleteActiveClient() {
  if (!canModifyData()) return;
  const client = getActiveClient();
  if (!client) return;
  if (!confirm(`Eliminar el cliente "${client.name}" y todos sus registros?`)) return;
  await api(`/api/clients/${client.id}`, { method: "DELETE" });
  state.selectedClient = "";
  notify("Cliente eliminado.");
  await refreshWorkspaceData();
}

function openClientsAdminDialog() {
  renderClientsAdminList();
  els.clientsAdminDialog.showModal();
}

function renderClientsAdminList() {
  if (!els.clientsAdminList) return;
  const role = state.user?.role || "viewer";
  els.clientsAdminList.innerHTML = state.clients.length
    ? state.clients
        .map(
          (client) => `
            <article class="admin-row client-admin-row">
              <span class="client-dot client-admin-dot" style="background:${escapeHtml(client.color)}"></span>
              <div class="client-admin-copy">
                <strong>${escapeHtml(client.name)}</strong>
                <span>${escapeHtml(client.contractType || "Sin contrato")} / ${client.itemCount || 0} registros</span>
                <small>${escapeHtml(client.validatorUrl || "Sin validador")}</small>
              </div>
              <div class="admin-row-actions">
                ${
                  canModifyData()
                    ? `<button class="secondary-button" type="button" data-client-edit="${client.id}">Modificar</button>`
                    : ""
                }
                ${role === "admin" ? `<button class="ghost-button danger-button" type="button" data-client-delete="${client.id}">Eliminar</button>` : ""}
              </div>
            </article>
          `
        )
        .join("")
    : `<article class="admin-row"><div><strong>No hay clientes</strong><div class="muted">Agrega el primer cliente desde esta ventana.</div></div></article>`;
}

async function handleClientsAdminClick(event) {
  const editId = event.target.dataset.clientEdit;
  const deleteId = event.target.dataset.clientDelete;

  if (editId && canModifyData()) {
    openClientDialog(state.clients.find((client) => client.id === editId));
  }

  if (deleteId) {
    const client = state.clients.find((item) => item.id === deleteId);
    if (!client || !confirm(`Eliminar el cliente "${client.name}" y todos sus registros?`)) return;
    await api(`/api/clients/${deleteId}`, { method: "DELETE" });
    if (state.selectedClient === deleteId) state.selectedClient = "";
    notify("Cliente eliminado.");
    await refreshWorkspaceData();
  }
}

function openItemDialog(item = null) {
  if (!canModifyData()) return;
  state.editingItem = item;
  state.files = [];
  els.itemDialogTitle.textContent = item ? "Editar registro" : "Nuevo registro";
  els.itemId.value = item?.id || "";
  setSelectedItemClients(item ? [item.client] : [state.selectedClient || state.clients[0]?.id].filter(Boolean));
  els.itemSubject.value = item?.subject || "";
  els.itemDate.value = item?.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  els.itemImportance.value = item?.importance || "media";
  els.itemCategory.value = item?.category || "";
  els.itemSubcategory.value = item?.subcategory || "";
  setRichDescription(item?.description || "");
  els.itemFiles.value = "";
  renderFilePreview();
  els.itemDialog.showModal();
}

async function saveItem(event) {
  event.preventDefault();
  if (!canModifyData()) return;
  const id = els.itemId.value;
  const formData = new FormData();
  const selectedClients = getSelectedItemClients();
  if (!selectedClients.length) {
    notify("Selecciona al menos un cliente.");
    return;
  }
  const primaryClient = id && selectedClients.includes(String(state.editingItem?.client)) ? state.editingItem.client : selectedClients[0];
  formData.set("client", primaryClient);
  formData.set("clients", JSON.stringify(selectedClients));
  formData.set("subject", els.itemSubject.value);
  formData.set("date", els.itemDate.value);
  formData.set("importance", els.itemImportance.value);
  formData.set("category", els.itemCategory.value);
  formData.set("subcategory", els.itemSubcategory.value);
  syncRichDescription();
  formData.set("description", els.itemDescription.value);
  state.files.forEach((file) => formData.append("attachments", file));

  await api(id ? `/api/items/${id}` : "/api/items", {
    method: id ? "PATCH" : "POST",
    body: formData,
  });

  els.itemDialog.close();
  notify(selectedClients.length > 1 ? "Registros guardados." : "Registro guardado.");
  await refreshWorkspaceData();
}

async function deleteItem(id) {
  if (!canModifyData()) return;
  if (!confirm("Eliminar este registro? Esta accion solo esta permitida para admins.")) return;
  await api(`/api/items/${id}`, { method: "DELETE" });
  notify("Registro eliminado.");
  await refreshWorkspaceData();
}

async function toggleFavorite(id) {
  if (!canFavoriteData()) return;
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  await api(`/api/items/${id}/favorite`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorite: !item.favorite }),
  });
  notify(!item.favorite ? "Registro marcado como favorito." : "Registro quitado de favoritos.");
  await loadItems(true);
}

async function openUsersDialog() {
  const isAdmin = state.user?.role === "admin";
  switchSettingsTab(isAdmin ? "create-users" : "password");

  if (!isAdmin) {
    if (!els.usersDialog.open) els.usersDialog.showModal();
    return;
  }

  const data = await api("/api/auth/users");
  els.usersList.innerHTML = data.users
    .map(
      (user) => `
        <article class="user-admin-row">
          <div>
            <strong>${escapeHtml(user.name)}</strong>
          </div>
          <div class="admin-row-actions">
            <button class="secondary-button" type="button" data-user-edit="${user.id}">Editar</button>
            <button class="ghost-button danger-button" type="button" data-user-delete="${user.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");

  els.usersList.querySelectorAll("[data-user-edit]").forEach((button) => {
    button.addEventListener("click", () => openUserEditDialog(data.users.find((user) => user.id === button.dataset.userEdit)));
  });
  els.usersList.querySelectorAll("[data-user-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.userDelete));
  });

  if (!els.usersDialog.open) els.usersDialog.showModal();
}

function openUserEditDialog(user) {
  if (!user) return;
  els.editUserId.value = user.id;
  els.editUserName.value = user.name;
  els.editUserEmail.value = user.email;
  els.editUserRole.value = user.role;
  els.editUserStatus.value = user.status || "active";
  els.editUserPassword.value = "";
  els.editUserPasswordMeta.textContent = `Ultima modificacion: ${user.passwordUpdatedAt ? formatDateTime(user.passwordUpdatedAt) : "-"}`;
  els.userEditDialog.showModal();
}

async function saveEditedUser(event) {
  event.preventDefault();
  try {
    await api(`/api/auth/users/${els.editUserId.value}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: els.editUserName.value,
        email: els.editUserEmail.value,
        role: els.editUserRole.value,
        status: els.editUserStatus.value,
        password: els.editUserPassword.value,
      }),
    });
    els.userEditDialog.close();
    notify("Usuario actualizado.");
    await openUsersDialog();
  } catch (error) {
    notify(error.message);
  }
}

async function deleteUser(userId) {
  if (!confirm("Eliminar este usuario?")) return;
  try {
    await api(`/api/auth/users/${userId}`, { method: "DELETE" });
    notify("Usuario eliminado.");
    await openUsersDialog();
  } catch (error) {
    notify(error.message);
  }
}

function handleSettingsTabClick(event) {
  const tab = event.target.dataset.settingsTab;
  if (!tab) return;
  switchSettingsTab(tab);
}

function switchSettingsTab(tab) {
  document.querySelectorAll("[data-settings-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsTab === tab);
  });
  document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.settingsPanel !== tab;
  });
}

async function createNativeUser(event) {
  event.preventDefault();
  try {
    await api("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: els.userName.value,
        email: els.userEmail.value,
        password: els.userPassword.value,
        role: els.userRole.value,
      }),
    });

    els.userCreateForm.reset();
    notify("Usuario creado.");
    await openUsersDialog();
  } catch (error) {
    notify(error.message);
  }
}

function syncClientSelect() {
  els.itemClient.innerHTML = state.clients
    .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`)
    .join("");
  els.itemClientList.innerHTML = state.clients
    .map(
      (client) => `
        <label class="client-check">
          <input type="checkbox" name="item-client-check" value="${client.id}" />
          <span class="client-label"><i style="background:${escapeHtml(client.color || "#94a3b8")}"></i>${escapeHtml(client.name)}</span>
        </label>
      `
    )
    .join("");
}

function getSelectedItemClients() {
  return [...els.itemClientList.querySelectorAll("input:checked")].map((input) => input.value);
}

function setSelectedItemClients(clientIds) {
  const selected = new Set(clientIds.filter(Boolean).map(String));
  els.itemClientList.querySelectorAll("input").forEach((input) => {
    input.checked = selected.has(input.value);
  });
  [...els.itemClient.options].forEach((option) => {
    option.selected = selected.has(option.value);
  });
}

function setFiles(files) {
  state.files = files;
  renderFilePreview();
}

function setClientFiles(files) {
  state.clientFiles = files;
  renderClientFilePreview();
}

function renderClientFilePreview() {
  if (!state.clientFiles.length) {
    els.clientFilePreview.innerHTML = "";
    return;
  }

  els.clientFilePreview.innerHTML = state.clientFiles
    .map((file) => {
      const image = file.type.startsWith("image/") ? `<img src="${URL.createObjectURL(file)}" alt="" />` : "";
      return `<div class="file-pill">${image}<span>${escapeHtml(file.name)}</span><span>${formatBytes(file.size)}</span></div>`;
    })
    .join("");
}

function renderFilePreview() {
  if (!state.files.length) {
    els.filePreview.innerHTML = "";
    return;
  }

  els.filePreview.innerHTML = state.files
    .map((file) => {
      const image = file.type.startsWith("image/") ? `<img src="${URL.createObjectURL(file)}" alt="" />` : "";
      return `<div class="file-pill">${image}<span>${escapeHtml(file.name)}</span><span>${formatBytes(file.size)}</span></div>`;
    })
    .join("");
}

function handleDragOver(event) {
  event.preventDefault();
  els.dropZone.classList.add("dragging");
}

function handleDrop(event) {
  event.preventDefault();
  els.dropZone.classList.remove("dragging");
  setFiles([...event.dataTransfer.files]);
}

function setView(view) {
  state.view = view;
  els.cardsView.hidden = view !== "cards";
  els.tableView.hidden = view !== "table";
  els.cardViewBtn.classList.toggle("active", view === "cards");
  els.tableViewBtn.classList.toggle("active", view === "table");
}

function syncRoleUI() {
  const role = state.user?.role || "viewer";
  const roleLabel = roleLabelFor(role);
  document.querySelectorAll(".role-admin").forEach((el) => (el.hidden = role !== "admin"));
  document.querySelectorAll(".role-editor").forEach((el) => (el.hidden = !canModifyData()));
  document.querySelectorAll(".role-client-access").forEach((el) => (el.hidden = !state.user));
  const avatarField = els.accountAvatar?.closest("label") || els.accountAvatar;
  if (avatarField) avatarField.hidden = role !== "admin";
  const accountSubmit = els.accountForm?.querySelector("button[type='submit']");
  if (accountSubmit) accountSubmit.hidden = role !== "admin";
  els.userSummary.innerHTML = `
    <span class="avatar">${avatarMarkup(state.user)}</span>
    <span>
      <strong>${escapeHtml(state.user.name)}</strong>
      <small>${escapeHtml(roleLabel)}</small>
    </span>
  `;
  closeHamburgerMenu();
}

function hasClientAccess() {
  return Boolean(state.user);
}

function canModifyData() {
  return ["admin", "collaborator"].includes(state.user?.role);
}

function canFavoriteData() {
  return state.user?.role === "admin";
}

async function loadWorkspaceData() {
  if (!hasClientAccess()) {
    state.clients = [];
    state.items = [];
    state.selectedClient = "";
    renderClients();
    renderItems();
    syncClientSelect();
    syncPageHeading();
    syncRoleUI();
    return;
  }

  await refreshWorkspaceData();
}

async function refreshWorkspaceData() {
  if (!hasClientAccess()) return;
  await loadClients();
  if (state.selectedClient && !state.clients.some((client) => client.id === state.selectedClient)) {
    state.selectedClient = "";
  }
  await loadItems(true);
  renderClients();
  syncClientSelect();
}

async function enterWorkspace(user) {
  state.user = user;
  els.loginView.hidden = true;
  els.app.hidden = false;
  syncRoleUI();

  const session = await api("/api/auth/me", { authOptional: true, fresh: true });
  if (session.user) {
    state.user = session.user;
    syncRoleUI();
  }

  await refreshWorkspaceData();
}

function roleLabelFor(role) {
  return ROLE_LABELS[role] || role || "Invitado";
}

async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  window.location.reload();
}

async function guestLogin() {
  const data = await api("/api/auth/guest-login", { method: "POST" });
  await enterWorkspace(data.user);
}

async function nativeLogin(event) {
  event.preventDefault();
  const data = await api("/api/auth/native-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: els.nativeLoginUser.value,
      password: els.nativeLoginPassword.value,
    }),
  });
  await enterWorkspace(data.user);
}

async function loadLoginUsers() {
  try {
    const data = await api("/api/auth/login-users", { authOptional: true, fresh: true });
    els.nativeLoginUser.innerHTML = [
      `<option value="">Seleccionar usuario</option>`,
      ...data.users.map((user) => `<option value="${escapeHtml(user.email)}">${escapeHtml(user.name)}</option>`),
    ].join("");
  } catch {
    els.nativeLoginUser.innerHTML = `<option value="">No se pudieron cargar usuarios</option>`;
  }
}

function toggleHamburgerMenu(event) {
  event.stopPropagation();
  const nextOpen = els.hamburgerMenu.hidden;
  els.hamburgerMenu.hidden = !nextOpen;
  els.hamburgerBtn.setAttribute("aria-expanded", String(nextOpen));
}

function closeHamburgerMenu() {
  els.hamburgerMenu.hidden = true;
  els.hamburgerBtn.setAttribute("aria-expanded", "false");
}

function handleMenuClick(event) {
  const action = event.target?.dataset?.menuAction;
  if (!action) return;
  closeHamburgerMenu();

  if (action === "new-item" && canModifyData()) openItemDialog();
  if (action === "clients" && hasClientAccess()) openClientsAdminDialog();
  if (action === "account") openAccountDialog();
  if (action === "settings") openUsersDialog();
  if (action === "logout") logout();
}

function toggleFilterPopover(event) {
  event.stopPropagation();
  const nextOpen = els.filterPopover.hidden;
  els.filterPopover.hidden = !nextOpen;
  els.filterMenuBtn.setAttribute("aria-expanded", String(nextOpen));
}

function closeFilterPopover() {
  els.filterPopover.hidden = true;
  els.filterMenuBtn.setAttribute("aria-expanded", "false");
}

function handleFilterChange() {
  state.selectedImportance = checkedValues("importance-filter");
  state.selectedCategories = checkedValues("category-filter");
  state.selectedSubcategories = checkedValues("subcategory-filter");
  updateFilterButtonLabel();
  loadItems(true);
}

function clearAdvancedFilters() {
  els.filterPopover.querySelectorAll("input[type='checkbox']").forEach((input) => (input.checked = false));
  state.selectedImportance = [];
  state.selectedCategories = [];
  state.selectedSubcategories = [];
  resetTableOrderState();
  updateFilterButtonLabel();
  loadItems(true);
}

function resetTableFilters(event) {
  event?.stopPropagation();
  els.keywordFilter.value = "";
  els.fromFilter.value = "";
  els.toFilter.value = "";
  els.filterPopover.querySelectorAll("input[type='checkbox']").forEach((input) => (input.checked = false));
  state.selectedImportance = [];
  state.selectedCategories = [];
  state.selectedSubcategories = [];
  resetTableOrderState();
  state.page = 1;
  updateFilterButtonLabel();
  closeFilterPopover();
  syncSortIndicators();
  loadItems(true);
}

function resetTableOrderState() {
  state.sort = DEFAULT_TABLE_SORT;
  state.sortDirection = DEFAULT_TABLE_DIRECTION;
  state.sortExplicit = false;
}

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name='${name}']:checked`)].map((input) => input.value);
}

function updateFilterButtonLabel() {
  const total = state.selectedImportance.length + state.selectedCategories.length + state.selectedSubcategories.length;
  els.filterMenuBtn.textContent = total ? `Filtros (${total})` : "Filtros";
}

function openAccountDialog() {
  renderAccountContent();
  els.accountAvatar.value = "";
  els.accountAvatarPreview.innerHTML = "";
  els.accountDialog.showModal();
}

function renderAccountContent() {
  els.accountContent.innerHTML = `
    <div class="account-card">
      <span class="avatar large">${avatarMarkup(state.user)}</span>
      <strong>${escapeHtml(state.user.name)}</strong>
      <div class="muted">${escapeHtml(state.user.email)}</div>
      <span class="chip">${escapeHtml(roleLabelFor(state.user.role))}</span>
    </div>
  `;
}

function openItemDetail(item) {
  if (!item) return;
  const client = findClient(item.client);
  const attachments = item.attachments || [];
  const creatorDetail = state.user?.role === "admin"
    ? `<span><strong>Creador</strong>${escapeHtml(item.createdBy?.name || "-")}</span>`
    : "";
  els.itemDetailContent.innerHTML = `
    <div class="detail-grid">
      <span><strong>Cliente</strong>${clientLabel(client)}</span>
      <span><strong>Fecha de creacion</strong>${formatDateTime(item.createdAt)}</span>
      <span><strong>Importancia</strong><em class="chip importance-${escapeHtml(item.importance)}">${labelImportance(item.importance)}</em></span>
      ${creatorDetail}
    </div>
    <h2>${escapeHtml(item.subject)}</h2>
    <div class="detail-description rich-content">${sanitizeRichText(item.description || "Sin descripcion")}</div>
    ${attachments.length ? `<div class="file-preview">${attachments.map(attachmentLink).join("")}</div>` : `<p class="muted">Sin adjuntos.</p>`}
  `;
  els.itemDetailDialog.showModal();
}

async function saveProfile(event) {
  event.preventDefault();
  const formData = new FormData();
  if (els.accountAvatar.files[0]) formData.set("avatar", els.accountAvatar.files[0]);
  const data = await api("/api/auth/profile", { method: "PATCH", body: formData });
  state.user = data.user;
  syncRoleUI();
  renderAccountContent();
  els.accountAvatar.value = "";
  els.accountAvatarPreview.innerHTML = "";
  notify("Perfil actualizado.");
}

function previewAccountAvatar() {
  const file = els.accountAvatar.files[0];
  els.accountAvatarPreview.innerHTML = file ? `<img src="${URL.createObjectURL(file)}" alt="" />` : "";
}

async function changePassword(event) {
  event.preventDefault();
  const data = await api("/api/auth/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword: els.currentPassword.value,
      newPassword: els.newPassword.value,
    }),
  });
  state.user = data.user;
  els.passwordForm.reset();
  syncRoleUI();
  notify("Password actualizado.");
}

function toggleTheme() {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
}

async function api(url, options = {}) {
  const { authOptional, authRedirect, fresh, ...fetchOptions } = options;
  const method = String(fetchOptions.method || "GET").toUpperCase();
  const requestUrl = method === "GET" || fresh ? withCacheBust(url) : url;
  const response = await fetch(requestUrl, {
    credentials: "include",
    cache: "no-store",
    ...fetchOptions,
  });
  if (!response.ok) {
    if (response.status === 401 && !authOptional && authRedirect !== false) {
      els.app.hidden = true;
      els.loginView.hidden = false;
    }
    const error = await response.json().catch(() => ({ message: "Error de red" }));
    throw new Error(error.message);
  }
  return response.json();
}

function withCacheBust(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
}

function notify(message) {
  const openDialog = document.querySelector("dialog[open]");
  if (openDialog) {
    const card = openDialog.querySelector(".form-card") || openDialog;
    const existing = card.querySelector(".dialog-toast");
    existing?.remove();
    const localToast = document.createElement("div");
    localToast.className = "dialog-toast";
    localToast.textContent = message;
    card.prepend(localToast);
    setTimeout(() => localToast.remove(), 2600);
    return;
  }

  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => (els.toast.hidden = true), 2600);
}

function findClient(id) {
  return state.clients.find((client) => client.id === String(id));
}

function getActiveClient() {
  return state.clients.find((client) => client.id === state.selectedClient);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function labelImportance(value) {
  return { alta: "Alta", media: "Media", baja: "Baja" }[value] || value;
}

function maskSecret(value) {
  return value ? "•".repeat(Math.min(Math.max(String(value).length, 8), 14)) : "";
}

function toggleSecret(button) {
  const field = button.closest(".credential-field");
  const valueNode = field?.querySelector("[data-secret-value]");
  if (!valueNode) return;
  const visible = valueNode.dataset.secretVisible === "true";
  valueNode.dataset.secretVisible = String(!visible);
  valueNode.textContent = visible ? maskSecret(valueNode.dataset.secretValue) : valueNode.dataset.secretValue;
  button.textContent = visible ? "Ver" : "Ocultar";
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value || "");
    notify("Dato copiado.");
  } catch {
    notify("No se pudo copiar el dato.");
  }
}

function sanitizeRichText(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "P", "DIV", "BR", "UL", "OL", "LI", "H3", "H4", "SPAN", "MARK"]);
  const allowedStyles = new Set(["color", "background-color", "font-size", "font-family"]);

  template.content.querySelectorAll("*").forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ""));
      return;
    }

    [...node.attributes].forEach((attribute) => {
      if (attribute.name !== "style") {
        node.removeAttribute(attribute.name);
        return;
      }

      const safeStyles = [];
      node.getAttribute("style")
        .split(";")
        .map((style) => style.trim())
        .filter(Boolean)
        .forEach((style) => {
          const [property, rawValue] = style.split(":").map((part) => part.trim());
          if (!allowedStyles.has(property)) return;
          const isSafeColor = /^#[0-9a-f]{3,8}$/i.test(rawValue) || /^rgb(a)?\([\d\s,%.]+\)$/i.test(rawValue);
          const isSafeFontSize = /^(14px|18px|22px)$/i.test(rawValue);
          const isSafeFontFamily = /^(Arial, sans-serif|Georgia, serif|'Courier New', monospace)$/i.test(rawValue);
          if (["color", "background-color"].includes(property) && !isSafeColor) return;
          if (property === "font-size" && !isSafeFontSize) return;
          if (property === "font-family" && !isSafeFontFamily) return;
          safeStyles.push(`${property}: ${rawValue}`);
        });

      if (safeStyles.length) node.setAttribute("style", safeStyles.join("; "));
      else node.removeAttribute("style");
    });
  });

  return template.innerHTML.trim();
}

function plainTextFromHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = sanitizeRichText(value);
  return template.content.textContent?.trim() || "";
}

function avatarMarkup(user) {
  if (user?.avatar) return `<img src="${escapeHtml(user.avatar)}" alt="" />`;
  return `<span>${escapeHtml((user?.name || "U").slice(0, 1).toUpperCase())}</span>`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(value = 0) {
  if (!value) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
