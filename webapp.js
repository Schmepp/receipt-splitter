const state = {
  store: '',
  date: '',
  items: [],
  people: [],
  tipPercent: 10,
  splitMethod: 'proportional',
  parsedSubtotal: 0,
  parsedTax: 0,
  parsedTotal: 0,
  loading: false,
  error: '',
};

const dom = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  dom.receiptForm = document.getElementById('receiptForm');
  dom.receiptInput = document.getElementById('receiptInput');
  dom.parseButton = document.getElementById('parseButton');
  dom.resetButton = document.getElementById('resetButton');
  dom.addItemForm = document.getElementById('addItemForm');
  dom.newItemName = document.getElementById('newItemName');
  dom.newItemPrice = document.getElementById('newItemPrice');
  dom.statusMessage = document.getElementById('statusMessage');
  dom.previewArea = document.getElementById('previewArea');
  dom.receiptPreview = document.getElementById('receiptPreview');
  dom.receiptDataCard = document.getElementById('receiptDataCard');
  dom.storeName = document.getElementById('storeName');
  dom.receiptDate = document.getElementById('receiptDate');
  dom.receiptSubtotal = document.getElementById('receiptSubtotal');
  dom.receiptTax = document.getElementById('receiptTax');
  dom.receiptTotal = document.getElementById('receiptTotal');
  dom.peopleList = document.getElementById('peopleList');
  dom.addPersonForm = document.getElementById('addPersonForm');
  dom.newPersonName = document.getElementById('newPersonName');
  dom.itemsCard = document.getElementById('itemsCard');
  dom.itemsTableContainer = document.getElementById('itemsTableContainer');
  dom.optionsCard = document.getElementById('optionsCard');
  dom.tipPercentInput = document.getElementById('tipPercentInput');
  dom.splitMethodSelect = document.getElementById('splitMethodSelect');
  dom.resultsCard = document.getElementById('resultsCard');
  dom.resultsContainer = document.getElementById('resultsContainer');

  dom.receiptForm.addEventListener('submit', handleReceiptSubmit);
  dom.resetButton.addEventListener('click', resetApp);
  dom.addPersonForm.addEventListener('submit', handleAddPerson);
  dom.addItemForm.addEventListener('submit', handleAddItem);
  dom.tipPercentInput.addEventListener('input', handleOptionsChange);
  dom.splitMethodSelect.addEventListener('change', handleOptionsChange);
  dom.receiptInput.addEventListener('change', handleFilePreview);

  renderApp();
}

function handleFilePreview() {
  const file = dom.receiptInput.files[0];
  if (!file) {
    dom.previewArea.style.display = 'none';
    dom.receiptPreview.src = '';
    return;
  }

  const url = URL.createObjectURL(file);
  dom.receiptPreview.src = url;
  dom.previewArea.style.display = 'block';
}

async function handleReceiptSubmit(event) {
  event.preventDefault();
  const file = dom.receiptInput.files[0];
  if (!file) {
    showStatus('Please select a receipt image first.', true);
    return;
  }

  await uploadReceipt(file);
}

