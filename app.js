const STORAGE_KEY = "dailyTasks.v1";
const TODAY_KEY = "dailyTasks.currentDay";
const DONE_KEY = "dailyTasks.doneMap";
const MARKED_KEY = "dailyTasks.markedMap";
const MARK_TITLE_KEY = "dailyTasks.markTitle";
const DEFAULT_MARK_TITLE = "标记";
const taskItemMarkup = `
  <button class="check-button" type="button" aria-label="完成" title="完成" aria-pressed="false">
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="3"></rect>
      <path d="m8 12 3 3 5-6"></path>
    </svg>
  </button>
  <button class="mark-button" type="button" aria-pressed="false">
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11.5 2.8a.6.6 0 0 1 1 0l2.6 5.3 5.9.9a.6.6 0 0 1 .3 1l-4.3 4.2 1 5.9a.6.6 0 0 1-.8.6L12 18l-5.2 2.7a.6.6 0 0 1-.8-.6l1-5.9L2.7 10a.6.6 0 0 1 .3-1l5.9-.9z"></path>
    </svg>
  </button>
  <div class="task-content">
    <textarea class="task-input" rows="1" aria-label="任务内容"></textarea>
    <label class="time-field">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 7v5l3 2"></path>
      </svg>
      <input class="time-input" type="text" autocomplete="off" placeholder="时间" aria-label="任务时间">
    </label>
  </div>
  <div class="task-actions">
    <span class="drag-handle" aria-hidden="true" title="拖动排序">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="9" cy="5" r="1"></circle>
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="9" cy="19" r="1"></circle>
        <circle cx="15" cy="5" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <circle cx="15" cy="19" r="1"></circle>
      </svg>
    </span>
    <button class="delete-button" type="button" aria-label="删除任务" title="删除任务">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" /></svg>
    </button>
  </div>
`;

const defaults = [
  "喝水和早餐",
  "整理今天最重要的一件事",
  "运动或散步 20 分钟",
];

const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const addTaskForm = document.querySelector("#addTaskForm");
const addButton = addTaskForm.querySelector(".add-button");
const newTaskInput = document.querySelector("#newTaskInput");
const refreshDayButton = document.querySelector("#refreshDayButton");
const clearDoneButton = document.querySelector("#clearDoneButton");
const exportTasksButton = document.querySelector("#exportTasksButton");
const editMarkTitleButton = document.querySelector("#editMarkTitleButton");
const markTitleLabel = document.querySelector("#markTitleLabel");
const markTitleDialog = document.querySelector("#markTitleDialog");
const markTitleForm = document.querySelector("#markTitleForm");
const markTitleInput = document.querySelector("#markTitleInput");
const cancelMarkTitleButton = document.querySelector("#cancelMarkTitleButton");
const sortStatus = document.querySelector("#sortStatus");
const weekdayLabel = document.querySelector("#weekdayLabel");
const dateLabel = document.querySelector("#dateLabel");
const progressLabel = document.querySelector("#progressLabel");
const percentLabel = document.querySelector("#percentLabel");
const progressRing = document.querySelector(".progress-ring");

let tasks = loadTasks();
let doneMap = loadToggleMap(DONE_KEY);
let markedMap = loadToggleMap(MARKED_KEY);
let markTitle = localStorage.getItem(MARK_TITLE_KEY) || DEFAULT_MARK_TITLE;
let drag = null;

function makeTaskId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ensureTodayList() {
  const storedDay = localStorage.getItem(TODAY_KEY);
  const currentDay = todayId();

  if (storedDay !== currentDay) {
    resetDayChecks(currentDay);
  }
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaults.map((text) => ({ id: makeTaskId(), text, time: "" }));
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((task) => task?.id && typeof task.text === "string")
      .map((task) => ({
        id: task.id,
        text: task.text,
        time: typeof task.time === "string" ? task.time : "",
      }));
  } catch {
    return defaults.map((text) => ({ id: makeTaskId(), text, time: "" }));
  }
}

