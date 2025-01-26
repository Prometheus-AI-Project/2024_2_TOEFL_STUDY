window.addEventListener("DOMContentLoaded", () => {
  // 1) URL에서 level 파라미터 추출 (basic/intermediate/advanced)
  const urlParams = new URLSearchParams(window.location.search);
  const level = urlParams.get("level");

  // 2) 레벨별 document_id 범위 설정
  let startId, endId;
  if (level === "basic") {
      startId = 1; 
      endId = 16;
  } else if (level === "intermediate") {
      startId = 17; 
      endId = 32;
  } else if (level === "advanced") {
      startId = 33; 
      endId = 48;
  } else {
      // 레벨이 지정되지 않았거나 잘못된 경우 처리
      const levelText = document.querySelector(".level-text");
      levelText.textContent = "Invalid or No Level Specified";
      return; // 스크립트 종료
  }

  // 3) 페이지 헤더에 현재 레벨 표시 ("Basic Question List" 등)
  const levelText = document.querySelector(".level-text");
  levelText.textContent = `${level.charAt(0).toUpperCase() + level.slice(1)} Question List`;
    // 3) JSON 데이터 로드
    //    실제 JSON 경로 혹은 서버 주소에 맞춰 "questions.json"을 수정하세요.
    fetch("./toefl_dataset_final.json")
      .then(response => response.json())
      .then(data => {
        // data: [{document_id, title, passage, 문제들}, ...]
        // document_id가 startId~endId 범위인 것만 필터링
        const filteredData = data.filter(item => item.document_id >= startId && item.document_id <= endId);
  
        // 4) 각 제목(li) 생성 후 클릭 이벤트로 select_question.html로 이동
        const titleList = document.getElementById("titleList");
        filteredData.forEach(item => {
          const li = document.createElement("li");
          li.textContent = item.title;
          titleList.appendChild(li);
  
          // 제목 클릭 → select_question.html?document_id=XXX 로 이동
          li.addEventListener("click", () => {
            window.location.href = `select_question.html?document_id=${item.document_id}`;
          });
        });
      })
      .catch(error => {
        console.error("Error fetching JSON:", error);
      });
  });
  