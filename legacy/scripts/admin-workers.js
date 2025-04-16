// 작업자 관리 초기화 함수
export async function initializeWorkerManagement() {
    try {
        // 작업자 목록 로드
        const workerList = document.getElementById('workerList');
        if (workerList) {
            // Firebase에서 작업자 데이터 가져오기
            const workers = [
                {
                    id: 'W001',
                    name: '김작업',
                    contact: '010-1234-5678',
                    skills: ['벌초', '예초'],
                    status: '가능',
                    currentTask: '없음',
                    evaluation: '4.5'
                },
                {
                    id: 'W002',
                    name: '이작업',
                    contact: '010-8765-4321',
                    skills: ['태양광 예초', '가지치기'],
                    status: '작업중',
                    currentTask: 'S001',
                    evaluation: '4.8'
                }
            ];

            workerList.innerHTML = workers.map(worker => `
                <tr>
                    <td>${worker.id}</td>
                    <td>${worker.name}</td>
                    <td>${worker.contact}</td>
                    <td>${worker.skills.join(', ')}</td>
                    <td><span class="status-badge ${worker.status.toLowerCase()}">${worker.status}</span></td>
                    <td>${worker.currentTask}</td>
                    <td>${worker.evaluation}</td>
                    <td>
                        <button class="btn-view" onclick="viewWorkerDetails('${worker.id}')">보기</button>
                        <button class="btn-edit" onclick="editWorker('${worker.id}')">수정</button>
                        <button class="btn-delete" onclick="deleteWorker('${worker.id}')">삭제</button>
                    </td>
                </tr>
            `).join('');
        }

        // 검색 및 필터 이벤트 리스너 설정
        const searchInput = document.getElementById('workerSearch');
        const skillFilter = document.getElementById('skillFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        if (skillFilter) {
            skillFilter.addEventListener('change', handleFilter);
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', handleFilter);
        }

        // 모달 이벤트 리스너 설정
        const workerModal = document.getElementById('workerModal');
        if (workerModal) {
            const closeModal = workerModal.querySelector('.close-modal');
            if (closeModal) {
                closeModal.addEventListener('click', () => {
                    workerModal.style.display = 'none';
                });
            }
        }

        console.log('Worker management initialized successfully');
    } catch (error) {
        console.error('Error initializing worker management:', error);
        throw error;
    }
}

// 디바운스 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 검색 처리 함수
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('#workerList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// 필터 처리 함수
function handleFilter() {
    const skillValue = document.getElementById('skillFilter').value;
    const statusValue = document.getElementById('statusFilter').value;
    const rows = document.querySelectorAll('#workerList tr');
    
    rows.forEach(row => {
        const skills = row.cells[3].textContent;
        const status = row.cells[4].textContent.trim();
        
        const skillMatch = skillValue === 'all' || skills.includes(skillValue);
        const statusMatch = statusValue === 'all' || status === statusValue;
        
        row.style.display = skillMatch && statusMatch ? '' : 'none';
    });
}

// 작업자 상세 보기 함수
window.viewWorkerDetails = async function(workerId) {
    try {
        // Firebase에서 작업자 상세 정보 가져오기
        const workerDetails = {
            id: workerId,
            name: '김작업',
            contact: '010-1234-5678',
            email: 'worker@example.com',
            skills: ['벌초', '예초'],
            status: '가능',
            currentTask: '없음',
            evaluation: '4.5'
        };

        const modal = document.getElementById('workerModal');
        if (modal) {
            modal.querySelector('#workerId').textContent = workerDetails.id;
            modal.querySelector('#workerName').value = workerDetails.name;
            modal.querySelector('#workerContact').value = workerDetails.contact;
            modal.querySelector('#workerEmail').value = workerDetails.email;
            modal.querySelector('#workerSkills').value = workerDetails.skills.join(', ');
            modal.querySelector('#workerStatus').value = workerDetails.status;
            modal.querySelector('#workerCurrentTask').value = workerDetails.currentTask;
            modal.querySelector('#workerEvaluation').value = workerDetails.evaluation;
            
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error viewing worker details:', error);
    }
};

// 작업자 수정 함수
window.editWorker = async function(workerId) {
    try {
        await viewWorkerDetails(workerId);
        const modal = document.getElementById('workerModal');
        if (modal) {
            modal.querySelector('.modal-content').classList.add('edit-mode');
        }
    } catch (error) {
        console.error('Error editing worker:', error);
    }
};

// 작업자 삭제 함수
window.deleteWorker = async function(workerId) {
    if (confirm('정말로 이 작업자를 삭제하시겠습니까?')) {
        try {
            // Firebase에서 작업자 삭제
            console.log(`Worker ${workerId} deleted`);
            // 작업자 목록 새로고침
            await initializeWorkerManagement();
        } catch (error) {
            console.error('Error deleting worker:', error);
        }
    }
}; 