import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = "AIzaSyDTvYIoZOhI7nV0OwtjgKHU_fgug2f7e80";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "wheater of kashipur,uttarakhand",
});

console.log(response.text);