    // api.js

const HF_TOKEN = "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";
const MODEL = "openai/gpt-oss-120b:groq";
const BASE_URL = "https://router.huggingface.co/v1";

async function sendToAPI(chatHistory, onLoadingStart, onLoadingEnd, onSuccess, onError) {
  try {
    onLoadingStart();

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: chatHistory,
        max_tokens: 600,
        temperature: 0.75
      })
    });

    onLoadingEnd();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content.trim();

    onSuccess(reply);

  } catch (error) {
    onLoadingEnd();
    onError(error);
  }
}
