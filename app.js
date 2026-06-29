const storageKey = "judgementCorrectionDemoState";

const defaultState = {
  recognitionText: "",
  prompt: "",
  material: "",
  wholeAnalysis: "",
  hasNG: false,
  answerDisplayStyle: "TF",
  autoJudge: true,
  scorePerItem: 1,
  questions: [
    {
      id: crypto.randomUUID(),
      stem: "",
      answer: "T",
      judgeMode: "",
      addonStem: "",
      fillAnswer: "",
      shortAnswer: "",
      analysis: ""
    }
  ]
};

let state = normalizeState(loadState());

function loadState() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(rawState) {
  const next = { ...structuredClone(defaultState), ...rawState };
  next.hasNG = Boolean(next.hasNG);
  next.answerDisplayStyle = next.answerDisplayStyle || "TF";
  next.autoJudge = next.autoJudge !== false;
  next.scorePerItem = Number(next.scorePerItem || 1);
  next.questions = Array.isArray(next.questions) && next.questions.length
    ? next.questions.map(question => ({
      id: question.id || crypto.randomUUID(),
      stem: question.stem || "",
      answer: ["T", "F", "NG"].includes(question.answer) ? question.answer : "T",
      judgeMode: question.judgeMode || "",
      addonStem: question.addonStem || "",
      fillAnswer: question.fillAnswer || "",
      shortAnswer: question.shortAnswer || "",
      analysis: question.analysis || ""
    }))
    : structuredClone(defaultState.questions);
  if (!next.hasNG) {
    next.questions.forEach(question => {
      if (question.answer === "NG") question.answer = "T";
    });
  }
  return next;
}

function persistState() {
  const recognition = document.getElementById("recognitionText");
  if (recognition) state.recognitionText = recognition.value;
  document.querySelectorAll(".editor-shell").forEach(shell => {
    const field = shell.dataset.field;
    const editable = shell.querySelector(".editable");
    if (field && editable) state[field] = editable.innerHTML;
  });
  document.querySelectorAll(".question-card").forEach(card => {
    const question = state.questions.find(item => item.id === card.dataset.id);
    if (!question) return;
    card.querySelectorAll("[data-question-field]").forEach(field => {
      question[field.dataset.questionField] = field.isContentEditable ? field.innerHTML : field.value;
    });
  });
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function makeEditor(placeholder, value = "") {
  const template = document.getElementById("editorTemplate");
  const editor = template.content.firstElementChild.cloneNode(true);
  const editable = editor.querySelector(".editable");
  editable.dataset.placeholder = placeholder;
  editable.innerHTML = value;
  editable.addEventListener("input", persistState);
  return editor;
}

function renderBaseEditors() {
  const placeholders = {
    prompt: "请输入作答提示",
    material: "请输入材料内容",
    wholeAnalysis: "请输入整题解析"
  };
  document.querySelectorAll(".editor-shell").forEach(shell => {
    const field = shell.dataset.field;
    shell.innerHTML = "";
    shell.appendChild(makeEditor(placeholders[field] || "请输入内容", state[field] || ""));
  });
}

function answerButton(answer, questionAnswer) {
  const disabled = answer === "NG" && !state.hasNG;
  return `
    <button
      class="answer-btn ${questionAnswer === answer ? "active" : ""} ${disabled ? "disabled" : ""}"
      data-answer="${answer}"
      ${disabled ? "disabled" : ""}
      type="button"
    >${answer}</button>
  `;
}

function renderJudgeExtra(question) {
  if (question.judgeMode === "fill") {
    return `
      <div class="judge-extra-panel fill-extra" data-extra-mode="fill">
        <div class="judge-extra-editor"></div>
        <div class="field-label fill-answer-label"><span class="required">*</span><span>填空1答案</span></div>
        <input class="fill-answer-input" data-question-field="fillAnswer" value="${question.fillAnswer || ""}" placeholder="请输入答案">
      </div>
    `;
  }
  if (question.judgeMode === "short") {
    return `
      <div class="judge-extra-panel short-extra" data-extra-mode="short">
        <div class="short-answer-title">答案</div>
        <div class="judge-extra-editor"></div>
      </div>
    `;
  }
  return "";
}

function renderQuestions() {
  const list = document.getElementById("questionList");
  list.innerHTML = "";
  state.questions.forEach((question, index) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.dataset.id = question.id;
    card.innerHTML = `
      <div class="question-tab">
        小题${index + 1}
        <button class="delete-question" title="删除小题" aria-label="删除小题" type="button">×</button>
      </div>
      <div class="field-row">
        <div class="field-label">
          <span class="required">*</span>
          <span>题干</span>
          <span class="tip"><span class="tip-icon">!</span>题干作为题目的基础必要元素，请录入正确合理的题干</span>
        </div>
        <div class="question-stem"></div>
      </div>
      <div class="answer-panel">
        <div class="field-label"><span class="required">*</span><span>答案（点击选项选择答案）</span></div>
        <div class="answer-options">
          ${answerButton("T", question.answer)}
          ${answerButton("F", question.answer)}
          ${answerButton("NG", question.answer)}
        </div>
      </div>
      <div class="judge-panel">
        <label class="radio"><input type="radio" name="judge-${question.id}" value="fill" ${question.judgeMode === "fill" ? "checked" : ""}> 判断后填空</label>
        <label class="radio"><input type="radio" name="judge-${question.id}" value="short" ${question.judgeMode === "short" ? "checked" : ""}> 判断后简答</label>
      </div>
      ${renderJudgeExtra(question)}
      <div class="answer-panel">
        <div class="analysis-title">解析</div>
        <div class="question-analysis"></div>
      </div>
    `;

    const stemWrap = card.querySelector(".question-stem");
    const stemEditor = makeEditor("请输入题干内容", question.stem);
    stemEditor.querySelector(".editable").dataset.questionField = "stem";
    stemWrap.appendChild(stemEditor);

    const analysisWrap = card.querySelector(".question-analysis");
    const analysisEditor = makeEditor("请输入本题解析", question.analysis);
    analysisEditor.querySelector(".editable").dataset.questionField = "analysis";
    analysisWrap.appendChild(analysisEditor);

    const extraEditorWrap = card.querySelector(".judge-extra-editor");
    if (extraEditorWrap) {
      const isFill = question.judgeMode === "fill";
      const extraEditor = makeEditor(isFill ? "请输入题干内容" : "请输入", isFill ? question.addonStem : question.shortAnswer);
      extraEditor.querySelector(".editable").dataset.questionField = isFill ? "addonStem" : "shortAnswer";
      extraEditorWrap.appendChild(extraEditor);
    }

    card.querySelectorAll(".fill-answer-input").forEach(input => {
      input.addEventListener("input", persistState);
    });

    card.querySelector(".delete-question").addEventListener("click", () => {
      if (state.questions.length === 1) {
        showToast("至少保留一个小题");
        return;
      }
      state.questions = state.questions.filter(item => item.id !== question.id);
      persistState();
      renderQuestions();
      showToast("已删除小题");
    });

    card.querySelectorAll(".answer-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        question.answer = btn.dataset.answer;
        persistState();
        renderQuestions();
      });
    });

    card.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener("pointerdown", () => {
        input.dataset.wasChecked = String(input.checked);
      });
      input.addEventListener("click", () => {
        if (input.dataset.wasChecked === "true") {
          input.checked = false;
          question.judgeMode = "";
          persistState();
          renderQuestions();
        }
      });
      input.addEventListener("change", () => {
        question.judgeMode = input.value;
        persistState();
        renderQuestions();
      });
    });

    list.appendChild(card);
  });
  renderQuestionSublist();
}

