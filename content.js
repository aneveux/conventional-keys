/**
 * Conventional Keys - content.js
 * Shows a rofi-like menu when typing `/` into GitHub Pull Request comments.
 * Lets the user filter conventional comments prefixes and inserts a formatted prefix into the 
 * comment area.
 */

const TRIGGER_KEY = '/';
const POPUP_ID = 'conventional-keys-popup';
const POPUP_INPUT_ID = 'conventional-keys-input';
const POPUP_LIST_ID = 'conventional-keys-list';

/* Keyword definitions (definitions shown but NOT matched) */
const KEYWORDS = [
  { key: 'praise',   desc: 'Praises highlight something positive. Always try to leave at least one sincere praise per review.', decorators: false },
  { key: 'nitpick',  desc: 'Trivial, preference-based requests. Always non-blocking.', decorators: false },
  { key: 'suggestion', desc: 'Proposes a clear improvement. Can include decorators.', decorators: true },
  { key: 'issue',    desc: 'Highlights a concrete problem. Often paired with a suggestion. Can include decorators.', decorators: true },
  { key: 'todo',     desc: 'Small, trivial but necessary changes.', decorators: false },
  { key: 'question', desc: 'Asks for clarification or raises a potential concern. Can include decorators.', decorators: true },
  { key: 'thought',  desc: 'A non-blocking idea that came up during review. Can include decorators.', decorators: true },
  { key: 'chore',    desc: 'A simple, required task linked to process. Can include decorators.', decorators: true },
  { key: 'note',     desc: 'A non-blocking remark for awareness.', decorators: false },
  { key: 'typo',     desc: 'Notes a spelling error. Like a todo.', decorators: false },
  { key: 'polish',   desc: 'A suggestion to improve quality, even if nothing is broken.', decorators: false }
];

/* Decorators (only matched by decorator token) */
const DECORATORS = [
  { key: 'blocking', desc: 'Must be resolved before approval.' },
  { key: 'non-blocking', desc: 'Should not block merging.' },
  { key: 'if-minor', desc: 'Should only be resolved if the change is minor.' }
];

/* State */
let currentTarget = null;
let popupState = 'keywords'; // 'keywords' or 'decorators'
let selectedKeyword = null;

/* Utility */
function isEditable(elem) {
  if (!elem) return false;
  const tag = elem.tagName && elem.tagName.toLowerCase();
  return (tag === 'textarea') || (elem.isContentEditable);
}

/* Popup creation (single DOM reused for both steps) */
function createPopup() {
  if (document.getElementById(POPUP_ID)) return;
  const wrapper = document.createElement('div');
  wrapper.id = POPUP_ID;
  wrapper.innerHTML = `
    <div class="ck-card">
      <input id="${POPUP_INPUT_ID}" placeholder="Type to filter..." autofocus />
      <ul id="${POPUP_LIST_ID}" role="listbox"></ul>
      <div id="conventional-keys-hint" style="margin-top:8px;font-size:12px;opacity:0.8"></div>
    </div>
  `;
  document.body.appendChild(wrapper);

  const input = wrapper.querySelector('#' + POPUP_INPUT_ID);
  input.addEventListener('input', () => {
    const q = input.value;
    if (popupState === 'keywords') renderKeywordList(q);
    else renderDecoratorList(q);
  });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { cancelAndHide(); ev.stopPropagation(); }
    if (ev.key === 'Enter') { chooseHighlighted(); ev.preventDefault(); ev.stopPropagation(); }
    if (ev.key === 'ArrowDown') { moveHighlight(1); ev.preventDefault(); }
    if (ev.key === 'ArrowUp') { moveHighlight(-1); ev.preventDefault(); }
  });

  // initial
  renderKeywordList('');
}

/* Show popup for a target editable element */
function showPopup(target) {
  currentTarget = target;
  createPopup();
  popupState = 'keywords';
  selectedKeyword = null;
  const popup = document.getElementById(POPUP_ID);
  popup.style.display = 'flex';
  const input = popup.querySelector('#' + POPUP_INPUT_ID);
  input.value = '';
  input.focus();
  renderKeywordList('');
  setHint('Select a keyword. Type to filter. Enter to choose. Esc to cancel.');
}

/* Hide popup and restore focus */
function hidePopup() {
  const popup = document.getElementById(POPUP_ID);
  if (popup) popup.style.display = 'none';
  if (currentTarget) {
    try { currentTarget.focus(); } catch(e) {}
    currentTarget = null;
  }
}

/* Cancel entire flow without inserting */
function cancelAndHide() {
  selectedKeyword = null;
  popupState = 'keywords';
  hidePopup();
}

function setKeywordListItemContent(li, key, desc, decoratorFormat = false) {
  li.textContent = '';

  const strong = document.createElement('strong');
  strong.textContent = decoratorFormat ? '(' + key + ')' : '/' + key;
  li.appendChild(strong);

  li.appendChild(document.createTextNode(' — '));

  const span = document.createElement('span');
  span.className = 'ck-desc';

  const em = document.createElement('em');
  em.textContent = desc;

  span.appendChild(em);
  li.appendChild(span);
}

