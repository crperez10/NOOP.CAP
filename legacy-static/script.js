const STORAGE_KEY = "labor-admin-data-v1";

const initialGroups = [
  {
    id: crypto.randomUUID(),
    name: "Operaciones",
    subgroups: [
      { id: crypto.randomUUID(), name: "Logistica" },
      { id: crypto.randomUUID(), name: "Calidad" },
    ],
  },
  {
    id: crypto.randomUUID(),
    name: "Administracion",
    subgroups: [
      { id: crypto.randomUUID(), name: "Finanzas" },
      { id: crypto.randomUUID(), name: "Compras" },
    ],
  },
  {
    id: crypto.randomUUID(),
    name: "Recursos Humanos",
    subgroups: [
      { id: crypto.randomUUID(), name: "Seleccion" },
      { id: crypto.randomUUID(), name: "Capacitacion" },
    ],
  },
];

const createSeedRecords = (groups) => {
  const [ops, admin, rrhh] = groups;

  return [
    {
      id: crypto.randomUUID(),
      name: "Control de asistencia abril",
      groupId: rrhh.id,
      subgroupId: rrhh.subgroups[1].id,
      area: "Seguimiento interno",
      owner: "Lucia Perez",
      status: "Activo",
      priority: "Alta",
      date: "2026-04-20",
      notes: "Actualizar legajos y confirmar cargas pendientes.",
      attachments: [
        {
          id: crypto.randomUUID(),
          title: "Carpeta de soporte",
          type: "Link",
          url: "https://drive.google.com/",
          fileName: "",
          mimeType: "",
          dataUrl: "",
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Revision de stock semanal",
      groupId: ops.id,
      subgroupId: ops.subgroups[0].id,
      area: "Control logistico",
      owner: "Martin Suarez",
      status: "En revision",
      priority: "Media",
      date: "2026-04-22",
      notes: "Cruzar diferencias entre deposito central y sistema.",
      attachments: [],
    },
    {
      id: crypto.randomUUID(),
      name: "Pago proveedores criticos",
      groupId: admin.id,
      subgroupId: admin.subgroups[0].id,
      area: "Tesoreria",
      owner: "Camila Rojas",
      status: "Pendiente",
      priority: "Alta",
      date: "2026-04-25",
      notes: "Validar ordenes con vencimiento esta semana.",
      attachments: [],
    },
  ];
};

const state = loadState();
let selectedGroupId = "all";
let selectedSubgroupId = "all";
let draftAttachments = [];

const elements = {
  groupTree: document.querySelector("#group-tree"),
  statsGrid: document.querySelector("#stats-grid"),
  searchInput: document.querySelector("#search-input"),
  statusFilter: document.querySelector("#status-filter"),
  priorityFilter: document.querySelector("#priority-filter"),
  recordsTbody: document.querySelector("#records-tbody"),
  resultCount: document.querySelector("#result-count"),
  homeBtn: document.querySelector("#home-btn"),
  workspaceMenuBtn: document.querySelector("#workspace-menu-btn"),
  workspaceMenu: document.querySelector("#workspace-menu"),
  recordForm: document.querySelector("#record-form"),
  recordId: document.querySelector("#record-id"),
  formTitle: document.querySelector("#form-title"),
  recordName: document.querySelector("#record-name"),
  recordGroup: document.querySelector("#record-group"),
  recordSubgroup: document.querySelector("#record-subgroup"),
  recordArea: document.querySelector("#record-area"),
  recordOwner: document.querySelector("#record-owner"),
  recordStatus: document.querySelector("#record-status"),
  recordPriority: document.querySelector("#record-priority"),
  recordDate: document.querySelector("#record-date"),
  recordNotes: document.querySelector("#record-notes"),
  cancelEditBtn: document.querySelector("#cancel-edit-btn"),
  attachmentList: document.querySelector("#attachment-list"),
  attachmentTitle: document.querySelector("#attachment-title"),
  attachmentType: document.querySelector("#attachment-type"),
  attachmentUrl: document.querySelector("#attachment-url"),
  attachmentFile: document.querySelector("#attachment-file"),
  addAttachmentBtn: document.querySelector("#add-attachment-btn"),
  addGroupBtn: document.querySelector("#add-group-btn"),
  groupDialog: document.querySelector("#group-dialog"),
  groupForm: document.querySelector("#group-form"),
  groupDialogTitle: document.querySelector("#group-dialog-title"),
  groupName: document.querySelector("#group-name"),
  groupType: document.querySelector("#group-type"),
  groupParentWrap: document.querySelector("#group-parent-wrap"),
  groupParent: document.querySelector("#group-parent"),
  closeGroupDialog: document.querySelector("#close-group-dialog"),
  recordDetailDialog: document.querySelector("#record-detail-dialog"),
  recordDetailContent: document.querySelector("#record-detail-content"),
  closeRecordDetail: document.querySelector("#close-record-detail"),
  recordEditorDialog: document.querySelector("#record-editor-dialog"),
  closeRecordEditor: document.querySelector("#close-record-editor"),
  usersDialog: document.querySelector("#users-dialog"),
  accountDialog: document.querySelector("#account-dialog"),
};

boot();

function boot() {
  bindEvents();
  syncGroupSelectors();
  render();
  resetForm();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const groups = structuredClone(initialGroups);
    return {
      groups,
      records: createSeedRecords(groups),
    };
  }

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    const groups = structuredClone(initialGroups);
    return {
      groups,
      records: createSeedRecords(groups),
    };
  }
}

