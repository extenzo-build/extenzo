// Placeholder __ENTRY_NAMES__ is replaced at build time with JSON array of entry names
const entryNames = __ENTRY_NAMES__;

function normalizeEntry(name) {
  if (typeof name === "string" && name.trim()) return name.trim();
  return "unknown";
}

function buildItemFromMsg(msg) {
  const ts = (msg.time != null && Number.isFinite(Number(msg.time))) ? Number(msg.time) : Date.now();
  const time = new Date(ts).toLocaleTimeString();
  const message = msg.message ? String(msg.message) : "Unknown error";
  const stack = msg.stack ? String(msg.stack) : "";
  const filename = msg.filename ? String(msg.filename) : "";
  const lineno = Number.isFinite(msg.lineno) ? Number(msg.lineno) : 0;
  const colno = Number.isFinite(msg.colno) ? Number(msg.colno) : 0;
  return { type: msg.type || "error", ts, time, message, stack, filename, lineno, colno };
}

class ExtenzoMonitorUI {
  constructor(names) {
    this.entryNames = names;
    this.state = Object.create(null);
    this.counts = Object.create(null);
    this.tabButtons = new Map();
    this.tabsEl = document.getElementById("tabs");
    this.listWrapper = document.getElementById("list-wrapper");
    this.listInner = document.getElementById("list-inner");
    this.headerTitle = document.getElementById("header-title");
    this.clearBtn = document.getElementById("clear-btn");
    this.ITEM_HEIGHT = 140;
    this.ITEM_GAP = 8;
    this.ITEM_SLOT_HEIGHT = this.ITEM_HEIGHT + this.ITEM_GAP;
    this.OVERSCAN = 2;
    this.activeEntry = this.entryNames[0] || "unknown";
  }

  ensureEntry(name) {
    if (this.state[name]) return;
    this.state[name] = [];
    this.counts[name] = 0;
    this.createTab(name);
  }

  createTab(name) {
    if (!this.tabsEl) return;
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.entry = name;
    btn.innerHTML = name + "<span class=\"count\">0</span>";
    const self = this;
    btn.addEventListener("click", function () { self.setActive(name); });
    this.tabButtons.set(name, btn);
    this.tabsEl.appendChild(btn);
  }

  setActive(name) {
    this.activeEntry = name;
    this.updateActive();
    this.renderList(name);
    if (this.listWrapper) this.listWrapper.scrollTop = 0;
  }

  updateActive() {
    for (const entry of this.tabButtons.keys()) {
      const btn = this.tabButtons.get(entry);
      btn.classList.toggle("active", entry === this.activeEntry);
    }
    if (this.headerTitle) this.headerTitle.textContent = this.activeEntry + " errors";
  }

  clearCurrentList() {
    if (!this.state[this.activeEntry]) return;
    this.state[this.activeEntry] = [];
    this.counts[this.activeEntry] = 0;
    this.updateCount(this.activeEntry);
    this.renderList(this.activeEntry);
  }

