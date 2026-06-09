import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function getWeatherDetails(city) {
  const weatherByCity = {
    patiala: "40 degrees Celsius",
    mohali: "30 degrees Celsius",
    kashipur: "42 degrees Celsius",
  };

  return (
    weatherByCity[city.toLowerCase()] ??
    `Weather details are not available for ${city}.`
  );
}

const tools = {
  getWeatherDetails,
};

const SYSTEM_PROMPT = `
You are an AI agent that solves the user's query by planning, optionally using
tools, and then returning a final answer.

Available Tools:
- function getWeatherDetails(city: string): string

Rules:
- Always respond with exactly one valid JSON object.
- Do not include markdown, code fences, or extra text.
- Use this shape for planning:
  { "type": "plan", "plan": "..." }
- Use this shape to call a tool:
  { "type": "action", "function": "getWeatherDetails", "input": "patiala" }
- Use this shape for the final answer:
  { "type": "output", "output": "..." }

Example:
{ "type": "user", "user": "What is the sum of weather of Patiala and Mohali?" }
{ "type": "plan", "plan": "I will call getWeatherDetails for Patiala." }
{ "type": "action", "function": "getWeatherDetails", "input": "patiala" }
{ "type": "observation", "observation": "40 degrees Celsius" }
{ "type": "plan", "plan": "I will call getWeatherDetails for Mohali." }
{ "type": "action", "function": "getWeatherDetails", "input": "mohali" }
{ "type": "observation", "observation": "30 degrees Celsius" }
{ "type": "output", "output": "The sum is 70 degrees Celsius." }
`;

const messages = [];

function parseAgentResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Model did not return valid JSON: ${text}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  return RETRYABLE_STATUS_CODES.has(error?.status);
}

async function generateAgentResponse(contents) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;

      if (!isRetryableError(error) || isLastAttempt) {
        throw error;
      }

      const delay = 1000 * attempt;
      console.log(
        `Gemini is busy right now. Retrying in ${delay / 1000}s... (${attempt}/${MAX_RETRIES})`,
      );
      await wait(delay);
    }
  }
}

while (true) {
  const query = readlineSync.question(">> ");

  if (query.trim().toLowerCase() === "exit") {
    break;
  }

  const userMessage = {
    type: "user",
    user: query,
  };

  messages.push({
    role: "user",
    parts: [{ text: JSON.stringify(userMessage) }],
  });

  while (true) {
    let response;

    try {
      response = await generateAgentResponse(messages);
    } catch (error) {
      if (isRetryableError(error)) {
        console.log(
          "Gemini is still overloaded. Please try again in a minute.",
        );
        break;
      }

      throw error;
    }

    const responseText = response.text;
    const call = parseAgentResponse(responseText);

    messages.push({
      role: "model",
      parts: [{ text: responseText }],
    });

    if (call.type === "output") {
      console.log("Agent's Response:", call.output);
      break;
    }

    if (call.type === "action") {
      const tool = tools[call.function];
      const observation = tool
        ? tool(call.input)
        : `Tool "${call.function}" is not available.`;

      const observationMessage = {
        type: "observation",
        observation,
      };

      messages.push({
        role: "user",
        parts: [{ text: JSON.stringify(observationMessage) }],
      });

      continue;
    }

    if (call.type !== "plan") {
      throw new Error(`Unknown agent response type: ${call.type}`);
    }
  }
}