function normalizeState(data) {
  const groups = Array.isArray(data.groups) ? data.groups : structuredClone(initialGroups);
  const normalizedGroups = groups.map((group) => ({
    id: group.id || crypto.randomUUID(),
    name: group.name || "Grupo",
    subgroups: Array.isArray(group.subgroups)
      ? group.subgroups.map((subgroup) => ({
          id: subgroup.id || crypto.randomUUID(),
          name: subgroup.name || "Subgrupo",
        }))
      : [],
  }));

  const records = Array.isArray(data.records) ? data.records : [];

  return {
    groups: normalizedGroups,
    records: records.map((record) => ({
      id: record.id || crypto.randomUUID(),
      name: record.name || "",
      groupId: record.groupId || normalizedGroups[0]?.id || "",
      subgroupId: record.subgroupId || normalizedGroups[0]?.subgroups[0]?.id || "",
      area: record.area || "",
      owner: record.owner || "",
      status: record.status || "Activo",
      priority: record.priority || "Media",
      date: record.date || "",
      notes: record.notes || "",
      attachments: Array.isArray(record.attachments)
        ? record.attachments.map((attachment) => normalizeAttachment(attachment))
        : [],
    })),
  };
}

function normalizeAttachment(attachment) {
  return {
    id: attachment.id || crypto.randomUUID(),
    title: attachment.title || attachment.fileName || "Adjunto",
    type: attachment.type || "Otro",
    url: attachment.url || "",
    fileName: attachment.fileName || "",
    mimeType: attachment.mimeType || "",
    dataUrl: attachment.dataUrl || "",
    size: attachment.size || 0,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.searchInput.addEventListener("input", renderRecords);
  elements.statusFilter.addEventListener("change", renderRecords);
  elements.priorityFilter.addEventListener("change", renderRecords);
  elements.homeBtn.addEventListener("click", handleGoHome);
  elements.workspaceMenuBtn.addEventListener("click", toggleWorkspaceMenu);
  document.addEventListener("click", handleOutsideMenuClick);
  elements.workspaceMenu.querySelectorAll("[data-menu-action]").forEach((button) => {
    button.addEventListener("click", () => handleMenuAction(button.dataset.menuAction));
  });
  elements.recordForm.addEventListener("submit", handleRecordSubmit);
  elements.cancelEditBtn.addEventListener("click", resetForm);
  elements.recordGroup.addEventListener("change", syncSubgroupSelector);
  elements.addAttachmentBtn.addEventListener("click", handleAttachmentAdd);
  elements.addGroupBtn.addEventListener("click", () => openGroupDialog("group"));
  elements.groupType.addEventListener("change", handleGroupTypeChange);
  elements.groupForm.addEventListener("submit", handleGroupSubmit);
  elements.closeGroupDialog.addEventListener("click", () => elements.groupDialog.close());
  elements.closeRecordDetail.addEventListener("click", () => elements.recordDetailDialog.close());
  elements.closeRecordEditor.addEventListener("click", () => elements.recordEditorDialog.close());
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`#${button.dataset.closeDialog}`)?.close();
    });
  });
}

