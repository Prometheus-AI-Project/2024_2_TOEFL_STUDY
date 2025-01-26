/******************************************************
 * select_question.js
 ******************************************************/

// 현재 문서에 해당하는 JSON 데이터 (지문 + 문제들)
let jsonData = null;

// 전역 변수 (문제 풀이 로직)
let userAnswers = [];
let currentQuestionIndex = 0;
let isGraded = false;
let gradedResults = [];

// DOM 참조
const passageContainer = document.getElementById('passage-content');
const questionTitleEl = document.getElementById('question-title');
const questionTextEl = document.getElementById('question-text');
const questionContentEl = document.getElementById('question-content');
const gradeBtn = document.getElementById('grade-btn');

/******************************************************
 * 페이지 로드 시점: document_id 받아와 JSON 로드
 ******************************************************/
document.addEventListener('DOMContentLoaded', () => {
  // 1) 쿼리 파라미터에서 document_id 추출
  const urlParams = new URLSearchParams(window.location.search);
  const docId = parseInt(urlParams.get("document_id"));

  // 2) 전체 JSON에서 docId에 해당하는 데이터 찾기
  fetch("./toefl_dataset_final.json") // 실제 경로에 맞게 수정
    .then(response => response.json())
    .then(data => {
      // data: [{document_id, title, passage, 문제들}, ...]
      const docData = data.find(item => item.document_id === docId);
      if (!docData) {
        passageContainer.innerText = "No data found for this document_id.";
        console.error("document_id not found:", docId);
        return;
      }
      
      // 3) 전역에 저장 + 문제답안 배열 초기화
      jsonData = docData;
      userAnswers = Array(jsonData.문제들.length).fill(null);
      gradedResults = Array(jsonData.문제들.length).fill(null);

      // 지문 표시 & 첫 문제 렌더링
      displayPassage();
      renderQuestion();
    })
    .catch(err => {
      console.error("Error fetching or parsing JSON:", err);
      passageContainer.innerText = "Failed to load question data.";
    });
});

/******************************************************
 * [A] 지문(Passage) 표시
 ******************************************************/
function displayPassage() {
  // jsonData.passage 예: [ { "paragraph 1": "...", "paragraph 2": "..."}, ... ]
  jsonData.passage.forEach(paragraphObj => {
    for (const key in paragraphObj) {
      const p = document.createElement('p');
      p.innerHTML = convertBoldText(paragraphObj[key]);
      passageContainer.appendChild(p);
    }
  });
}

/******************************************************
 * [B] 문제 렌더링 함수
 ******************************************************/