function addQuestion() {
  persistState();
  state.questions.push({
    id: crypto.randomUUID(),
    stem: "",
    answer: "T",
    judgeMode: "",
    addonStem: "",
    fillAnswer: "",
    shortAnswer: "",
    analysis: ""
  });
  renderQuestions();
  localStorage.setItem(storageKey, JSON.stringify(state));
  const last = document.querySelector(".question-card:last-child");
  if (last) scrollToTarget(last);
}

function renderQuestionSublist() {
  const sublist = document.getElementById("questionSublist");
  if (!sublist) return;
  sublist.innerHTML = state.questions.map((question, index) => `
    <button class="question-subitem" data-question-id="${question.id}">
      <span class="drag-dots" aria-hidden="true">${"<i></i>".repeat(6)}</span>
      小题${index + 1}
    </button>
  `).join("");
  sublist.querySelectorAll(".question-subitem").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(`.question-card[data-id="${btn.dataset.questionId}"]`);
      if (target) scrollToTarget(target);
    });
  });
}

function scrollToTarget(target) {
  const content = document.getElementById("content");
  const contentTop = content.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const top = content.scrollTop + targetTop - contentTop - 6;
  content.scrollTo({ top, behavior: "smooth" });
}

function bindNavigation() {
  const content = document.getElementById("content");
  const navItems = Array.from(document.querySelectorAll(".side-item"));
  navItems.forEach(item => {
    item.addEventListener("click", event => {
      if (item.classList.contains("question-toggle") && event.target.classList.contains("chevron")) {
        const sublist = document.getElementById("questionSublist");
        const collapsed = item.classList.toggle("collapsed");
        item.setAttribute("aria-expanded", String(!collapsed));
        if (sublist) sublist.classList.toggle("collapsed", collapsed);
        return;
      }
      const target = document.getElementById(item.dataset.target);
      if (target) scrollToTarget(target);
    });
  });

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navItems.forEach(item => {
      item.classList.toggle("active", item.dataset.target === visible.target.id);
    });
  }, { root: content, threshold: [0.22, 0.45, 0.7] });

  document.querySelectorAll(".block").forEach(block => observer.observe(block));
}

function bindNGToggle() {
  const toggle = document.getElementById("ngToggle");
  if (!toggle) return;
  toggle.checked = state.hasNG;
  toggle.addEventListener("change", () => {
    if (!toggle.checked && state.questions.some(question => question.answer === "NG")) {
      toggle.checked = true;
      showToast("当前存在标准答案为 NG 的小题，请先修改为 T 或 F 后再关闭 NG 选项");
      return;
    }
    state.hasNG = toggle.checked;
    persistState();
    renderQuestions();
    showToast(state.hasNG ? "已开启 NG 选项" : "已关闭 NG 选项");
  });
}

function init() {
  document.getElementById("recognitionText").value = state.recognitionText || "";
  renderBaseEditors();
  renderQuestions();
  bindNavigation();
  bindNGToggle();

  document.getElementById("saveBtn").addEventListener("click", () => {
    persistState();
    showToast("已保存，正在进入章节编辑页");
    setTimeout(() => {
      window.location.href = "chapter-editor.html";
    }, 450);
  });
  document.getElementById("clearRecognition").addEventListener("click", () => {
    document.getElementById("recognitionText").value = "";
    persistState();
    showToast("已清空识别内容");
  });
  document.getElementById("startRecognition").addEventListener("click", () => {
    showToast("识别能力暂未接入，可在这里扩展 OCR 流程");
  });
  document.getElementById("addQuestionTop").addEventListener("click", addQuestion);
  document.getElementById("addQuestionBottom").addEventListener("click", addQuestion);
  document.getElementById("recognitionText").addEventListener("input", persistState);
  localStorage.setItem(storageKey, JSON.stringify(state));
}

init();