/* Render keyword list (filter only on keyword) */
function renderKeywordList(filter) {
  const list = document.getElementById(POPUP_LIST_ID);
  if (!list) return;
  const q = (filter || '').toLowerCase().trim();

  const matches = KEYWORDS
    .filter(k => q.length === 0 || k.key.includes(q));

  list.innerHTML = '';
  matches.forEach((m, idx) => {
    const li = document.createElement('li');
    li.tabIndex = 0;
    li.dataset.key = m.key;
    li.className = idx === 0 ? 'ck-item ck-highlight' : 'ck-item';
    // Show definition as italic, but DO NOT use it in matching
    setKeywordListItemContent(li, m.key, m.desc, false);
    li.addEventListener('click', () => onKeywordChosen(m.key));
    li.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') onKeywordChosen(m.key);
    });
    list.appendChild(li);
  });
}

/* When a keyword is chosen: either insert or advance to decorator step */
function onKeywordChosen(key) {
  const kw = KEYWORDS.find(k => k.key === key);
  if (!kw) return cancelAndHide();
  selectedKeyword = kw;
  if (kw.decorators) {
    // advance to decorator step
    popupState = 'decorators';
    const input = document.getElementById(POPUP_INPUT_ID);
    input.value = '';
    input.focus();
    renderDecoratorList('');
    setHint('Select a decorator for ' + key + '. Esc cancels. Enter inserts with decorator.');
  } else {
    // insert immediately
    insertPrefix(key, null);
    hidePopup();
  }
}

/* Render decorator list (filter on decorator key) */
function renderDecoratorList(filter) {
  const list = document.getElementById(POPUP_LIST_ID);
  if (!list) return;
  const q = (filter || '').toLowerCase().trim();

  const matches = DECORATORS.filter(d => q.length === 0 || d.key.includes(q));

  list.innerHTML = '';
  matches.forEach((m, idx) => {
    const li = document.createElement('li');
    li.tabIndex = 0;
    li.dataset.key = m.key;
    li.className = idx === 0 ? 'ck-item ck-highlight' : 'ck-item';
    setKeywordListItemContent(li, m.key, m.desc, true);
    li.addEventListener('click', () => onDecoratorChosen(m.key));
    li.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') onDecoratorChosen(m.key);
    });
    list.appendChild(li);
  });
}

/* When decorator chosen, insert combined prefix */
function onDecoratorChosen(decorator) {
  if (!selectedKeyword) return cancelAndHide();
  insertPrefix(selectedKeyword.key, decorator);
  hidePopup();
}

/* Insert prefix into currentTarget */
function insertPrefix(key, decorator) {
  if (!currentTarget) return;
  const prefix = decorator ? `**${key} (${decorator}):** ` : `**${key}:** `;
  if (currentTarget.isContentEditable) {
    insertAtContentEditable(currentTarget, prefix);
  } else if (currentTarget.tagName && currentTarget.tagName.toLowerCase() === 'textarea') {
    insertAtTextarea(currentTarget, prefix);
  } else {
    currentTarget.value = (currentTarget.value || '') + '\n' + prefix;
  }
}

/* Textarea insertion helper */
function insertAtTextarea(textarea, text) {
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value || '';
  const before = val.slice(0, start);
  const after = val.slice(end);
  const newVal = before + text + after;
  textarea.value = newVal;
  const pos = before.length + text.length;
  textarea.selectionStart = textarea.selectionEnd = pos;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/* contentEditable insertion helper */
function insertAtContentEditable(el, text) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    el.appendChild(document.createTextNode(text));
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/* Move highlight up/down */
function moveHighlight(delta) {
  const items = Array.from(document.querySelectorAll('.ck-item'));
  if (items.length === 0) return;
  const currentIndex = items.findIndex(i => i.classList.contains('ck-highlight'));
  let next = currentIndex + delta;
  if (next < 0) next = items.length - 1;
  if (next >= items.length) next = 0;
  if (items[currentIndex]) items[currentIndex].classList.remove('ck-highlight');
  items[next].classList.add('ck-highlight');
  items[next].focus();
}

/* Choose highlighted item depending on state */
function chooseHighlighted() {
  const el = document.querySelector('.ck-item.ck-highlight');
  if (!el) return;
  const key = el.dataset.key;
  if (popupState === 'keywords') onKeywordChosen(key);
  else if (popupState === 'decorators') onDecoratorChosen(key);
}

/* Simple escaping */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* Global keydown handler to open popup */
function onKeyDown(ev) {
  const tgt = ev.target;
  if (!isEditable(tgt)) return;
  if (ev.key === TRIGGER_KEY && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    // Only show popup if the element is empty
    let isEmpty = false;
    if (tgt.tagName && tgt.tagName.toLowerCase() === 'textarea') {
      isEmpty = (tgt.value || '').length === 0;
    } else if (tgt.isContentEditable) {
      isEmpty = (tgt.textContent || '').length === 0;
    }

    if (isEmpty) {
      ev.preventDefault();
      showPopup(tgt);
    }
    // If not empty, let the '/' character be typed normally (don't preventDefault)
  }
  if (ev.key === 'Escape') cancelAndHide();
}

/* Hint text setter */
function setHint(txt) {
  const el = document.getElementById('conventional-keys-hint');
  if (el) el.textContent = txt || '';
}

/* Init */
function init() {
  createPopup();
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', (ev) => {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    if (!popup.contains(ev.target)) cancelAndHide();
  });
}

init();