function render() {
  renderGroupTree();
  renderStats();
  renderRecords();
  renderAttachmentList();
}

function renderGroupTree() {
  const fragment = document.createDocumentFragment();

  const allWrap = document.createElement("div");
  allWrap.className = "tree-group";
  allWrap.innerHTML = `
    <div class="tree-item">
      <button type="button" data-group="all" data-subgroup="all">Todos los grupos</button>
      <span>${state.records.length}</span>
    </div>
  `;
  fragment.appendChild(allWrap);

  state.groups.forEach((group) => {
    const groupCount = state.records.filter((record) => record.groupId === group.id).length;
    const groupNode = document.createElement("div");
    groupNode.className = "tree-group";

    const subgroupHtml = group.subgroups
      .map((subgroup) => {
        const subgroupCount = state.records.filter((record) => record.subgroupId === subgroup.id).length;
        return `
          <div class="tree-subitem">
            <button type="button" data-group="${group.id}" data-subgroup="${subgroup.id}">${escapeHtml(subgroup.name)}</button>
            <span>${subgroupCount}</span>
          </div>
        `;
      })
      .join("");

    groupNode.innerHTML = `
      <div class="tree-item">
        <button type="button" data-group="${group.id}" data-subgroup="all">${escapeHtml(group.name)}</button>
        <div class="subgroup-actions">
          <span>${groupCount}</span>
          <button type="button" class="icon-button" data-add-subgroup="${group.id}" title="Agregar subgrupo">+</button>
        </div>
      </div>
      ${subgroupHtml || '<p class="brand-copy">Sin subgrupos todavia.</p>'}
    `;

    fragment.appendChild(groupNode);
  });

  elements.groupTree.innerHTML = "";
  elements.groupTree.appendChild(fragment);

  elements.groupTree.querySelectorAll("[data-group]").forEach((button) => {
    if (
      button.dataset.group === selectedGroupId &&
      button.dataset.subgroup === selectedSubgroupId
    ) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => {
      selectedGroupId = button.dataset.group;
      selectedSubgroupId = button.dataset.subgroup;
      render();
    });
  });

  elements.groupTree.querySelectorAll("[data-add-subgroup]").forEach((button) => {
    button.addEventListener("click", () => openGroupDialog("subgroup", button.dataset.addSubgroup));
  });
}