function renderQuestion() {
  const question = jsonData.문제들[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;

  // 제목, 질문 텍스트
  questionTitleEl.innerText = `Question ${questionNumber}`;
  questionTextEl.innerHTML = convertQuestionText(question.질문);

  // 선택지 영역 초기화
  questionContentEl.innerHTML = '';

  // 선택지 생성
  question.선택지.forEach(choice => {
    // choice 예: "A. To emphasize..."
    const choiceLabel = choice.charAt(0);          // "A"
    const choiceText = choice.substring(3).trim(); // "To emphasize..."

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

    // 채점 전(isGraded=false) 상태에서만 선택 가능
    if (!isGraded) {
      choiceDiv.addEventListener('click', () => {
        // 복수정답인지 확인
        if (Array.isArray(question.정답) && question.정답.length > 1) {
          // 토글(선택/해제)
          if (choiceDiv.classList.contains('selected')) {
            choiceDiv.classList.remove('selected');
            choiceCircle.classList.remove('selected-circle');
          } else {
            choiceDiv.classList.add('selected');
            choiceCircle.classList.add('selected-circle');
          }
        } else {
          // 단일정답
          document.querySelectorAll('.choice-container').forEach(div => {
            div.classList.remove('selected');
            div.querySelector('.choice-circle').classList.remove('selected-circle');
          });
          choiceDiv.classList.add('selected');
          choiceCircle.classList.add('selected-circle');
        }

        // 답안 저장
        storeAnswer();
      });
    }
  });

  // 저장된 답안 복원
  restoreUserAnswer(question);

  // 채점 모드라면 정답/오답 표시
  if (isGraded) {
    applyGradingStyle();
  }

  // 이전/다음 버튼 업데이트
  updateNavButtons();
}

/******************************************************
 * 저장된 답안 복원
 ******************************************************/
function restoreUserAnswer(question) {
  const savedAnswer = userAnswers[currentQuestionIndex];
  const allChoiceDivs = document.querySelectorAll('.choice-container');

  if (Array.isArray(question.정답) && question.정답.length > 1) {
    // 복수 선택
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
    // 단일 선택
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

/******************************************************
 * 선택지 클릭 시 userAnswers에 저장
 ******************************************************/
function storeAnswer() {
  const question = jsonData.문제들[currentQuestionIndex];
  const selectedDivs = document.querySelectorAll('.choice-container.selected');

  if (Array.isArray(question.정답) && question.정답.length > 1) {
    // 복수정답
    let labels = [...selectedDivs].map(div => div.querySelector('.choice-circle').innerText);
    userAnswers[currentQuestionIndex] = labels;
  } else {
    // 단일정답
    if (selectedDivs.length > 0) {
      userAnswers[currentQuestionIndex] = selectedDivs[0].querySelector('.choice-circle').innerText;
    } else {
      userAnswers[currentQuestionIndex] = null;
    }
  }

  checkAllAnswered();
}

/******************************************************
 * 모든 문제를 답했는지 확인 -> Grade 버튼 활성화
 ******************************************************/
function checkAllAnswered() {
  let allAnswered = true;

  for (let i = 0; i < userAnswers.length; i++) {
    const ans = userAnswers[i];
    const q = jsonData.문제들[i];

    // 복수정답
    if (Array.isArray(q.정답) && q.정답.length > 1) {
      if (!Array.isArray(ans) || ans.length === 0) {
        allAnswered = false;
        break;
      }
    } else {
      // 단일정답
      if (!ans) {
        allAnswered = false;
        break;
      }
    }
  }

  if (allAnswered) {
    gradeBtn.disabled = false;
    gradeBtn.style.backgroundColor = '#333333';
  } else {
    gradeBtn.disabled = true;
    gradeBtn.style.backgroundColor = 'gray';
  }
}

/******************************************************
 * 채점하기
 ******************************************************/
function gradeTest() {
  // 마지막 문제에서 선택 직후 반영
  storeAnswer();

  // 1) 각 문제 채점
  jsonData.문제들.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    let correctLabels = [];

    if (Array.isArray(q.정답)) {
      // 복수 정답
      correctLabels = q.정답.map(choiceStr => choiceStr.charAt(0));
    } else {
      // 단일 정답
      correctLabels = [q.정답.trim().charAt(0)];
    }

    let isCorrect = false;

    if (correctLabels.length > 1) {
      // 복수 정답
      if (Array.isArray(userAns)) {
        // 동일한 항목 개수 + 모두 포함 여부
        if (
          userAns.length === correctLabels.length &&
          userAns.every(label => correctLabels.includes(label))
        ) {
          isCorrect = true;
        }
      }
    } else {
      // 단일 정답
      if (typeof userAns === 'string' && correctLabels.includes(userAns)) {
        isCorrect = true;
      }
    }

    gradedResults[idx] = { correctLabels, isCorrect };
  });

  // 2) 채점 모드 on
  isGraded = true;

  // 3) 현재 문제를 1번으로 초기화 후 새로 렌더링
  currentQuestionIndex = 0;
  renderQuestion();
}

/******************************************************
 * 채점 모드 시 스타일 적용 (렌더링 시 호출)
 ******************************************************/
function applyGradingStyle() {
  const { correctLabels, isCorrect } = gradedResults[currentQuestionIndex];
  const allChoiceDivs = document.querySelectorAll('.choice-container');

  if (isCorrect) {
    // 정답 -> 사용자가 선택한 것 파란색
    allChoiceDivs.forEach(div => {
      if (div.classList.contains('selected')) {
        div.querySelector('.choice-circle').style.backgroundColor = 'blue';
      }
    });
  } else {
    // 오답
    // 1) 사용자가 선택한 것 -> 빨간색
    allChoiceDivs.forEach(div => {
      if (div.classList.contains('selected')) {
        div.querySelector('.choice-circle').style.backgroundColor = 'red';
      }
    });
    // 2) 정답 -> 파란색
    allChoiceDivs.forEach(div => {
      const label = div.querySelector('.choice-circle').innerText;
      if (correctLabels.includes(label)) {
        div.querySelector('.choice-circle').style.backgroundColor = 'blue';
      }
    });
  }
}

/******************************************************
 * 이전/다음 문제 버튼
 ******************************************************/
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

/******************************************************
 * 버튼 상태 업데이트
 ******************************************************/
function updateNavButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.disabled = (currentQuestionIndex === 0);
  nextBtn.disabled = (currentQuestionIndex === jsonData.문제들.length - 1);

  prevBtn.style.backgroundColor = prevBtn.disabled ? 'gray' : '#333333';
  nextBtn.style.backgroundColor = nextBtn.disabled ? 'gray' : '#333333';
}

/******************************************************
 * 텍스트 치환 함수
 ******************************************************/
// **강조** -> <span> 치환 + (A)(B)(C)(D) 강조
function convertBoldText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<span class="underline-highlight">$1</span>')
    .replace(/\((A|B|C|D)\)/g, '<span class="underline-highlight">($1)</span>')
    .replace(/ - /g, ' ')
    .replace(/—/g, ' ');
}

// 질문(Question)에서 \n -> <br> 치환
function convertQuestionText(text) {
  return convertBoldText(text).replace(/\n/g, '<br>');
}
