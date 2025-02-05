disableAllButtons/******************************************************
 * select_question.js
 ******************************************************/

// ================== 전역 변수 ===================== //
let jsonData = null;
let docId = 0;                // 문서 ID
let userAnswers = [];         // 원본 문제 사용자 답
let currentQuestionIndex = 0;
let isGraded = false;         // 원본 문제 채점 완료 여부
let gradedResults = [];

// ★ Twin Problem 전역
let isTwinMode = false;       // Twin 모드 ON/OFF
let twinProblemData = null;   // API로 받아온 Twin 문제 JSON
let twinUserAnswer = null;    // Twin 문제 사용자 답
let twinIsGraded = false;     // Twin 문제 채점 여부

// ============== DOM 요소 참조 ================ //
const passageContainer = document.getElementById('passage-content');
const questionTitleEl = document.getElementById('question-title');
const questionTextEl = document.getElementById('question-text');
const questionContentEl = document.getElementById('question-content');
const gradeBtn = document.getElementById('grade-btn');
gradeBtn.disabled = true;

// [수정됨] Twin 문제 채점 버튼
const twinGradeBtn = document.getElementById('twin-grade-btn');
if (twinGradeBtn) {
  twinGradeBtn.style.display = 'none';  // 초기에는 숨김
  twinGradeBtn.disabled = true;
  twinGradeBtn.style.backgroundColor = 'gray';
  twinGradeBtn.addEventListener('click', gradeTwinProblem);
}

// [수정됨] 로딩 오버레이 DOM (HTML에서 <div id="loading-overlay">...<div> 가 있다고 가정하거나, 동적으로 생성 가능)
const loadingOverlay = document.getElementById('loading-overlay');

/******************************************************
 * [수정됨] 로딩 오버레이 표시/숨김 함수
 ******************************************************/
function showLoadingOverlay() {
  // 1) 로딩 메시지 표시
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex'; // 중앙 정렬을 위해 flex 등 사용
  }

  // 2) 버튼들 비활성화
  disableAllButtons(true);
}

function hideLoadingOverlay() {
  // 1) 로딩 메시지 숨김
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
  // 2) 버튼들 활성화
  disableAllButtons(false);
}

/******************************************************
 * [수정됨] 모든 버튼들의 활성/비활성 처리
 ******************************************************/
function disableAllButtons(disabled) {
  const allButtons = document.querySelectorAll('button');

  allButtons.forEach(btn => {
    // back-button 클래스를 가진 버튼은 제외
    if (!btn.classList.contains('back-button')) {
      btn.disabled = disabled;
      if (disabled) {
        btn.style.backgroundColor = 'gray';
      } else {
        // 원상 복귀 로직
        if (btn.id === 'grade-btn' || btn.id === 'prev-btn' || btn.id === 'next-btn') {
          btn.style.backgroundColor = '#333333';
        }
      }
    }
  });
}

// ================== 페이지 로드 ================== //
document.addEventListener('DOMContentLoaded', () => {
  console.log('select_question.js loaded');

  // 1) URL 파라미터에서 document_id 추출
  const urlParams = new URLSearchParams(window.location.search);
  docId = parseInt(urlParams.get("document_id"), 10);

  // 2) /api/toefl_data 에서 전체 JSON 불러옴
  // [수정됨] fetch 전후로 show/hideLoadingOverlay()를 적용해도 되지만,
  // 일반적으로 문제 로딩은 첫 로드 시점이므로 필요 없을 수 있음.
  fetch("/api/toefl_data")
    .then(response => response.json())
    .then(data => {
      const docData = data.find(item => item.document_id === docId);
      if (!docData) {
        passageContainer.innerText = "No data found for this document_id.";
        console.error("document_id not found:", docId);
        return;
      }

      docData.문제들.sort((a, b) => a.번호 - b.번호);

      jsonData = docData;
      userAnswers = Array(jsonData.문제들.length).fill(null);
      gradedResults = Array(jsonData.문제들.length).fill({
        correctLabels: [],
        isCorrect: false,
        comment: null
      });

      displayPassage();
      renderQuestion();
    })
    .catch(err => {
      console.error("Error fetching or parsing JSON from /api/toefl_data:", err);
      passageContainer.innerText = "Failed to load question data.";
    });
});

// =============== [A] 지문 표시 =============== //
function displayPassage() {
  jsonData.passage.forEach(paragraphObj => {
    for (const key in paragraphObj) {
      const p = document.createElement('p');
      p.innerHTML = convertBoldText(paragraphObj[key]);
      passageContainer.appendChild(p);
    }
  });
}

