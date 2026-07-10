const STORAGE_KEY = "dailyTasks.v1";
const TODAY_KEY = "dailyTasks.currentDay";
const DONE_KEY = "dailyTasks.doneMap";
const taskItemMarkup = `
  <button class="check-button" type="button" aria-label="标记完成">
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>
  </button>
  <textarea class="task-input" rows="1"></textarea>
  <button class="delete-button" type="button" aria-label="删除任务">
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 6h18"></path>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
    </svg>
  </button>
`;

const defaults = [
  "喝水和早餐",
  "整理今天最重要的一件事",
  "运动或散步 20 分钟",
];

const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const addTaskForm = document.querySelector("#addTaskForm");
const newTaskInput = document.querySelector("#newTaskInput");
const refreshDayButton = document.querySelector("#refreshDayButton");
const clearDoneButton = document.querySelector("#clearDoneButton");
const weekdayLabel = document.querySelector("#weekdayLabel");
const dateLabel = document.querySelector("#dateLabel");
const progressLabel = document.querySelector("#progressLabel");
const percentLabel = document.querySelector("#percentLabel");
const progressRing = document.querySelector(".progress-ring");

let tasks = loadTasks();
let doneMap = loadDoneMap();

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
    localStorage.setItem(TODAY_KEY, currentDay);
    doneMap = {};
    saveDoneMap();
  }
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaults.map((text) => ({ id: makeTaskId(), text }));
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((task) => task?.id && typeof task.text === "string") : [];
  } catch {
    return defaults.map((text) => ({ id: makeTaskId(), text }));
  }
}

function loadDoneMap() {
  const raw = localStorage.getItem(DONE_KEY);

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveDoneMap() {
  localStorage.setItem(DONE_KEY, JSON.stringify(doneMap));
}

function fitTaskInput(input) {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
}

function createTaskNode() {
  const node = document.createElement("li");
  node.className = "task-item";
  node.innerHTML = taskItemMarkup;
  return node;
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
  taskList.replaceChildren();

  tasks.forEach((task) => {
    const node = createTaskNode();
    const checkButton = node.querySelector(".check-button");
    const taskInput = node.querySelector(".task-input");
    const deleteButton = node.querySelector(".delete-button");

    node.dataset.id = task.id;
    node.classList.toggle("done", Boolean(doneMap[task.id]));
    taskInput.value = task.text;
    fitTaskInput(taskInput);
    checkButton.setAttribute("aria-label", doneMap[task.id] ? "取消完成" : "标记完成");

    checkButton.addEventListener("click", () => {
      doneMap[task.id] = !doneMap[task.id];

      if (!doneMap[task.id]) {
        delete doneMap[task.id];
      }

      saveDoneMap();
      renderTasks();
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

    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      delete doneMap[task.id];
      saveTasks();
      saveDoneMap();
      renderTasks();
    });

    taskList.append(node);
  });

  emptyState.classList.toggle("visible", tasks.length === 0);
  renderSummary();
}

function renderSummary() {
  const total = tasks.length;
  const done = tasks.filter((task) => doneMap[task.id]).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

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

  tasks.push({ id: makeTaskId(), text: trimmed });
  saveTasks();
  renderTasks();
}

addTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(newTaskInput.value);
  newTaskInput.value = "";
  newTaskInput.focus();
});

refreshDayButton.addEventListener("click", () => {
  localStorage.setItem(TODAY_KEY, todayId());
  doneMap = {};
  saveDoneMap();
  renderTasks();
});

clearDoneButton.addEventListener("click", () => {
  doneMap = {};
  saveDoneMap();
  renderTasks();
});

ensureTodayList();
renderDate();
renderTasks();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
