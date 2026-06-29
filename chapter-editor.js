const storageKey = "judgementCorrectionDemoState";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { questions: [] };
  } catch {
    return { questions: [] };
  }
}

function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent.trim();
}

function currentState() {
  const state = loadState();
  state.hasNG = Boolean(state.hasNG);
  state.answerDisplayStyle = state.answerDisplayStyle || "TF";
  state.autoJudge = state.autoJudge !== false;
  state.scorePerItem = Number(state.scorePerItem || 1);
  return state;
}

function answerLabels(style, hasNG) {
  const map = {
    TF: ["T", "F"],
    tick: ["√", "×"],
    text: ["对", "错"]
  };
  const labels = map[style] || map.TF;
  return hasNG ? [...labels, "NG"] : labels;
}

function valueForLabel(label, style) {
  if (label === "NG") return "NG";
  if (style === "tick") return label === "√" ? "T" : "F";
  if (style === "text") return label === "对" ? "T" : "F";
  return label;
}

function answerHtml(question, answer) {
  if (question.judgeMode === "fill") {
    const fillAnswer = stripHtml(question.fillAnswer) || "1";
    return `${answer}<br><span class="sub-answer">(1) ${fillAnswer}</span>`;
  }
  if (question.judgeMode === "short") {
    const shortAnswer = stripHtml(question.shortAnswer) || "1";
    return `${answer}<br><span class="sub-answer">${shortAnswer}</span>`;
  }
  return answer;
}

function addonHtml(question) {
  if (question.judgeMode === "fill") {
    const addonStem = stripHtml(question.addonStem) || "(1) 1";
    return `
      <div class="saved-line addon-line">
        <div></div>
        <div class="saved-stem saved-extra-stem">${addonStem}</div>
      </div>
    `;
  }
  if (question.judgeMode === "short") {
    const shortAnswer = stripHtml(question.shortAnswer) || "请输入";
    return `
      <div class="saved-line addon-line">
        <div></div>
        <div class="saved-short-box">
          <span>${shortAnswer}</span>
          <em>0 / 10000</em>
        </div>
      </div>
    `;
  }
  return "";
}

function renderPreview() {
  const state = currentState();
  const questions = state.questions && state.questions.length
    ? state.questions
    : [{ stem: "题干1", answer: "T", analysis: "" }];
  const labels = answerLabels(state.answerDisplayStyle, state.hasNG);

  const previewBody = document.getElementById("previewBody");
  previewBody.innerHTML = questions.map((question, index) => {
    const stemText = stripHtml(question.stem) || `题干${index + 1}`;
    const answer = question.answer || "T";
    const analysis = stripHtml(question.analysis);
    return `
      <div class="saved-question">
        <div class="saved-line">
          <div class="tf-row ${state.hasNG ? "with-ng" : ""}">
            ${labels.map(label => {
              const value = valueForLabel(label, state.answerDisplayStyle);
              return `<span class="tf-badge ${answer === value ? "selected" : ""}">${label}</span>`;
            }).join("")}
          </div>
          <div class="saved-stem">${stemText}</div>
        </div>
        ${addonHtml(question)}
        <div class="answer-title"><span class="spark">✦</span> 答案⌃</div>
        <div class="answer-value">${answerHtml(question, answer)}</div>
        ${analysis ? `<div class="answer-title"><span class="spark">✦</span> 解析</div><div class="answer-value">${analysis}</div>` : ""}
      </div>
    `;
  }).join("");
}

function renderSettingsNGState() {
  const state = currentState();
  document.querySelectorAll('input[name="answerStyle"]').forEach(input => {
    input.checked = input.value === state.answerDisplayStyle;
  });
  const stylePreview = document.getElementById("answerStylePreview");
  if (stylePreview) {
    const styleRows = [
      ["TF", answerLabels("TF", state.hasNG).join(" / ")],
      ["√×", answerLabels("tick", state.hasNG).join(" / ")],
      ["对错", answerLabels("text", state.hasNG).join(" / ")]
    ];
    stylePreview.innerHTML = styleRows.map(row => `<span>${row[0]}：${row[1]}</span>`).join("");
  }
  const ngNotes = document.querySelectorAll("[data-ng-note]");
  ngNotes.forEach(note => {
    note.hidden = !state.hasNG;
  });
  const ngOnlyOptions = document.querySelectorAll("[data-ng-only]");
  ngOnlyOptions.forEach(option => {
    option.hidden = !state.hasNG;
  });
}

document.getElementById("backToInput").addEventListener("click", () => {
  window.location.href = "index.html";
});

document.getElementById("openPreviewPage").addEventListener("click", () => {
  window.location.href = "preview.html";
});

const settingsMask = document.getElementById("settingsMask");
const openQuestionSettings = document.getElementById("openQuestionSettings");
const closeQuestionSettings = document.getElementById("closeQuestionSettings");
const cancelQuestionSettings = document.getElementById("cancelQuestionSettings");
const saveQuestionSettings = document.getElementById("saveQuestionSettings");

function openSettings() {
  renderSettingsNGState();
  settingsMask.classList.add("show");
  settingsMask.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  settingsMask.classList.remove("show");
  settingsMask.setAttribute("aria-hidden", "true");
}

openQuestionSettings.addEventListener("click", openSettings);
closeQuestionSettings.addEventListener("click", closeSettings);
cancelQuestionSettings.addEventListener("click", closeSettings);
saveQuestionSettings.addEventListener("click", () => {
  saveQuestionSettings.textContent = "已保存";
  setTimeout(() => {
    saveQuestionSettings.textContent = "保存";
    closeSettings();
  }, 450);
});
settingsMask.addEventListener("click", event => {
  if (event.target === settingsMask) closeSettings();
});

document.querySelectorAll(".fake-select").forEach(select => {
  const trigger = select.querySelector(":scope > button");
  const label = trigger.querySelector("span");
  trigger.addEventListener("click", event => {
    event.stopPropagation();
    document.querySelectorAll(".fake-select.open").forEach(open => {
      if (open !== select) open.classList.remove("open");
    });
    select.classList.toggle("open");
  });
  select.querySelectorAll(".fake-options button").forEach(option => {
    option.addEventListener("click", event => {
      event.stopPropagation();
      if (option.hidden) return;
      select.querySelectorAll(".fake-options button").forEach(btn => btn.classList.remove("active"));
      option.classList.add("active");
      label.textContent = option.textContent.trim();
      select.dataset.value = option.textContent.trim();
      select.classList.remove("open");
    });
  });
});

document.querySelectorAll('input[name="answerStyle"]').forEach(input => {
  input.addEventListener("change", () => {
    const state = currentState();
    state.answerDisplayStyle = input.value;
    saveState(state);
    renderPreview();
    renderSettingsNGState();
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".fake-select.open").forEach(select => select.classList.remove("open"));
});

renderPreview();
renderSettingsNGState();
