// /api/chat.js
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Init Supabase and OpenAI using env vars
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// A short system prompt to anchor personality
const SYSTEM_PROMPT = `
You are a friendly virtual pet. Respond cheerfully and stay on topic.
Keep replies brief (1–2 sentences).
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  let body;
  try {
    body = JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  const { prompt, page, userId } = body;
  if (!prompt || !page || !userId) {
    return res.status(400).json({ error: "Missing prompt, page, or userId" });
  }

  // 1) Fetch the last N messages (e.g. 10) for this user & page
  const { data: history, error: histErr } = await supabase
    .from("chat_messages")
    .select("role, text")
    .eq("user_id", userId)
    .eq("page", page)
    .order("created_at", { ascending: true })
    .limit(10);

  if (histErr) {
    console.error("History fetch error:", histErr);
    // we can still proceed with an empty history
  }

  // 2) Build OpenAI messages
  const messages = [
    { role: "system", content: SYSTEM_PROMPT.trim() },
    ...(history || []).map((m) => ({
      role: m.role,
      content: m.text,
    })),
    { role: "user", content: prompt },
  ];

  try {
    // 3) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    const reply = completion.choices[0].message.content;

    // 4) Persist the assistant’s reply
    const { error: insertErr } = await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "assistant",
      text: reply,
      page,
    });
    if (insertErr) console.error("Insert reply error:", insertErr);

    // 5) Return it
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: "AI service error" });
  }
}