  createListItem(item, index) {
    const self = this;
    const li = document.createElement("li");
    li.className = "item";
    li.style.top = (index * this.ITEM_SLOT_HEIGHT) + "px";
    const header = document.createElement("div");
    header.className = "item-header";
    const meta = document.createElement("div");
    meta.className = "meta";
    const typeSpan = document.createElement("span");
    typeSpan.className = "item-meta";
    typeSpan.textContent = item.type;
    const timeSpan = document.createElement("span");
    timeSpan.className = "item-time";
    timeSpan.textContent = " • " + item.time;
    meta.appendChild(typeSpan);
    meta.appendChild(timeSpan);
    const copyBtn = document.createElement("button");
    copyBtn.className = "item-copy";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", function () {
      const text = [item.type, item.time, item.message].filter(Boolean).join(" | ") + (item.filename ? "\n" + item.filename + (item.lineno || item.colno ? ":" + (item.lineno || 0) + ":" + (item.colno || 0) : "") : "") + (item.stack ? "\n" + item.stack : "");
      navigator.clipboard.writeText(text).then(function () {
        copyBtn.textContent = "Copied";
        setTimeout(function () { copyBtn.textContent = "Copy"; }, 600);
      }).catch(function () {});
    });
    header.appendChild(meta);
    header.appendChild(copyBtn);
    li.appendChild(header);
    const body = document.createElement("div");
    body.className = "item-body";
    const title = document.createElement("div");
    title.className = "item-message";
    title.textContent = item.message;
    body.appendChild(title);
    if (item.filename) {
      const file = document.createElement("div");
      file.className = "file item-file";
      const pos = item.lineno || item.colno ? ":" + (item.lineno || 0) + ":" + (item.colno || 0) : "";
      file.textContent = item.filename + pos;
      body.appendChild(file);
    }
    if (item.stack) {
      const pre = document.createElement("pre");
      pre.className = "item-stack";
      pre.textContent = item.stack;
      body.appendChild(pre);
    }
    li.appendChild(body);
    return li;
  }

  updateVisible(name) {
    if (!this.listInner || !this.listWrapper) return;
    const items = this.state[name] || [];
    if (items.length === 0) return;
    const scrollTop = this.listWrapper.scrollTop;
    const height = this.listWrapper.clientHeight;
const startIndex = Math.max(0, Math.floor(scrollTop / this.ITEM_SLOT_HEIGHT) - this.OVERSCAN);
      const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / this.ITEM_SLOT_HEIGHT) + this.OVERSCAN);
    this.listInner.innerHTML = "";
    for (let i = startIndex; i < endIndex; i++) {
      this.listInner.appendChild(this.createListItem(items[i], i));
    }
  }

  renderList(name) {
    if (!this.listInner || !this.listWrapper) return;
    const items = this.state[name] || [];
    if (items.length === 0) {
      this.listInner.style.height = "auto";
      this.listInner.innerHTML = "";
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No errors";
      this.listInner.appendChild(empty);
      return;
    }
    this.listInner.style.height = (items.length * this.ITEM_SLOT_HEIGHT) + "px";
    this.updateVisible(name);
  }

  updateCount(name) {
    const btn = this.tabButtons.get(name);
    if (!btn) return;
    const span = btn.querySelector(".count");
    if (span) span.textContent = String(this.counts[name] || 0);
  }

  addItem(name, item) {
    this.ensureEntry(name);
    this.state[name].push(item);
    this.state[name].sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    this.counts[name] = (this.counts[name] || 0) + 1;
    this.updateCount(name);
    if (name === this.activeEntry) this.renderList(name);
  }

  listenRuntime() {
    const self = this;
    const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;
    if (!runtime || !runtime.onMessage) return;
    runtime.onMessage.addListener(function (msg) {
      if (!(msg && msg.__EXTENZO_DEBUG__ === true)) return;
      const entry = normalizeEntry(msg.entry);
      self.addItem(entry, buildItemFromMsg(msg));
    });
  }

  requestBufferedErrors() {
    const self = this;
    const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;
    if (!runtime || typeof runtime.sendMessage !== "function") return;
    try {
      runtime.sendMessage(
        { __EXTENZO_DEBUG__: true, type: "monitor-ready" },
        function (response) {
          if (!response || !Array.isArray(response.buffered)) return;
          for (let i = 0; i < response.buffered.length; i++) {
            const item = response.buffered[i];
            if (!item) continue;
            const entry = normalizeEntry(item.entry);
            self.addItem(entry, buildItemFromMsg(item));
          }
        }
      );
    } catch (e) {}
  }

  init() {
    for (let i = 0; i < this.entryNames.length; i++) this.ensureEntry(this.entryNames[i]);
    this.updateActive();
    this.renderList(this.activeEntry);
    const self = this;
    if (this.listWrapper) {
      this.listWrapper.addEventListener("scroll", function () { self.updateVisible(self.activeEntry); });
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(function () { self.updateVisible(self.activeEntry); });
        ro.observe(this.listWrapper);
      }
    }
    if (this.clearBtn) this.clearBtn.addEventListener("click", function () { self.clearCurrentList(); });
    this.listenRuntime();
    this.requestBufferedErrors();
  }
}

(function () {
  const app = new ExtenzoMonitorUI(entryNames);
  app.init();
})();
