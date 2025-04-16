import { generateText } from './mcp-ai.js';

// 서비스 추천 함수
async function recommendService(userInput) {
  try {
    const prompt = `
      사용자의 입력: ${userInput}
      
      다음 정보를 바탕으로 적절한 서비스를 추천해주세요:
      1. 벌초: 묘지 관리, 잡초 제거
      2. 예초: 일반 잔디 관리, 풀 제거
      3. 태양광 전문 예초: 태양광 패널 주변 관리
      4. 가지치기: 나무 가지 정리
      5. 벌목: 나무 제거
      6. 제초제 살포: 잡초 방제
      
      추천 서비스와 그 이유를 설명해주세요.
    `;

    const response = await generateText(prompt);
    return response.choices[0].text;
  } catch (error) {
    console.error('서비스 추천 오류:', error);
    throw error;
  }
}

// 서비스 설명 생성 함수
async function generateServiceDescription(serviceType) {
  try {
    const prompt = `
      서비스 유형: ${serviceType}
      
      이 서비스에 대한 상세한 설명을 작성해주세요:
      1. 서비스 내용
      2. 필요한 준비물
      3. 예상 소요 시간
      4. 비용 산정 기준
      5. 주의사항
    `;

    const response = await generateText(prompt);
    return response.choices[0].text;
  } catch (error) {
    console.error('서비스 설명 생성 오류:', error);
    throw error;
  }
}

export { recommendService, generateServiceDescription }; 