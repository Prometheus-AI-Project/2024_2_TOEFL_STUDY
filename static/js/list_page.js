// static/js/list_page.js

window.addEventListener("DOMContentLoaded", () => {
  console.log('list_page.js loaded');

  // (1) URL 쿼리 파라미터에서 level 추출
  const urlParams = new URLSearchParams(window.location.search);
  const level = urlParams.get("level") || "basic"; 

  // (2) 레벨별 표시 (ex: "Basic Question List")
  const levelTextEl = document.querySelector(".level-text");
  if (levelTextEl) {
    levelTextEl.textContent = `${level.charAt(0).toUpperCase() + level.slice(1)} Question List`;
  }

  // (3) 문서 목록 불러오기 -> /api/toefl_data
  fetch("/api/toefl_data")
    .then(response => response.json())
    .then(data => {
      // 레벨별로 document_id를 구분 (예: basic=1~16)
      let startId, endId;
      if (level === "basic") {
        startId = 1; endId = 16;
      } else if (level === "intermediate") {
        startId = 17; endId = 32;
      } else {
        // advanced
        startId = 33; endId = 48;
      }

      // 필터링
      const filtered = data.filter(item => 
        item.document_id >= startId && item.document_id <= endId
      );

      // (4) 목록에 표시
      const titleList = document.getElementById("titleList");
      if (!titleList) return;

      filtered.forEach(doc => {
        const li = document.createElement("li");
        li.textContent = doc.title || `Document ${doc.document_id}`;
        titleList.appendChild(li);

        // li 클릭 -> /select_question?document_id=xxx 로 이동
        li.addEventListener('click', () => {
          window.location.href = `/select_question?document_id=${doc.document_id}`;
        });
      });
    })
    .catch(err => {
      console.error('Error fetching /api/toefl_data:', err);
    });
});
