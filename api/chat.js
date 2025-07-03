// api/chat.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // 1) Handle preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // 2) Only POST from here
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).end("Method Not Allowed");
  }

  // 3) CORS for the real response
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { prompt } = JSON.parse(req.body);
    const { choices } = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return res.status(200).json({ reply: choices[0].message.content });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI service error" });
  }
}