// =============== [B] 원본 문제 렌더링 =========== //
function renderQuestion() {
  isTwinMode = false; // Twin 모드 OFF

  const question = jsonData.문제들[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;

  questionTitleEl.innerText = `Question ${questionNumber}`;
  questionTextEl.innerHTML = convertQuestionText(question.질문);
  questionContentEl.innerHTML = '';

  // Twin Problem 채점 버튼 숨기기
  if (twinGradeBtn) {
    twinGradeBtn.style.display = 'none';
  }

  // 선택지 생성
  question.선택지.forEach(choice => {
    const choiceLabel = choice.charAt(0);
    const choiceText = choice.substring(3).trim();

    let choiceDiv = document.createElement('div');
    choiceDiv.classList.add('choice-container');

    let choiceCircle = document.createElement('div');
    choiceCircle.classList.add('choice-circle');
    choiceCircle.innerText = choiceLabel;

    let choiceTextDiv = document.createElement('div');
    choiceTextDiv.classList.add('choice-text');
    choiceTextDiv.innerHTML = convertBoldText(choiceText);

    choiceDiv.appendChild(choiceCircle);
    choiceDiv.appendChild(choiceTextDiv);
    questionContentEl.appendChild(choiceDiv);

    if (!isGraded) {
      choiceDiv.addEventListener('click', () => {
        if (Array.isArray(question.정답) && question.정답.length > 1) {
          // 복수
          if (choiceDiv.classList.contains('selected')) {
            choiceDiv.classList.remove('selected');
            choiceCircle.classList.remove('selected-circle');
          } else {
            choiceDiv.classList.add('selected');
            choiceCircle.classList.add('selected-circle');
          }
        } else {
          // 단일
          document.querySelectorAll('.choice-container').forEach(div => {
            div.classList.remove('selected');
            div.querySelector('.choice-circle').classList.remove('selected-circle');
          });
          choiceDiv.classList.add('selected');
          choiceCircle.classList.add('selected-circle');
        }
        storeAnswer();
      });
    }
  });

  // 복원
  restoreUserAnswer(question);

  // 채점 모드이면 정/오답, 해설 표시
  if (isGraded) {
    applyGradingStyle();
    showCommentIfAvailable();
  }
  updateNavButtons();
  gradeBtn.disabled = true;

  // Twin Problem 버튼 노출/숨김
  const twinBtn = document.getElementById('twin-problem-btn');
  if (question.번호 === 9 || question.번호 === 10 || question.유형 === "sentence insertion") {
    twinBtn.style.display = 'none';
  } else {
    twinBtn.style.display = 'inline-block';
  }
}

// =============== [C] 저장된 답안 복원 ============ //
function restoreUserAnswer(question) {
  const savedAnswer = userAnswers[currentQuestionIndex];
  const allChoiceDivs = document.querySelectorAll('.choice-container');

  if (Array.isArray(question.정답) && question.정답.length > 1) {
    if (Array.isArray(savedAnswer)) {
      allChoiceDivs.forEach(div => {
        const label = div.querySelector('.choice-circle').innerText;
        if (savedAnswer.includes(label)) {
          div.classList.add('selected');
          div.querySelector('.choice-circle').classList.add('selected-circle');
        }
      });
    }
  } else {
    if (savedAnswer) {
      allChoiceDivs.forEach(div => {
        const label = div.querySelector('.choice-circle').innerText;
        if (label === savedAnswer) {
          div.classList.add('selected');
          div.querySelector('.choice-circle').classList.add('selected-circle');
        }
      });
    }
  }
}

// =============== [D] 선택지 클릭 시 저장 ========= //
function storeAnswer() {
  const question = jsonData.문제들[currentQuestionIndex];
  const selectedDivs = document.querySelectorAll('.choice-container.selected');

  if (Array.isArray(question.정답) && question.정답.length > 1) {
    let labels = [...selectedDivs].map(div => div.querySelector('.choice-circle').innerText);
    userAnswers[currentQuestionIndex] = labels;
  } else {
    if (selectedDivs.length > 0) {
      userAnswers[currentQuestionIndex] = selectedDivs[0].querySelector('.choice-circle').innerText;
    } else {
      userAnswers[currentQuestionIndex] = null;
    }
  }
  checkAllAnswered();
}

// =============== [E] 모든 문제 답변 여부 ========== //
function checkAllAnswered() {
  let allAnswered = true;
  for (let i = 0; i < userAnswers.length; i++) {
    const ans = userAnswers[i];
    const q = jsonData.문제들[i];

    if (Array.isArray(q.정답) && q.정답.length > 1) {
      if (!Array.isArray(ans) || ans.length === 0) {
        allAnswered = false;
        break;
      }
    } else {
      if (!ans) {
        allAnswered = false;
        break;
      }
    }
  }
  // Grade 버튼
  if (allAnswered) {
    gradeBtn.disabled = false;
    gradeBtn.style.backgroundColor = '#333333';
  } else {
    gradeBtn.disabled = true;
    gradeBtn.style.backgroundColor = 'gray';
  }
}

// =============== [F] 채점하기 =================== //
function gradeTest() {
  // [수정됨] 로딩 시작
  showLoadingOverlay();

  storeAnswer(); // 마지막 선택 반영

  // 1) 각 문제 채점
  jsonData.문제들.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    let correctLabels = [];

    if (Array.isArray(q.정답)) {
      correctLabels = q.정답.map(choiceStr => choiceStr.charAt(0));
    } else {
      correctLabels = [q.정답.trim().charAt(0)];
    }

    let isCorrect = false;

    if (correctLabels.length > 1) {
      if (Array.isArray(userAns)) {
        if (
          userAns.length === correctLabels.length &&
          userAns.every(label => correctLabels.includes(label))
        ) {
          isCorrect = true;
        }
      }
    } else {
      if (typeof userAns === 'string' && correctLabels.includes(userAns)) {
        isCorrect = true;
      }
    }

    gradedResults[idx] = {
      correctLabels,
      isCorrect,
      comment: null
    };
  });

  isGraded = true;

  // 2) make_comment: 모든 문제 해설
  const fetchCommentPromises = jsonData.문제들.map((q, idx) => {
    const questionNum = q.번호;
    const url = `/make_comment?id=${jsonData.document_id}&question_num=${questionNum}`;
    return fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.comment) {
          gradedResults[idx].comment = data.comment;
        } else {
          gradedResults[idx].comment = "No comment returned";
        }
      })
      .catch(err => {
        console.error("Error fetching comment:", err);
        gradedResults[idx].comment = "Error fetching comment";
      });
  });

  // 3) 문단 요약
  Promise.all(fetchCommentPromises)
    .then(() => fetchAndDisplayParagraphSummaries())
    .then(() => {
      currentQuestionIndex = 0;
      renderQuestion();
    })
    .finally(() => {
      // [수정됨] 로딩 끝
      hideLoadingOverlay();
    })
    .catch(err => {
      console.error("Error in gradeTest chain:", err);
      // 필요 시 에러 표시
    });
}

