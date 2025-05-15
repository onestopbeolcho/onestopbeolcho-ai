document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 폼 데이터 수집
            const formData = {
                category: document.getElementById('category').value,
                priority: document.getElementById('priority').value,
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                message: document.getElementById('message').value,
                file: document.getElementById('file').files[0],
                timestamp: new Date().toISOString()
            };

            try {
                // Firestore에 문의 저장
                const db = firebase.firestore();
                await db.collection('inquiries').add(formData);
                
                // 성공 메시지 표시
                alert('문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.');
                contactForm.reset();
                
            } catch (error) {
                console.error('문의 저장 중 오류 발생:', error);
                alert('문의 접수 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        });
    }

    // FAQ 아코디언 기능
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('h3');
        const answer = item.querySelector('p');
        
        // 초기 상태 설정
        answer.style.display = 'none';
        
        question.addEventListener('click', () => {
            // 현재 상태 확인
            const isOpen = answer.style.display === 'block';
            
            // 모든 FAQ 답변 닫기
            faqItems.forEach(faq => {
                faq.querySelector('p').style.display = 'none';
            });
            
            // 클릭한 FAQ만 토글
            answer.style.display = isOpen ? 'none' : 'block';
        });
    });
}); 