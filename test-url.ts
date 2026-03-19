import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  apiKey: "AQ.Ab8RN6IqGSxqJ5c-Fou5Ff9mLk9sFOdt25kq2ked-CBQhMqz2g",
});

async function main() {
  console.log("Testing video via URL...");
  const result = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: [
      { fileData: { fileUri: "https://flow-random-stuff.s3.us-east-1.amazonaws.com/libin/hackathon_best_demo.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAWYN5UZPGC7PP6O74%2F20260319%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260319T161341Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=b9db8d61f161f9c3568c93ba9e8c28ab68bfbd9b54d160b3dfc2c5b00e975f6d", mimeType: "video/mp4" } },
      { text: "Describe what you see in this video in 3 sentences. Be specific about what products or demos are shown." },
    ],
  });
  console.log("Response:", result.text);
}
main().catch(e => console.error("Error:", e.message || e));
