// 모달창 토글 코드
document.addEventListener('DOMContentLoaded', function () {
 console.log('DOM fully loaded and parsed');  // 디버깅 로그 추가

 const howToUseCard = document.getElementById('howToUseCard');
 const explanationModal = document.getElementById('explanationModal');
 const closeModal = document.getElementById('closeModal');

 if (howToUseCard && explanationModal && closeModal) {
     howToUseCard.addEventListener('click', function () {
         explanationModal.classList.add('active');
         howToUseCard.classList.add('clicked');
     });

     closeModal.addEventListener('click', function () {
         explanationModal.classList.remove('active');
         howToUseCard.classList.remove('clicked');
     });
 } else {
     console.error('One or more elements are missing in the DOM');
 }
});

// 2) 카드 클릭 시 각각 list_page.html로 이동
const basicCard = document.getElementById('basicCard');
const intermediateCard = document.getElementById('intermediateCard');
const advancedCard = document.getElementById('advancedCard');

// 레벨별 이동 함수
function goToLevel(level) {
  // URL 쿼리 파라미터로 level 정보를 넘김
  window.location.href = `list_page.html?level=${level}`;
}

basicCard.addEventListener('click', () => goToLevel('basic'));
intermediateCard.addEventListener('click', () => goToLevel('intermediate'));
advancedCard.addEventListener('click', () => goToLevel('advanced'));