// =============== [G] 채점 모드 스타일 적용 ======== //
function applyGradingStyle() {
  const { correctLabels, isCorrect } = gradedResults[currentQuestionIndex];
  const allChoiceDivs = document.querySelectorAll('.choice-container');

  if (isCorrect) {
    allChoiceDivs.forEach(div => {
      if (div.classList.contains('selected')) {
        div.querySelector('.choice-circle').style.backgroundColor = 'blue';
      }
    });
  } else {
    allChoiceDivs.forEach(div => {
      if (div.classList.contains('selected')) {
        div.querySelector('.choice-circle').style.backgroundColor = 'red';
      }
    });
    allChoiceDivs.forEach(div => {
      const label = div.querySelector('.choice-circle').innerText;
      if (correctLabels.includes(label)) {
        div.querySelector('.choice-circle').style.backgroundColor = 'blue';
      }
    });
  }
}

// =============== [H] 해설(Comment) 표시 ========= //
function showCommentIfAvailable() {
  const comment = gradedResults[currentQuestionIndex].comment;
  if (!comment) return;

  const oldComment = document.querySelector('.explanation');
  if (oldComment) oldComment.remove();

  const explanationDiv = document.createElement('div');
  explanationDiv.classList.add('explanation');

  let formattedComment = formatComment(comment);
  formattedComment = convertBoldText(formattedComment);
  explanationDiv.innerHTML = formattedComment;

  questionContentEl.appendChild(explanationDiv);
}

// =============== [I] 이전/다음 버튼 ============= //
function prevQuestion() {
  storeAnswer();
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function nextQuestion() {
  storeAnswer();
  if (currentQuestionIndex < jsonData.문제들.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  }
}

// =============== [J] 버튼 상태 업데이트 ========= //
function updateNavButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.disabled = (currentQuestionIndex === 0);
  nextBtn.disabled = (currentQuestionIndex === jsonData.문제들.length - 1);

  prevBtn.style.backgroundColor = prevBtn.disabled ? 'gray' : '#333333';
  nextBtn.style.backgroundColor = nextBtn.disabled ? 'gray' : '#333333';
}

