import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // CORS & method checks omitted for brevity…

  console.log("🔔 /api/chat invoked");
  console.log("🔑 OPENAI_API_KEY:", process.env.OPENAI_API_KEY);
  let prompt;
  try {
    ({ prompt } = JSON.parse(req.body));
    console.log("📨 Received prompt:", prompt);
  } catch (e) {
    console.error("❌ Invalid JSON body:", e);
    return res.status(400).json({ error: "Invalid JSON" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const reply = completion.choices[0].message.content;
    console.log("✅ OpenAI replied:", reply);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("🤖 OpenAI error:", err);
    return res.status(500).json({ error: err.message });
  }
}
