// api/chat.js
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // 1) CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // 2) Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).end();
  }

  // 3) CORS for the real response
  res.setHeader("Access-Control-Allow-Origin", "*");

  // 4) Manually collect the request body
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  // 5) Parse JSON & extract prompt + page
  let prompt, page;
  try {
    ({ prompt, page } = JSON.parse(body));
  } catch (e) {
    console.error("❌ Invalid JSON body:", e);
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // location aware snippet
  const system = `User is exploring the ${page.slice(1)} area.`;
  const messages = [
    { role: "system", content: system },
    { role: "user", content: prompt },
  ];

  try {
    // 6) Call OpenAI with our messages array
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      // you can tweak temperature, max_tokens, etc. here
    });

    const reply = completion.choices[0].message.content;
    console.log("✅ reply:", reply);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("🤖 OpenAI error:", err);
    return res.status(500).json({ error: err.message });
  }
}