function renderStats() {
  const attachmentsCount = state.records.reduce(
    (sum, record) => sum + (record.attachments?.length || 0),
    0
  );

  const stats = [
    { label: "Registros", value: state.records.length },
    { label: "Grupos", value: state.groups.length },
    { label: "Subgrupos", value: state.groups.reduce((sum, group) => sum + group.subgroups.length, 0) },
    { label: "Adjuntos", value: attachmentsCount },
  ];

  elements.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <div class="stat-card">
          <strong>${stat.value}</strong>
          <span>${stat.label}</span>
        </div>
      `
    )
    .join("");
}

function renderRecords() {
  const records = getFilteredRecords();
  elements.resultCount.textContent = `${records.length} resultado(s)`;

  if (!records.length) {
    elements.recordsTbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">No hay registros para los filtros seleccionados.</div>
        </td>
      </tr>
    `;
    return;
  }

  elements.recordsTbody.innerHTML = records
    .map((record) => {
      const group = getGroup(record.groupId);
      const subgroup = getSubgroup(record.groupId, record.subgroupId);
      const attachmentCount = record.attachments?.length || 0;

      return `
        <tr>
          <td>
            <strong>${escapeHtml(record.name)}</strong>
            <div class="brand-copy">${escapeHtml(record.notes || "Sin notas")}</div>
          </td>
          <td>${escapeHtml(group?.name || "-")}</td>
          <td>${escapeHtml(subgroup?.name || "-")}</td>
          <td>${escapeHtml(record.area)}</td>
          <td>${escapeHtml(record.owner)}</td>
          <td><span class="status-pill status-${toToken(record.status)}">${escapeHtml(record.status)}</span></td>
          <td><span class="priority-pill priority-${toToken(record.priority)}">${escapeHtml(record.priority)}</span></td>
          <td>${formatDate(record.date)}</td>
          <td>
            <button class="link-button" type="button" data-view-record="${record.id}">
              ${attachmentCount ? `${attachmentCount} adjunto(s)` : "Sin adjuntos"}
            </button>
          </td>
          <td>
            <div class="action-row">
              <button class="action-button" type="button" data-view-record="${record.id}">Ver</button>
              <button class="action-button" type="button" data-window-record="${record.id}">Ventana</button>
              <button class="action-button" type="button" data-delete-record="${record.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.recordsTbody.querySelectorAll("[data-delete-record]").forEach((button) => {
    button.addEventListener("click", () => deleteRecord(button.dataset.deleteRecord));
  });

  elements.recordsTbody.querySelectorAll("[data-view-record]").forEach((button) => {
    button.addEventListener("click", () => openRecordDetail(button.dataset.viewRecord));
  });

  elements.recordsTbody.querySelectorAll("[data-window-record]").forEach((button) => {
    button.addEventListener("click", () => openRecordWindow(button.dataset.windowRecord));
  });
}

function renderAttachmentList() {
  if (!draftAttachments.length) {
    elements.attachmentList.innerHTML = `
      <div class="empty-attachments">
        Sin adjuntos cargados todavia.
      </div>
    `;
    return;
  }

  elements.attachmentList.innerHTML = draftAttachments
    .map(
      (attachment) => `
        <article class="attachment-card">
          <div>
            <strong>${escapeHtml(attachment.title)}</strong>
            <div class="attachment-meta">
              <span class="attachment-chip">${escapeHtml(attachment.type)}</span>
              ${attachment.url ? `<span>${escapeHtml(shortenValue(attachment.url, 42))}</span>` : ""}
              ${attachment.fileName ? `<span>${escapeHtml(attachment.fileName)}</span>` : ""}
              ${attachment.size ? `<span>${formatBytes(attachment.size)}</span>` : ""}
            </div>
          </div>
          <button class="ghost-button" type="button" data-remove-attachment="${attachment.id}">
            Quitar
          </button>
        </article>
      `
    )
    .join("");

  elements.attachmentList.querySelectorAll("[data-remove-attachment]").forEach((button) => {
    button.addEventListener("click", () => {
      draftAttachments = draftAttachments.filter((attachment) => attachment.id !== button.dataset.removeAttachment);
      renderAttachmentList();
    });
  });
}

function getFilteredRecords() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const priority = elements.priorityFilter.value;

  return state.records.filter((record) => {
    const inGroup = selectedGroupId === "all" || record.groupId === selectedGroupId;
    const inSubgroup = selectedSubgroupId === "all" || record.subgroupId === selectedSubgroupId;
    const inStatus = status === "all" || record.status === status;
    const inPriority = priority === "all" || record.priority === priority;
    const attachmentText = (record.attachments || [])
      .map((attachment) => `${attachment.title} ${attachment.url} ${attachment.fileName}`)
      .join(" ");
    const searchable = `${record.name} ${record.area} ${record.owner} ${record.notes} ${attachmentText}`.toLowerCase();
    const inQuery = !query || searchable.includes(query);

    return inGroup && inSubgroup && inStatus && inPriority && inQuery;
  });
}

function syncGroupSelectors() {
  elements.recordGroup.innerHTML = state.groups
    .map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`)
    .join("");

  elements.groupParent.innerHTML = state.groups
    .map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`)
    .join("");

  if (!elements.recordGroup.value && state.groups[0]) {
    elements.recordGroup.value = state.groups[0].id;
  }

  syncSubgroupSelector();
}

function syncSubgroupSelector() {
  const group = state.groups.find((item) => item.id === elements.recordGroup.value) || state.groups[0];
  const subgroups = group?.subgroups || [];

  elements.recordSubgroup.innerHTML = subgroups
    .map((subgroup) => `<option value="${subgroup.id}">${escapeHtml(subgroup.name)}</option>`)
    .join("");
}

async function handleRecordSubmit(event) {
  event.preventDefault();

  const payload = {
    id: elements.recordId.value || crypto.randomUUID(),
    name: elements.recordName.value.trim(),
    groupId: elements.recordGroup.value,
    subgroupId: elements.recordSubgroup.value,
    area: elements.recordArea.value.trim(),
    owner: elements.recordOwner.value.trim(),
    status: elements.recordStatus.value,
    priority: elements.recordPriority.value,
    date: elements.recordDate.value,
    notes: elements.recordNotes.value.trim(),
    attachments: draftAttachments.map((attachment) => ({ ...attachment })),
  };

  if (!payload.subgroupId) {
    window.alert("Selecciona o crea un subgrupo antes de guardar el registro.");
    return;
  }

  const index = state.records.findIndex((record) => record.id === payload.id);

  if (index >= 0) {
    state.records[index] = payload;
  } else {
    state.records.unshift(payload);
  }

  saveState();
  render();
  elements.recordEditorDialog.close();
  resetForm();
}

async function handleAttachmentAdd() {
  const title = elements.attachmentTitle.value.trim();
  const type = elements.attachmentType.value;
  const url = elements.attachmentUrl.value.trim();
  const file = elements.attachmentFile.files?.[0];

  if (!url && !file) {
    window.alert("Agrega un enlace o selecciona un archivo para crear el adjunto.");
    return;
  }

  if (url && !isSafeUrl(url)) {
    window.alert("El enlace del adjunto no tiene un formato valido.");
    return;
  }

  const attachment = {
    id: crypto.randomUUID(),
    title: title || file?.name || simplifyUrl(url) || "Adjunto",
    type,
    url,
    fileName: "",
    mimeType: "",
    dataUrl: "",
    size: 0,
  };

  if (file) {
    attachment.fileName = file.name;
    attachment.mimeType = file.type;
    attachment.size = file.size;
    attachment.dataUrl = await readFileAsDataUrl(file);
  }

  draftAttachments.unshift(attachment);
  renderAttachmentList();
  clearAttachmentFields();
}

function populateForm(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  if (!record) return;

  elements.formTitle.textContent = "Editar registro";
  elements.recordId.value = record.id;
  elements.recordName.value = record.name;
  elements.recordGroup.value = record.groupId;
  syncSubgroupSelector();
  elements.recordSubgroup.value = record.subgroupId;
  elements.recordArea.value = record.area;
  elements.recordOwner.value = record.owner;
  elements.recordStatus.value = record.status;
  elements.recordPriority.value = record.priority;
  elements.recordDate.value = record.date;
  elements.recordNotes.value = record.notes;
  draftAttachments = (record.attachments || []).map((attachment) => ({ ...attachment }));
  renderAttachmentList();
  elements.recordEditorDialog.showModal();
}

function resetForm() {
  elements.formTitle.textContent = "Crear registro";
  elements.recordForm.reset();
  elements.recordId.value = "";
  elements.recordDate.value = new Date().toISOString().slice(0, 10);
  if (state.groups[0]) {
    elements.recordGroup.value = state.groups[0].id;
    syncSubgroupSelector();
  }
  draftAttachments = [];
  clearAttachmentFields();
  renderAttachmentList();
}

function clearAttachmentFields() {
  elements.attachmentTitle.value = "";
  elements.attachmentType.value = "Link";
  elements.attachmentUrl.value = "";
  elements.attachmentFile.value = "";
}

function deleteRecord(recordId) {
  const confirmed = window.confirm("Se eliminara el registro seleccionado. Quieres continuar?");
  if (!confirmed) return;

  state.records = state.records.filter((record) => record.id !== recordId);
  saveState();
  render();
}

function openGroupDialog(type = "group", parentId = "") {
  elements.groupForm.reset();
  elements.groupType.value = type;
  handleGroupTypeChange();
  if (parentId) {
    elements.groupParent.value = parentId;
  }
  elements.groupDialogTitle.textContent = type === "group" ? "Nuevo grupo" : "Nuevo subgrupo";
  elements.groupDialog.showModal();
  elements.groupName.focus();
}

function handleGroupTypeChange() {
  const isSubgroup = elements.groupType.value === "subgroup";
  elements.groupParentWrap.classList.toggle("hidden", !isSubgroup);
}

function handleGroupSubmit(event) {
  event.preventDefault();

  const name = elements.groupName.value.trim();
  if (!name) return;

  if (elements.groupType.value === "group") {
    state.groups.push({ id: crypto.randomUUID(), name, subgroups: [] });
  } else {
    const group = state.groups.find((item) => item.id === elements.groupParent.value);
    if (!group) {
      window.alert("Primero debes crear un grupo principal.");
      return;
    }
    group.subgroups.push({ id: crypto.randomUUID(), name });
  }

  saveState();
  syncGroupSelectors();
  render();
  elements.groupDialog.close();
}

function openRecordDetail(recordId) {
  const record = getRecord(recordId);
  if (!record) return;

  elements.recordDetailContent.innerHTML = buildRecordDetailMarkup(record, true);
  wireDetailActions(record.id, elements.recordDetailContent);
  elements.recordDetailDialog.showModal();
}

function openRecordEditor(mode = "new") {
  if (mode === "new") {
    resetForm();
  }
  elements.recordEditorDialog.showModal();
  elements.recordName.focus();
}

function openRecordWindow(recordId) {
  const record = getRecord(recordId);
  if (!record) return;

  const popup = window.open("", "_blank", "width=1120,height=760,noopener");
  if (!popup) {
    window.alert("El navegador bloqueo la nueva ventana. Habilitala para abrir registros aparte.");
    return;
  }

  const stylesHref = new URL("styles.css", window.location.href).href;
  popup.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(record.name)} | Registro</title>
        <link rel="stylesheet" href="${escapeAttribute(stylesHref)}" />
      </head>
      <body class="record-window-body">
        <main class="record-window">
          <section class="detail-sheet">
            ${buildRecordDetailMarkup(record, false)}
          </section>
        </main>
      </body>
    </html>
  `);
  popup.document.close();
}

