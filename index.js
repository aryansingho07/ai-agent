import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
//Tools
function getWeatherDetails(city) {
  if(city.toLowerCase() === "patiala") {
    return "40°C";
  }
  if(city.toLowerCase() === "mohali") {
    return "30°C";
  }
  if(city.toLowerCase() === "kashipur") {
  return "42°C" }
}
// This is a system prompt that defines the tools available to the agent and provides an example of how to use them. The agent will use this information to plan its actions and generate responses.
const SYSTEM_PROMPT = `
Available Tools:

- function getWeatherDetails(city: string): string

getWeatherDetails is a function that accepts city name
and returns weather details

Example:
START
{ "type": "user", "user": "What is the sum of weather of Patiala and Mohali?" }
{ "type": "plan", "plan": "I will call getWeatherDetails for Patiala" }
{ "type": "action", "function": "getWeatherDetails", "input": "patiala" }
{ "type": "observation", "observation": "10°C" }
{ "type": "plan", "plan": "I will call getWeatherDetails for Mohali" }
{ "type": "action", "function": "getWeatherDetails", "input": "mohali" }
{ "type": "observation", "observation": "14°C" }
{ "type": "output", "output": "The sum is 24°C" }
`;
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents:'{ "type": "observation", "observation": "25°C" }',
  config: {
    systemInstruction: SYSTEM_PROMPT,
  }
});

console.log(response.text);