async function uploadReceipt(file) {
  try {
    state.loading = true;
    state.error = '';
    showStatus('Parsing receipt…', false, true);
    renderApp();

    const formData = new FormData();
    formData.append('receipt', file);

    const response = await fetch('parse-receipt', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let message = `Server returned ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error) message = errorData.error;
      } catch (_) {
        // Ignore non-JSON error responses.
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.items)) {
      throw new Error('Receipt parsing returned invalid data.');
    }

    applyParsedReceipt(data);
    showStatus('Receipt parsed successfully.', false);
  } catch (error) {
    state.error = error.message || 'Unable to parse receipt.';
    showStatus(state.error, true);
    console.error(error);
  } finally {
    state.loading = false;
    renderApp();
  }
}

function applyParsedReceipt(data) {
  state.store = data.store || 'Unknown';
  state.date = data.date || 'Unknown';
  state.parsedSubtotal = parseNumber(data.subtotal);
  state.parsedTax = parseNumber(data.tax);
  state.parsedTotal = parseNumber(data.total);
  state.items = (data.items || []).map((item, index) => ({
    id: `item-${index}`,
    name: (item.name || 'Item').trim(),
    price: parseNumber(item.price),
    assignedTo: state.people[0] ? [state.people[0].id] : [],
  }));
  if (state.items.length === 0) {
    showStatus('No line items were found. You can add items manually.', false);
  }
}

function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  return Number(cleaned) || 0;
}

function handleAddPerson(event) {
  event.preventDefault();
  const name = dom.newPersonName.value.trim();
  if (!name) {
    showStatus('Enter a name to add a person.', true);
    return;
  }

  addPerson(name);
  dom.newPersonName.value = '';
  showStatus(`${name} added.`, false);
}

function handleAddItem(event) {
  event.preventDefault();
  const name = dom.newItemName.value.trim();
  const price = parseNumber(dom.newItemPrice.value);

  if (!name) {
    showStatus('Enter an item name.', true);
    return;
  }

  if (price <= 0) {
    showStatus('Enter a valid item price.', true);
    return;
  }

  addItem(name, price);
  dom.newItemName.value = '';
  dom.newItemPrice.value = '';
  showStatus(`${name} added.`, false);
}

function addPerson(name) {
  const id = `p${Date.now()}`;
  state.people.push({ id, name });
  state.items.forEach(item => {
    if (!item.assignedTo.length) item.assignedTo = [id];
  });
  renderApp();
}

function addItem(name, price) {
  state.items.push({
    id: `item-${Date.now()}-${state.items.length}`,
    name,
    price,
    assignedTo: state.people[0] ? [state.people[0].id] : [],
  });
  renderApp();
}

function handleOptionsChange() {
  state.tipPercent = parseNumber(dom.tipPercentInput.value);
  state.splitMethod = dom.splitMethodSelect.value;
  renderResults();
}

function renderApp() {
  const hasReceipt = state.items.length > 0 || state.store || state.date;
  dom.receiptDataCard.style.display = hasReceipt ? 'block' : 'none';
  dom.itemsCard.style.display = hasReceipt ? 'block' : 'none';
  dom.optionsCard.style.display = hasReceipt ? 'block' : 'none';
  dom.resultsCard.style.display = hasReceipt ? 'block' : 'none';

  dom.parseButton.textContent = state.loading ? 'Parsing…' : 'Parse receipt';
  dom.parseButton.disabled = state.loading;
  dom.receiptInput.disabled = state.loading;

  dom.storeName.textContent = state.store || '—';
  dom.receiptDate.textContent = state.date || '—';
  dom.receiptSubtotal.textContent = formatMoney(state.parsedSubtotal);
  dom.receiptTax.textContent = formatMoney(state.parsedTax);
  dom.receiptTotal.textContent = formatMoney(state.parsedTotal);
  dom.tipPercentInput.value = state.tipPercent;
  dom.splitMethodSelect.value = state.splitMethod;

  renderPeople();
  renderItems();
  renderResults();
}

function renderPeople() {
  if (!state.people.length) {
    dom.peopleList.innerHTML = '<div class="empty-state"><p class="small">Enter your name to start splitting the bill.</p></div>';
    return;
  }

  dom.peopleList.innerHTML = state.people
    .map(person => `<div class="summary-card compact"><strong>${escapeHtml(person.name)}</strong></div>`)
    .join('');
}

function renderItems() {
  if (!state.items.length) {
    dom.itemsTableContainer.innerHTML = '<div class="empty-state"><p class="small">Upload a receipt to populate items, or add them manually above.</p></div>';
    return;
  }

  const header = `<div class="table-wrap"><table class="items-table"><thead><tr><th>Item</th><th>Price</th><th>Assign to</th><th>Action</th></tr></thead><tbody>`;
  const rows = state.items.map(item => {
    const checkboxes = state.people
      .map(person => {
        const checked = item.assignedTo.includes(person.id) ? 'checked' : '';
        return `<label class="assign-option"><input type="checkbox" data-item="${item.id}" data-person="${person.id}" ${checked} />${escapeHtml(person.name)}</label>`;
      })
      .join('');

    const splitCount = Math.max(1, item.assignedTo.length);
    const perPerson = splitCount > 0 ? roundToTwo(item.price / splitCount) : item.price;

    return `<tr><td>${escapeHtml(item.name)}<div class="small">${splitCount > 1 ? `Split ${splitCount} ways · ${formatMoney(perPerson)} each` : 'Split evenly when shared'}</div></td><td data-label="Price">${formatMoney(item.price)}</td><td data-label="Assign to"><div class="assign-options">${checkboxes}</div></td><td><button class="danger-button" type="button" data-delete-item="${item.id}">Delete</button></td></tr>`;
  }).join('');
  dom.itemsTableContainer.innerHTML = `${header}${rows}</tbody></table></div>`;

  dom.itemsTableContainer.querySelectorAll('input[type=checkbox]').forEach(checkbox => {
    checkbox.addEventListener('change', handleAssignmentChange);
  });
  dom.itemsTableContainer.querySelectorAll('button[data-delete-item]').forEach(button => {
    button.addEventListener('click', handleDeleteItem);
  });
}

function handleDeleteItem(event) {
  const itemId = event.currentTarget.dataset.deleteItem;
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  const confirmed = window.confirm(`Delete ${item.name}?`);
  if (!confirmed) return;

  state.items = state.items.filter(i => i.id !== itemId);
  renderApp();
}

function handleAssignmentChange(event) {
  const itemId = event.target.dataset.item;
  const personId = event.target.dataset.person;
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  if (event.target.checked) {
    if (!item.assignedTo.includes(personId)) {
      item.assignedTo.push(personId);
    }
  } else {
    item.assignedTo = item.assignedTo.filter(id => id !== personId);
    if (item.assignedTo.length === 0) {
      item.assignedTo = [state.people[0]?.id || personId];
    }
  }

  renderApp();
}

function calculateTotals() {
  if (!state.people.length) return [];

  const baseTotals = state.people.reduce((acc, person) => {
    acc[person.id] = { name: person.name, itemSubtotal: 0, tip: 0, tax: 0, total: 0, lines: [] };
    return acc;
  }, {});

  const receiptSum = state.items.reduce((sum, item) => sum + item.price, 0);
  const tipAmount = parseNumber((receiptSum * state.tipPercent) / 100);
  const taxAmount = state.parsedTax;

  state.items.forEach(item => {
    if (!item.assignedTo.length) return;
    const assignedCount = Math.max(1, item.assignedTo.length);
    const share = item.price / assignedCount;
    item.assignedTo.forEach(personId => {
      baseTotals[personId].itemSubtotal += share;
      baseTotals[personId].lines.push({
        name: item.name,
        share: roundToTwo(share),
        splitCount: assignedCount,
      });
    });
  });

  const subtotalTotal = Object.values(baseTotals).reduce((sum, person) => sum + person.itemSubtotal, 0);
  const splitByProportion = state.splitMethod === 'proportional';

  Object.values(baseTotals).forEach(person => {
    if (splitByProportion) {
      const ratio = subtotalTotal > 0 ? person.itemSubtotal / subtotalTotal : 1 / state.people.length;
      person.tip = roundToTwo(tipAmount * ratio);
      person.tax = roundToTwo(taxAmount * ratio);
    } else {
      const count = state.people.length;
      person.tip = roundToTwo(tipAmount / count);
      person.tax = roundToTwo(taxAmount / count);
    }
    person.total = roundToTwo(person.itemSubtotal + person.tip + person.tax);
  });

  return Object.values(baseTotals).map(person => ({ ...person }));
}

function renderResults() {
  if (!state.items.length) {
    dom.resultsContainer.innerHTML = '<div class="empty-state"><p class="small">Results appear after parsing a receipt and assigning items.</p></div>';
    return;
  }

  const personTotals = calculateTotals();
  if (!personTotals.length) {
    dom.resultsContainer.innerHTML = '<div class="empty-state"><p class="small">Add people and assign items to calculate totals.</p></div>';
    return;
  }

  const grandTotal = roundToTwo(personTotals.reduce((sum, person) => sum + person.total, 0));
  const grandSubtotal = roundToTwo(personTotals.reduce((sum, person) => sum + person.itemSubtotal, 0));
  const grandTip = roundToTwo(personTotals.reduce((sum, person) => sum + person.tip, 0));
  const grandTax = roundToTwo(personTotals.reduce((sum, person) => sum + person.tax, 0));

  const summary = `
    <div class="summary-card">
      <div><strong>Bill summary</strong></div>
      <div class="stats">
        <div class="stat"><span class="muted">Subtotal</span><strong>${formatMoney(grandSubtotal)}</strong></div>
        <div class="stat"><span class="muted">Tip</span><strong>${formatMoney(grandTip)}</strong></div>
        <div class="stat"><span class="muted">Tax</span><strong>${formatMoney(grandTax)}</strong></div>
      </div>
      <div style="margin-top: 8px;"><span class="badge">Grand total: ${formatMoney(grandTotal)}</span></div>
    </div>
  `;

  const cards = personTotals.map(person => `
    <div class="receipt-card">
      <div class="receipt-paper">
        <div class="receipt-header">
          <strong>${escapeHtml(state.store || 'Receipt')}</strong>
          <span class="small">${escapeHtml(state.date || 'Date unavailable')}</span>
          <span class="badge">${escapeHtml(person.name)}</span>
        </div>
        ${person.lines.length ? person.lines.map(line => `
          <div class="receipt-line">
            <div>
              <div>${escapeHtml(line.name)}</div>
              <div class="small">${line.splitCount > 1 ? `Split ${line.splitCount} ways` : 'Shared evenly'}</div>
            </div>
            <strong>${formatMoney(line.share)}</strong>
          </div>
        `).join('') : '<div class="empty-state"><p class="small">No items assigned yet.</p></div>'}
        <div class="receipt-line"><span>Tip</span><strong>${formatMoney(person.tip)}</strong></div>
        <div class="receipt-line"><span>Tax</span><strong>${formatMoney(person.tax)}</strong></div>
        <div class="receipt-total"><span>Total</span><span>${formatMoney(person.total)}</span></div>
      </div>
    </div>
  `).join('');

  dom.resultsContainer.innerHTML = `<div class="results-grid"><div class="stack">${summary}<div class="stack">${cards}</div></div></div>`;
}

function resetApp() {
  state.store = '';
  state.date = '';
  state.items = [];
  state.people = [];
  state.tipPercent = 10;
  state.splitMethod = 'proportional';
  state.parsedSubtotal = 0;
  state.parsedTax = 0;
  state.parsedTotal = 0;
  state.error = '';
  state.loading = false;
  dom.receiptInput.value = '';
  dom.receiptPreview.src = '';
  dom.previewArea.style.display = 'none';
  if (dom.newItemName) dom.newItemName.value = '';
  if (dom.newItemPrice) dom.newItemPrice.value = '';
  showStatus('', false);
  renderApp();
}

function showStatus(message, isError = false, isLoading = false) {
  if (!message) {
    dom.statusMessage.style.display = 'none';
    dom.statusMessage.textContent = '';
    dom.statusMessage.className = 'notice';
    return;
  }
  dom.statusMessage.style.display = 'block';
  dom.statusMessage.textContent = message;
  dom.statusMessage.className = isError ? 'notice error' : isLoading ? 'notice' : 'notice success';
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return Number.isInteger(amount) ? `R${amount}` : `R${amount.toFixed(2)}`;
}

function roundToTwo(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function escapeHtml(value) {
  return String(value).replace(/[&"'<>]/g, tag => ({ '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' }[tag]));
}