function wireDetailActions(recordId, container) {
  const editButton = container.querySelector("[data-detail-edit]");
  const windowButton = container.querySelector("[data-detail-window]");

  editButton?.addEventListener("click", () => {
    elements.recordDetailDialog.close();
    populateForm(recordId);
  });

  windowButton?.addEventListener("click", () => openRecordWindow(recordId));
}

function buildRecordDetailMarkup(record, includeActions) {
  const group = getGroup(record.groupId);
  const subgroup = getSubgroup(record.groupId, record.subgroupId);
  const attachments = record.attachments || [];

  return `
    <div class="detail-top">
      <div>
        <p class="eyebrow">Registro</p>
        <h2>${escapeHtml(record.name)}</h2>
        <p class="hero-copy">${escapeHtml(record.notes || "Sin notas cargadas.")}</p>
      </div>
      ${
        includeActions
          ? `
            <div class="detail-actions">
              <button class="secondary-button" type="button" data-detail-window="${record.id}">Abrir en ventana</button>
              <button class="primary-button" type="button" data-detail-edit="${record.id}">Editar</button>
            </div>
          `
          : ""
      }
    </div>

    <div class="detail-grid">
      <article class="detail-card">
        <h3>Datos base</h3>
        <dl class="detail-list">
          <div><dt>Grupo</dt><dd>${escapeHtml(group?.name || "-")}</dd></div>
          <div><dt>Subgrupo</dt><dd>${escapeHtml(subgroup?.name || "-")}</dd></div>
          <div><dt>Area</dt><dd>${escapeHtml(record.area || "-")}</dd></div>
          <div><dt>Responsable</dt><dd>${escapeHtml(record.owner || "-")}</dd></div>
        </dl>
      </article>

      <article class="detail-card">
        <h3>Seguimiento</h3>
        <dl class="detail-list">
          <div><dt>Estado</dt><dd><span class="status-pill status-${toToken(record.status)}">${escapeHtml(record.status)}</span></dd></div>
          <div><dt>Prioridad</dt><dd><span class="priority-pill priority-${toToken(record.priority)}">${escapeHtml(record.priority)}</span></dd></div>
          <div><dt>Fecha</dt><dd>${formatDate(record.date)}</dd></div>
          <div><dt>Adjuntos</dt><dd>${attachments.length}</dd></div>
        </dl>
      </article>
    </div>

    <section class="detail-card detail-attachments">
      <div class="panel-header">
        <h3>Adjuntos del registro</h3>
      </div>
      ${
        attachments.length
          ? `
            <div class="detail-attachment-list">
              ${attachments.map((attachment) => buildAttachmentMarkup(attachment)).join("")}
            </div>
          `
          : `<div class="empty-attachments">Este registro no tiene adjuntos cargados.</div>`
      }
    </section>
  `;
}

