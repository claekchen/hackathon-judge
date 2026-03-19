import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  apiKey: "AQ.Ab8RN6IqGSxqJ5c-Fou5Ff9mLk9sFOdt25kq2ked-CBQhMqz2g",
});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: "Say hello in 5 words",
  });
  console.log(response.text);
}
main().catch(console.error);
