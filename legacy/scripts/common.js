// /scripts/common.js
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const toggleDarkModeButton = document.getElementById('toggleDarkModeButton');

  if (toggleDarkModeButton) {
    // 다크 모드 초기화
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    body.classList.toggle('dark-mode', isDarkMode);
    updateButtonIcon(isDarkMode);

    // 버튼 클릭 이벤트
    toggleDarkModeButton.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      const isDarkModeNow = body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDarkModeNow);
      updateButtonIcon(isDarkModeNow);
    });
  }

  // 아이콘 업데이트 함수
  function updateButtonIcon(isDarkMode) {
    toggleDarkModeButton.classList.toggle('dark-mode-icon', isDarkMode);
  }
});