// =============== [K] 텍스트 치환 함수 ========== //
function convertBoldText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<span class="underline-highlight">$1</span>')
    .replace(/\((A|B|C|D)\)/g, '<span class="underline-highlight">($1)</span>')
    .replace(/ - /g, ' ')
    .replace(/—/g, ' ');
}

function convertQuestionText(text) {
  if (!text) return '';
  return convertBoldText(text).replace(/\n/g, '<br>');
}

function formatComment(comment) {
  // 1. 특정 대문자 패턴 (A., B., C., D.만) bold 처리
  let formatted = comment.replace(/\b([A-D])\.\b/g, '**$1.**');

  // 2. 대문자 앞에서 줄 바꿈 적용
  formatted = formatted.replace(/\s*([A-Z])\./g, '<br>$1.');

  // 3. [오답 해설] 앞에 개행문자 추가
  formatted = formatted.replace(/\s*(\[오답 해설\])/g, '<br><br>$1');

  return formatted;
}

// =============== [L] 문단별 요약 fetch ========== //
function fetchAndDisplayParagraphSummaries() {
  return new Promise((resolve, reject) => {
    // 문단 요약 로딩
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('summary-loading');
    loadingDiv.innerText = "문단 요약을 불러오는 중입니다. 잠시만 기다려주세요...";
    passageContainer.appendChild(loadingDiv);

    fetch(`/summarize_passage?id=${jsonData.document_id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to fetch summarize_passage");
        }
        return res.json();
      })
      .then(data => {
        loadingDiv.remove();
        const paragraphEls = document.querySelectorAll('#passage-content p');
        const summaries = data.summaries || [];

        summaries.forEach((summaryItem, idx) => {
          const paragraphIdx = summaryItem.paragraph_index || (idx + 1);
          const processedSummary = convertBoldText(summaryItem.summary);

          const summaryDiv = document.createElement('div');
          summaryDiv.classList.add('paragraph-summary');
          summaryDiv.innerHTML = `
            <strong>Paragraph ${paragraphIdx} 요약:</strong>
            <br>
            ${processedSummary}
            <hr />
          `;
          if (paragraphEls[idx]) {
            paragraphEls[idx].insertAdjacentElement('afterend', summaryDiv);
          } else {
            passageContainer.appendChild(summaryDiv);
          }
        });
        resolve();
      })
      .catch(err => {
        console.error("Error fetching paragraph summaries:", err);
        loadingDiv.innerText = "문단 요약을 불러오지 못했습니다. (에러)";
        reject(err);
      });
  });
}

// =============== [M] Twin Problem toggle ======== //
function toggleTwinProblem() {
  // [수정됨] 로딩 시작
  showLoadingOverlay();

  const question = jsonData.문제들[currentQuestionIndex];
  const questionNum = question.번호;

  // Twin 모드에서 제외할(계속 클릭 가능해야 할) 버튼은 제외하고
  // prev-btn, next-btn, grade-btn만 따로 참조합니다.
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const gradeBtn = document.getElementById('grade-btn');

  if (!isTwinMode) {
    // Twin 모드 켜기
    const url = `/make_twin_problem?id=${jsonData.document_id}&question_num=${questionNum}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.twinProblem) {
          try {
            twinProblemData = JSON.parse(data.twinProblem);
          } catch (e) {
            console.error("Error parsing twinProblem JSON:", e);
            return;
          }
          isTwinMode = true;
          twinIsGraded = false;
          twinUserAnswer = null;

          questionTitleEl.innerText = `Twin Problem`;

          const twinQ = twinProblemData.problem;
          questionTextEl.innerHTML = convertQuestionText(twinQ.질문 || "No question text");
          questionContentEl.innerHTML = '';

          // 선택지 생성
          const choices = twinQ.선택지 || [];
          choices.forEach(choice => {
            let choiceDiv = document.createElement('div');
            choiceDiv.classList.add('choice-container');

            let choiceLabel = choice.charAt(0);
            let choiceCircle = document.createElement('div');
            choiceCircle.classList.add('choice-circle');
            choiceCircle.innerText = choiceLabel;

            let choiceText = choice.substring(3).trim();
            let choiceTextDiv = document.createElement('div');
            choiceTextDiv.classList.add('choice-text');
            choiceTextDiv.innerHTML = convertBoldText(choiceText);

            choiceDiv.appendChild(choiceCircle);
            choiceDiv.appendChild(choiceTextDiv);
            questionContentEl.appendChild(choiceDiv);

            // Twin 문제 선택 이벤트
            choiceDiv.addEventListener('click', () => {
              if (!twinIsGraded) {
                document.querySelectorAll('.choice-container').forEach(div => {
                  div.classList.remove('selected');
                  div.querySelector('.choice-circle').classList.remove('selected-circle');
                  div.querySelector('.choice-circle').style.backgroundColor = '';
                });
                choiceDiv.classList.add('selected');
                choiceCircle.classList.add('selected-circle');

                twinUserAnswer = choiceLabel;
                checkTwinAnswered();
              }
            });
          });

          // 해설 영역 초기화
          const explanationDiv = document.querySelector('.explanation');
          if (explanationDiv) {
            explanationDiv.innerHTML = '';
          }

          // Twin 문제 채점 버튼 보이기 & 비활성화
          if (twinGradeBtn) {
            twinGradeBtn.style.display = 'inline-block';
            twinGradeBtn.disabled = true;
            twinGradeBtn.style.backgroundColor = 'gray';
          }

          // [추가] Twin 모드 ON 시 Prev/Next/Grade 버튼 클릭 비활성화
          [prevBtn, nextBtn, gradeBtn].forEach(btn => {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';  // 클릭 막기
            btn.style.backgroundColor = 'gray';
          });

        } else {
          console.error("No twinProblem returned or is null");
        }
      })
      .finally(() => {
        // 로딩 오버레이 닫기
        hideLoadingOverlay();
      })
      .catch(err => {
        console.error("Error fetching twin problem:", err);
      });

  } else {
    // Twin 모드 해제
    isTwinMode = false;
    renderQuestion();

    // [추가] Twin 모드 OFF 시 Prev/Next/Grade 버튼 다시 활성화
    [prevBtn, nextBtn, gradeBtn].forEach(btn => {
      btn.disabled = false;
      btn.style.pointerEvents = 'auto';
      btn.style.backgroundColor = '#333333';
    });

    // 로딩 오버레이 닫기
    hideLoadingOverlay();
  }
}