function loadToggleMap(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function toggleCheck(map, key, id) {
  if (map[id]) {
    delete map[id];
  } else {
    map[id] = true;
  }
  localStorage.setItem(key, JSON.stringify(map));
}

function resetDayChecks(day) {
  doneMap = {};
  markedMap = {};
  localStorage.removeItem(DONE_KEY);
  localStorage.removeItem(MARKED_KEY);
  localStorage.setItem(TODAY_KEY, day);
}

function fitTaskInput(input) {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight + 1}px`;
}

function createTaskNode() {
  const node = document.createElement("li");
  node.className = "task-item";
  node.innerHTML = taskItemMarkup;
  return node;
}

function saveTaskMove(fromIndex, toIndex) {
  if (fromIndex === toIndex) {
    return;
  }

  const [task] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, task);
  saveTasks();
  sortStatus.textContent = `任务已移到第 ${toIndex + 1} 项`;
}

function beginDrag(event) {
  const handle = event.target.closest(".drag-handle");
  if (!handle || drag || !event.isPrimary || event.button !== 0 || tasks.length < 2) {
    return;
  }

  const row = handle.closest(".task-item");
  drag = {
    pointerId: event.pointerId,
    row,
    fromIndex: Array.from(taskList.children).indexOf(row),
    startY: event.clientY,
    y: event.clientY,
    grabOffset: event.clientY - row.getBoundingClientRect().top,
    translation: 0,
    frame: null,
  };
  taskList.setPointerCapture(event.pointerId);
}

function followDrag(event) {
  if (drag?.pointerId !== event.pointerId) {
    return;
  }

  drag.y = event.clientY;
  if (drag.frame === null && Math.abs(drag.y - drag.startY) >= 6) {
    drag.row.classList.add("dragging");
    drag.frame = requestAnimationFrame(animateDrag);
  }
}

function positionDraggedTask(state) {
  const { row, y, grabOffset } = state;
  const top = y - grabOffset;
  const middle = top + row.offsetHeight / 2;
  const next = Array.from(taskList.children).find((candidate) => {
    if (candidate === row) {
      return false;
    }
    const rect = candidate.getBoundingClientRect();
    return middle < rect.top + rect.height / 2;
  }) ?? null;

  if (next !== row.nextElementSibling) {
    taskList.insertBefore(row, next);
  }

  // The row keeps its grid slot while its painted position follows the pointer.
  state.translation += top - row.getBoundingClientRect().top;
  row.style.setProperty("--drag-offset", `${state.translation}px`);
}

function animateDrag() {
  const edge = 64;
  const bottom = Math.min(window.innerHeight, addTaskForm.getBoundingClientRect().top);
  const up = Math.max(0, edge - drag.y);
  const down = Math.max(0, drag.y - (bottom - edge));
  const scroll = Math.max(-18, Math.min(18, (down - up) / 4));
  if (scroll) {
    window.scrollBy(0, scroll);
  }

  positionDraggedTask(drag);
  drag.frame = requestAnimationFrame(animateDrag);
}

function endDrag(commit) {
  if (!drag) {
    return;
  }
  const state = drag;
  drag = null;

  if (state.frame !== null) {
    cancelAnimationFrame(state.frame);
    if (commit) {
      positionDraggedTask(state);
      saveTaskMove(state.fromIndex, Array.from(taskList.children).indexOf(state.row));
    } else {
      const remaining = Array.from(taskList.children).filter((row) => row !== state.row);
      taskList.insertBefore(state.row, remaining[state.fromIndex] ?? null);
    }
    state.row.classList.remove("dragging");
    state.row.style.removeProperty("--drag-offset");
  }

  if (taskList.hasPointerCapture(state.pointerId)) {
    taskList.releasePointerCapture(state.pointerId);
  }
}

function renderDate() {
  const now = new Date();
  weekdayLabel.textContent = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(now);
  dateLabel.textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
  }).format(now);
}

function renderTasks() {
  endDrag(false);
  taskList.replaceChildren();
  tasks.forEach(appendTaskRow);
  renderSummary();
}

function appendTaskRow(task) {
  const node = createTaskNode();
  const checkButton = node.querySelector(".check-button");
  const markButton = node.querySelector(".mark-button");
  const taskInput = node.querySelector(".task-input");
  const timeInput = node.querySelector(".time-input");
  const deleteButton = node.querySelector(".delete-button");

  node.dataset.id = task.id;
  node.classList.toggle("done", Boolean(doneMap[task.id]));
  taskInput.value = task.text;
  timeInput.value = task.time || "";
  checkButton.setAttribute("aria-pressed", Boolean(doneMap[task.id]));
  markButton.setAttribute("aria-pressed", Boolean(markedMap[task.id]));
  markButton.setAttribute("aria-label", markTitle);
  markButton.title = markTitle;

  checkButton.addEventListener("click", () => {
    toggleCheck(doneMap, DONE_KEY, task.id);
    const isDone = Boolean(doneMap[task.id]);
    node.classList.toggle("done", isDone);
    checkButton.setAttribute("aria-pressed", isDone);
    renderSummary();
  });

  markButton.addEventListener("click", () => {
    toggleCheck(markedMap, MARKED_KEY, task.id);
    markButton.setAttribute("aria-pressed", Boolean(markedMap[task.id]));
  });

  taskInput.addEventListener("input", () => {
    task.text = taskInput.value;
    fitTaskInput(taskInput);
    saveTasks();
  });

  taskInput.addEventListener("blur", () => {
    task.text = taskInput.value.trim();
    taskInput.value = task.text;
    fitTaskInput(taskInput);
    saveTasks();
    renderSummary();
  });

  timeInput.addEventListener("input", () => {
    task.time = timeInput.value;
    saveTasks();
  });

  timeInput.addEventListener("blur", () => {
    task.time = timeInput.value.trim();
    timeInput.value = task.time;
    saveTasks();
  });

  deleteButton.addEventListener("click", () => {
    tasks = tasks.filter((item) => item.id !== task.id);
    delete doneMap[task.id];
    delete markedMap[task.id];
    saveTasks();
    localStorage.setItem(DONE_KEY, JSON.stringify(doneMap));
    localStorage.setItem(MARKED_KEY, JSON.stringify(markedMap));
    renderTasks();
  });

  taskList.append(node);
  fitTaskInput(taskInput);
}

function renderSummary() {
  const total = tasks.length;
  const done = tasks.filter((task) => doneMap[task.id]).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  emptyState.classList.toggle("visible", total === 0);
  if (exportTasksButton) exportTasksButton.disabled = total === 0;
  percentLabel.textContent = `${percent}%`;
  progressRing.style.setProperty("--progress", `${percent * 3.6}deg`);

  if (total === 0) {
    progressLabel.textContent = "空清单也算一种轻松";
  } else if (done === total) {
    progressLabel.textContent = "今天全部完成";
  } else if (done === 0) {
    progressLabel.textContent = `还有 ${total} 项待完成`;
  } else {
    progressLabel.textContent = `已完成 ${done} / ${total} 项`;
  }
}

function addTask(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  endDrag(false);
  const task = { id: makeTaskId(), text: trimmed, time: "" };
  tasks.push(task);
  saveTasks();
  appendTaskRow(task);
  renderSummary();
}

// The iPhone keyboard can shrink and pan the visible area without resizing the page.
const viewport = window.visualViewport;
if (viewport) {
  const syncComposerEdge = () => {
    const edge = Math.abs(viewport.scale - 1) < 0.01
      ? `${viewport.offsetTop + viewport.height}px` : "100%";
    addTaskForm.style.setProperty("--visible-bottom", edge);
  };
  viewport.addEventListener("resize", syncComposerEdge);
  viewport.addEventListener("scroll", syncComposerEdge);
  addTaskForm.addEventListener("focusin", syncComposerEdge);
  syncComposerEdge();
}

// Cancel only the mouse focus change; cancelling touch pointerdown can swallow Safari's click.
addButton.addEventListener("mousedown", (event) => {
  if (event.button === 0 && document.activeElement === newTaskInput) {
    event.preventDefault();
  }
});

newTaskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    addButton.click();
  }
});

addTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(newTaskInput.value);
  newTaskInput.value = "";
  if (document.activeElement !== newTaskInput) {
    newTaskInput.focus({ preventScroll: true });
  }
});

function refreshDay() {
  resetDayChecks(todayId());
  renderDate();
  renderTasks();
}

function csvCell(value) {
  const text = String(value);
  // Keep user-entered formulas as plain text when a spreadsheet opens the file.
  const safe = /^\s*[=+@＝＋－＠-]/u.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function exportTasks() {
  if (!tasks.length) return;
  const rows = [
    ["序号", "任务", "时间", "完成", markTitle],
    ...tasks.map((task, index) => [
      index + 1, task.text, task.time, doneMap[task.id] ? "是" : "否", markedMap[task.id] ? "是" : "否",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const file = new Blob(["\uFEFF", csv, "\r\n"], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `每日任务-${todayId()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  // Give Safari time to read the file before releasing its URL.
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

function updateMarkTitle() {
  markTitleLabel.textContent = markTitle;
  editMarkTitleButton.setAttribute("aria-label", `${markTitle}，编辑列名`);
  for (const button of taskList.querySelectorAll(".mark-button")) {
    button.setAttribute("aria-label", markTitle);
    button.title = markTitle;
  }
}

editMarkTitleButton.addEventListener("click", () => {
  markTitleInput.value = markTitle;
  markTitleDialog.showModal();
  markTitleInput.focus();
  markTitleInput.select();
});

markTitleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  markTitle = markTitleInput.value.trim() || DEFAULT_MARK_TITLE;
  localStorage.setItem(MARK_TITLE_KEY, markTitle);
  updateMarkTitle();
  markTitleDialog.close();
});

cancelMarkTitleButton.addEventListener("click", () => markTitleDialog.close());
refreshDayButton.addEventListener("click", refreshDay);
clearDoneButton.addEventListener("click", refreshDay);
exportTasksButton?.addEventListener("click", exportTasks);

taskList.addEventListener("pointerdown", beginDrag);
taskList.addEventListener("pointermove", followDrag);
taskList.addEventListener("pointerup", (event) => {
  if (drag?.pointerId === event.pointerId) {
    drag.y = event.clientY;
    endDrag(true);
  }
});
taskList.addEventListener("pointercancel", (event) => {
  if (drag?.pointerId === event.pointerId) endDrag(false);
});
taskList.addEventListener("lostpointercapture", (event) => {
  if (drag?.pointerId === event.pointerId) endDrag(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (drag) endDrag(false);

});
window.addEventListener("resize", () => {
  taskList.querySelectorAll(".task-input").forEach(fitTaskInput);
});

if (localStorage.getItem(STORAGE_KEY) === null) {
  saveTasks();
}
ensureTodayList();
renderDate();
renderTasks();
updateMarkTitle();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
