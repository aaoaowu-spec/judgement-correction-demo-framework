const storageKey = "judgementCorrectionDemoState";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { questions: [] };
  } catch {
    return { questions: [] };
  }
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent.trim();
}

const state = loadState();
state.hasNG = Boolean(state.hasNG);
state.answerDisplayStyle = state.answerDisplayStyle || "TF";
state.scorePerItem = Number(state.scorePerItem || 1);

let mode = "teacher";
const studentAnswers = { ...(state.studentAnswers || {}) };
const studentFillAnswers = { ...(state.studentFillAnswers || {}) };
const studentShortAnswers = { ...(state.studentShortAnswers || {}) };
let submitted = false;

function questions() {
  return state.questions && state.questions.length
    ? state.questions
    : [{ id: "demo", stem: "题干1", answer: "T" }];
}

function answerLabels() {
  const map = {
    TF: ["T", "F"],
    tick: ["√", "×"],
    text: ["对", "错"]
  };
  const labels = map[state.answerDisplayStyle] || map.TF;
  return state.hasNG ? [...labels, "NG"] : labels;
}

function valueForLabel(label) {
  if (label === "NG") return "NG";
  if (state.answerDisplayStyle === "tick") return label === "√" ? "T" : "F";
  if (state.answerDisplayStyle === "text") return label === "对" ? "T" : "F";
  return label;
}

function addonAnswerHtml(question, id) {
  const answer = question.answer || "T";
  if (question.judgeMode === "fill") {
    const fillAnswer = stripHtml(question.fillAnswer) || "1";
    return `${answer}<br><span class="reader-sub-answer">(1) ${fillAnswer}</span>`;
  }
  if (question.judgeMode === "short") {
    const shortAnswer = stripHtml(question.shortAnswer) || "1";
    return `${answer}<br><span class="reader-sub-answer">${shortAnswer}</span>`;
  }
  return answer;
}

function addonQuestionHtml(question, id) {
  if (mode === "student" && !submitted && !studentAnswers[id]) return "";

  if (question.judgeMode === "fill") {
    const addonStem = stripHtml(question.addonStem) || "111(1)";
    const fillAnswer = stripHtml(question.fillAnswer) || "1";
    const studentValue = studentFillAnswers[id] || "";
    return `
      <div class="reader-addon-row fill-addon ${submitted ? "submitted" : ""}">
        <div></div>
        <div class="reader-fill-display">
          ${addonStem}
          ${submitted
            ? `<span class="reader-fill-blank">${studentValue || "_"}</span> <span class="reader-fill-standard">(1)</span>`
            : `<input class="reader-fill-input" data-addon="fill" value="${studentValue}" aria-label="填空答案">`
          }
        </div>
      </div>
    `;
  }
  if (question.judgeMode === "short") {
    const shortAnswer = stripHtml(question.shortAnswer) || "1";
    const studentValue = studentShortAnswers[id] || "";
    return `
      <div class="reader-addon-row short-addon ${submitted ? "submitted" : ""}">
        <div></div>
        <div class="reader-short-box">
          ${submitted
            ? `<span>${studentValue || shortAnswer || "11"}</span>`
            : `<textarea data-addon="short" maxlength="10000" placeholder="请输入">${studentValue}</textarea>`
          }
          <em>${submitted ? "" : `${studentValue.length} / 10000`}</em>
        </div>
      </div>
    `;
  }
  return "";
}

