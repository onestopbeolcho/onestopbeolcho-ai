import { initializeApp } from "firebase/app";
import { VertexAI } from "@google-cloud/vertexai";
import { firebaseConfig } from "./firebase-config.js";
import { checkAuth } from './auth.js';
import { loadNav } from './nav.js';
import { loadFooter } from './footer.js';

// Initialize FirebaseApp
const firebaseApp = initializeApp(firebaseConfig);
console.log('Firebase 앱 초기화 완료');

// Initialize the Vertex AI service
let vertexAI;
let model;

try {
  vertexAI = new VertexAI({
    project: 'onestop-88b05',
    location: 'us-central1',
  });
  console.log('Vertex AI 초기화 완료');

  // Create a GenerativeModel instance
  model = vertexAI.preview.getGenerativeModel({
    model: "gemini-2.0-flash",
    generation_config: {
      temperature: 0.7,
      top_k: 40,
      top_p: 0.95,
      max_output_tokens: 1024,
    }
  });
  console.log('Gemini 모델 초기화 완료');
} catch (error) {
  console.error('Vertex AI 초기화 오류:', error);
}

// 서비스 추천 함수
async function recommendService(userInput) {
  try {
    console.log('서비스 추천 시작:', userInput);
    
    if (!model) {
      throw new Error('AI 모델이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
    }

    if (!userInput || userInput.trim().length < 5) {
      throw new Error('서비스 요구사항을 더 자세히 설명해주세요. (최소 5자 이상)');
    }

    const prompt = `
      사용자의 입력: ${userInput}
      
      다음 정보를 바탕으로 적절한 서비스를 추천해주세요:
      1. 벌초: 묘지 관리, 잡초 제거
      2. 예초: 일반 잔디 관리, 풀 제거
      3. 태양광 전문 예초: 태양광 패널 주변 관리
      4. 가지치기: 나무 가지 정리
      5. 벌목: 나무 제거
      6. 제초제 살포: 잡초 방제
      
      다음 형식으로 답변해주세요:
      [추천 서비스]
      - 서비스명: [서비스명]
      - 추천 이유: [이유]
      - 예상 소요시간: [시간]
      - 예상 비용: [비용]
      - 주의사항: [주의사항]
    `;

    console.log('프롬프트 전송:', prompt);
    const result = await model.generateContent(prompt);
    console.log('응답 받음:', result);
    
    const response = result.response;
    const text = response.text();
    console.log('생성된 텍스트:', text);
    
    return text;
  } catch (error) {
    console.error('서비스 추천 오류:', error);
    if (error.message.includes('초기화')) {
      throw new Error('AI 서비스가 일시적으로 불가능합니다. 잠시 후 다시 시도해주세요.');
    } else if (error.message.includes('자세히')) {
      throw error;
    } else {
      throw new Error('서비스 추천 중 오류가 발생했습니다. 다른 방식으로 설명해주시겠어요?');
    }
  }
}

// 서비스 설명 생성 함수
async function generateServiceDescription(serviceType) {
  try {
    console.log('서비스 설명 생성 시작:', serviceType);
    
    if (!model) {
      throw new Error('Gemini 모델이 초기화되지 않았습니다.');
    }

    const prompt = `
      서비스 유형: ${serviceType}
      
      이 서비스에 대한 상세한 설명을 작성해주세요:
      1. 서비스 내용
      2. 필요한 준비물
      3. 예상 소요 시간
      4. 비용 산정 기준
      5. 주의사항
    `;

    console.log('프롬프트 전송:', prompt);
    const result = await model.generateContent(prompt);
    console.log('응답 받음:', result);
    
    const response = result.response;
    const text = response.text();
    console.log('생성된 텍스트:', text);
    
    return text;
  } catch (error) {
    console.error('서비스 설명 생성 오류:', error);
    throw error;
  }
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('페이지 로드 완료');
  
  checkAuth(false);
  loadNav();
  loadFooter();

  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const chatMessages = document.getElementById('chat-messages');
  const loadingSpinner = document.getElementById('loading');

  // 입력 힌트 추가
  userInput.placeholder = '예: "묘지 잡초가 너무 많아요", "나무 가지가 길어서 잘라주세요"';

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('폼 제출 시작');
    
    const message = userInput.value.trim();
    if (!message) return;

    // 사용자 메시지 표시
    appendMessage('user', message);
    userInput.value = '';
    
    try {
      // 로딩 표시
      loadingSpinner.style.display = 'block';
      console.log('AI 응답 요청 시작');
      
      // AI 응답 생성
      const response = await recommendService(message);
      console.log('AI 응답 받음:', response);
      
      // 응답을 HTML 형식으로 변환하여 표시
      const formattedResponse = formatResponse(response);
      appendMessage('assistant', formattedResponse);
    } catch (error) {
      console.error('AI 응답 오류:', error);
      appendMessage('assistant', error.message);
    } finally {
      // 로딩 숨기기
      loadingSpinner.style.display = 'none';
    }
  });

  function formatResponse(text) {
    // 응답 텍스트를 HTML 형식으로 변환
    const lines = text.split('\n');
    let html = '<div class="service-recommendation">';
    
    lines.forEach(line => {
      if (line.startsWith('-')) {
        const [key, value] = line.split(':').map(s => s.trim());
        html += `<div class="service-detail">
          <strong>${key.replace('-', '')}:</strong>
          <span>${value}</span>
        </div>`;
      } else if (line.startsWith('[') && line.endsWith(']')) {
        html += `<h4>${line.replace(/[\[\]]/g, '')}</h4>`;
      } else {
        html += `<p>${line}</p>`;
      }
    });
    
    html += '</div>';
    return html;
  }

  function appendMessage(role, content) {
    console.log('메시지 추가:', role, content);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    if (typeof content === 'string' && content.includes('service-recommendation')) {
      messageDiv.innerHTML = content;
    } else {
      messageDiv.textContent = content;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

export { recommendService, generateServiceDescription }; 