function buildAttachmentMarkup(attachment) {
  const href = attachment.dataUrl || attachment.url;
  const isImage = attachment.mimeType.startsWith("image/") || attachment.type === "Imagen";
  const downloadAttr = attachment.dataUrl
    ? `download="${escapeAttribute(attachment.fileName || attachment.title)}"`
    : "";

  return `
    <article class="detail-attachment-card">
      <div class="detail-attachment-main">
        <div class="attachment-meta">
          <span class="attachment-chip">${escapeHtml(attachment.type)}</span>
          ${attachment.fileName ? `<span>${escapeHtml(attachment.fileName)}</span>` : ""}
          ${attachment.size ? `<span>${formatBytes(attachment.size)}</span>` : ""}
        </div>
        <strong>${escapeHtml(attachment.title)}</strong>
        ${
          attachment.url
            ? `<div class="brand-copy">${escapeHtml(shortenValue(attachment.url, 72))}</div>`
            : ""
        }
      </div>
      ${
        isImage && attachment.dataUrl
          ? `<img class="attachment-preview" src="${escapeAttribute(attachment.dataUrl)}" alt="${escapeAttribute(attachment.title)}" />`
          : ""
      }
      ${
        href
          ? `<a class="attachment-link" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer" ${downloadAttr}>Abrir adjunto</a>`
          : ""
      }
    </article>
  `;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "administracion-laboral.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = normalizeState(JSON.parse(String(reader.result)));
      state.groups = parsed.groups;
      state.records = parsed.records;
      saveState();
      syncGroupSelectors();
      resetForm();
      render();
      window.alert("Datos importados correctamente.");
    } catch {
      window.alert("No se pudo importar el archivo.");
    } finally {
      elements.importInput.value = "";
    }
  };
  reader.readAsText(file);
}

function handleGoHome() {
  closeWorkspaceMenu();
  elements.recordDetailDialog.close?.();
  elements.recordEditorDialog.close?.();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleWorkspaceMenu(event) {
  event.stopPropagation();
  const isOpen = !elements.workspaceMenu.classList.contains("menu-hidden");
  elements.workspaceMenu.classList.toggle("menu-hidden", isOpen);
  elements.workspaceMenuBtn.setAttribute("aria-expanded", String(!isOpen));
}

function closeWorkspaceMenu() {
  elements.workspaceMenu.classList.add("menu-hidden");
  elements.workspaceMenuBtn.setAttribute("aria-expanded", "false");
}

function handleOutsideMenuClick(event) {
  if (!elements.workspaceMenu.contains(event.target) && !elements.workspaceMenuBtn.contains(event.target)) {
    closeWorkspaceMenu();
  }
}

function handleMenuAction(action) {
  closeWorkspaceMenu();

  if (action === "home") {
    handleGoHome();
    return;
  }

  if (action === "new-record") {
    openRecordEditor("new");
    return;
  }

  if (action === "new-user") {
    elements.usersDialog.showModal();
    return;
  }

  if (action === "account") {
    elements.accountDialog.showModal();
    return;
  }

  if (action === "logout") {
    window.alert("La opcion de cerrar sesion queda preparada para cuando integremos usuarios reales.");
  }
}

function getRecord(recordId) {
  return state.records.find((record) => record.id === recordId);
}

function getGroup(groupId) {
  return state.groups.find((group) => group.id === groupId);
}

function getSubgroup(groupId, subgroupId) {
  return getGroup(groupId)?.subgroups.find((subgroup) => subgroup.id === subgroupId);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatBytes(value) {
  if (!value) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function simplifyUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function shortenValue(value, maxLength) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function isSafeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function toToken(value) {
  return String(value).trim().toLowerCase().replaceAll(/\s+/g, "-");
}