function renderQuestions() {
  const area = document.getElementById("readerQuestionArea");
  const labels = answerLabels();
  area.innerHTML = questions().map((question, index) => {
    const id = question.id || `q-${index}`;
    const stem = stripHtml(question.stem) || `题干${index + 1}`;
    const answer = question.answer || "T";
    const selected = studentAnswers[id] || "";
    return `
      <article class="reader-question" data-id="${id}">
        <div class="reader-question-row ${state.hasNG ? "with-ng" : ""}">
          <div class="reader-options ${state.hasNG ? "with-ng" : ""}">
            ${labels.map(label => {
              const value = valueForLabel(label);
              return `
                <button
                  class="reader-tf ${mode === "teacher" && answer === value ? "correct teacher-green" : ""} ${mode === "student" && selected === value ? "selected" : ""} ${submitted && answer === value ? "correct-after" : ""}"
                  data-value="${value}"
                  type="button"
                >${label}</button>
              `;
            }).join("")}
          </div>
          <div class="reader-stem">${stem}</div>
        </div>
        ${addonQuestionHtml(question, id)}
        <div class="reader-answer ${submitted ? "show-after-submit" : ""}">
          <div class="reader-answer-title"><span>✦</span> 答案⌃</div>
          <div class="reader-answer-value">${addonAnswerHtml(question, id)}</div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".reader-tf").forEach(btn => {
    btn.addEventListener("click", () => {
      if (mode !== "student" || submitted) return;
      const card = btn.closest(".reader-question");
      studentAnswers[card.dataset.id] = btn.dataset.value;
      state.studentAnswers = { ...studentAnswers };
      localStorage.setItem(storageKey, JSON.stringify(state));
      renderQuestions();
    });
  });

  document.querySelectorAll("[data-addon='fill']").forEach(input => {
    input.addEventListener("input", () => {
      const card = input.closest(".reader-question");
      studentFillAnswers[card.dataset.id] = input.value;
      state.studentFillAnswers = { ...studentFillAnswers };
      localStorage.setItem(storageKey, JSON.stringify(state));
    });
  });

  document.querySelectorAll("[data-addon='short']").forEach(input => {
    input.addEventListener("input", () => {
      const card = input.closest(".reader-question");
      studentShortAnswers[card.dataset.id] = input.value;
      input.closest(".reader-short-box").querySelector("em").textContent = `${input.value.length} / 10000`;
      state.studentShortAnswers = { ...studentShortAnswers };
      localStorage.setItem(storageKey, JSON.stringify(state));
    });
  });
}

function setMode(nextMode) {
  mode = nextMode;
  submitted = false;
  document.body.classList.toggle("teacher-mode", mode === "teacher");
  document.body.classList.toggle("student-mode", mode === "student");
  document.body.classList.remove("submitted-mode");
  updateSubmitButton();
  renderScore();
  renderQuestions();
}

function scoreValue() {
  return questions().reduce((sum, question, index) => {
    const id = question.id || `q-${index}`;
    const answer = question.answer || "T";
    return sum + (studentAnswers[id] === answer ? state.scorePerItem : 0);
  }, 0);
}

function renderScore() {
  let score = document.getElementById("scoreBadge");
  if (!submitted) {
    if (score) score.remove();
    return;
  }
  if (!score) {
    score = document.createElement("div");
    score.id = "scoreBadge";
    score.className = "score-badge";
    const pills = document.querySelector(".reader-card-head > div");
    pills.appendChild(score);
  }
  score.innerHTML = `<span class="score-stroke">✓</span> 得分：${scoreValue()} 分`;
}

function updateSubmitButton() {
  const btn = document.getElementById("submitBtn");
  btn.textContent = submitted ? "↻ 重新作答" : "⇧ 提交";
}

document.querySelectorAll('input[name="mode"]').forEach(input => {
  input.addEventListener("change", () => setMode(input.value));
});

document.getElementById("submitBtn").addEventListener("click", () => {
  if (!submitted) {
    submitted = true;
    document.body.classList.add("submitted-mode");
    renderScore();
    updateSubmitButton();
    renderQuestions();
    return;
  }
  submitted = false;
  Object.keys(studentAnswers).forEach(key => delete studentAnswers[key]);
  Object.keys(studentFillAnswers).forEach(key => delete studentFillAnswers[key]);
  Object.keys(studentShortAnswers).forEach(key => delete studentShortAnswers[key]);
  state.studentAnswers = {};
  state.studentFillAnswers = {};
  state.studentShortAnswers = {};
  localStorage.setItem(storageKey, JSON.stringify(state));
  document.body.classList.remove("submitted-mode");
  renderScore();
  updateSubmitButton();
  renderQuestions();
});

setMode("teacher");
