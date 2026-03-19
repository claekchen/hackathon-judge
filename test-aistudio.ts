import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6IqGSxqJ5c-Fou5Ff9mLk9sFOdt25kq2ked-CBQhMqz2g",
});

async function main() {
  console.log("Uploading video via File API...");
  const file = await ai.files.upload({
    file: "public/uploads/hackathon_best_demo.mp4",
    config: { mimeType: "video/mp4" },
  });
  console.log("Uploaded:", file.name, file.uri, file.state);

  let f = await ai.files.get({ name: file.name! });
  while (f.state === "PROCESSING") {
    console.log("Processing...");
    await new Promise(r => setTimeout(r, 5000));
    f = await ai.files.get({ name: file.name! });
  }
  console.log("Ready:", f.state);

  const result = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: [
      { fileData: { fileUri: f.uri!, mimeType: "video/mp4" } },
      { text: "Describe this video in 2 sentences." },
    ],
  });
  console.log("Response:", result.text);
}
main().catch(console.error);