// =============== [M-2] Twin Problem 채점 ======== //
function checkTwinAnswered() {
  if (twinUserAnswer) {
    twinGradeBtn.disabled = false;
    twinGradeBtn.style.backgroundColor = '#333333';
  } else {
    twinGradeBtn.disabled = true;
    twinGradeBtn.style.backgroundColor = 'gray';
  }
}

function gradeTwinProblem() {
  if (twinIsGraded) return;

  twinIsGraded = true;

  const twinQ = twinProblemData.problem;
  let correctLabels = [];

  if (Array.isArray(twinQ.정답)) {
    correctLabels = twinQ.정답.map(choiceStr => choiceStr.charAt(0));
  } else {
    correctLabels = [twinQ.정답.trim().charAt(0)];
  }

  let isCorrect = correctLabels.includes(twinUserAnswer);

  // 채점 스타일
  const allChoiceDivs = document.querySelectorAll('.choice-container');
  if (isCorrect) {
    allChoiceDivs.forEach(div => {
      if (div.classList.contains('selected')) {
        div.querySelector('.choice-circle').style.backgroundColor = 'blue';
      }
    });
  } else {
    allChoiceDivs.forEach(div => {
      if (div.classList.contains('selected')) {
        div.querySelector('.choice-circle').style.backgroundColor = 'red';
      }
    });
    allChoiceDivs.forEach(div => {
      const label = div.querySelector('.choice-circle').innerText;
      if (correctLabels.includes(label)) {
        div.querySelector('.choice-circle').style.backgroundColor = 'blue';
      }
    });
  }

  // Twin 문제 해설
  showTwinExplanationIfAvailable();
}

// Twin 문제 해설 표시
function showTwinExplanationIfAvailable() {
  if (!twinProblemData || !twinProblemData.problem) return;

  const explanation = twinProblemData.problem.해설;
  if (!explanation) return;

  const oldComment = document.querySelector('.explanation');
  if (oldComment) oldComment.remove();

  const explanationDiv = document.createElement('div');
  explanationDiv.classList.add('explanation');

  let formattedExplanation = formatComment(explanation);
  formattedExplanation = convertBoldText(formattedExplanation);
  explanationDiv.innerHTML = formattedExplanation;

  questionContentEl.appendChild(explanationDiv);
}
