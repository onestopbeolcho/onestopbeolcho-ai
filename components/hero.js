// /components/hero.js
function renderHero() {
  const heroContainer = document.getElementById('hero-container');
  if (!heroContainer) return;

  heroContainer.innerHTML = `
    <section class="hero">
      <div class="hero-slider">
        <div class="hero-slide active">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h1>원스톱 벌초 서비스 신청 플랫폼</h1>
            <p>간편하게 벌초 서비스를 신청하세요!</p>
            <div class="hero-buttons">
              <button onclick="showRequestForm()" aria-label="지금 신청하기">지금 신청하기</button>
              <button onclick="scrollToEstimate()" aria-label="견적 알아보기">견적 알아보기</button>
            </div>
          </div>
        </div>
        <div class="hero-slide">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h1>전문 작업자와 함께하는 벌초</h1>
            <p>신뢰할 수 있는 서비스를 경험하세요.</p>
            <div class="hero-buttons">
              <button onclick="showRequestForm()" aria-label="지금 신청하기">지금 신청하기</button>
              <button onclick="scrollToEstimate()" aria-label="견적 알아보기">견적 알아보기</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  let currentSlide = 0;
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 0) {
    setInterval(() => {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', renderHero);

function scrollToEstimate() {
  document.querySelector('.estimate-calculator').scrollIntoView({ behavior: 'smooth' });
}