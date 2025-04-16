// MCP AI API 설정
const MCP_AI_CONFIG = {
  apiKey: 'YOUR_MCP_AI_API_KEY',
  endpoint: 'https://api.mcp.ai/v1',
  models: {
    text: 'gpt-4',
    image: 'dall-e-3'
  }
};

// MCP AI API 호출 함수
async function callMCPAI(endpoint, data) {
  try {
    const response = await fetch(`${MCP_AI_CONFIG.endpoint}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_AI_CONFIG.apiKey}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`MCP AI API 호출 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('MCP AI API 오류:', error);
    throw error;
  }
}

// 텍스트 생성 함수
async function generateText(prompt) {
  return await callMCPAI('text/generate', {
    model: MCP_AI_CONFIG.models.text,
    prompt: prompt,
    max_tokens: 1000
  });
}

// 이미지 생성 함수
async function generateImage(prompt) {
  return await callMCPAI('image/generate', {
    model: MCP_AI_CONFIG.models.image,
    prompt: prompt,
    size: '1024x1024'
  });
}

export { MCP_AI_CONFIG, callMCPAI, generateText, generateImage }; 