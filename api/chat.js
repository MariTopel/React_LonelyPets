// /api/chat.js
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are a friendly virtual pet. You remember any personal details your human shares—like their name—and use them when you reply.
Keep replies short and cheerful.
`.trim();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const { prompt, page, userId } = req.body || {};
  if (!prompt || !page || !userId) {
    return res.status(400).json({ error: "Missing prompt, page, or userId" });
  }

  // ── DEBUG: make sure you actually hit this function
  console.log("🕵️  /api/chat got:", { userId, page, prompt });

  // 1) Fetch the last 25 turns
  const { data: chatRows, error: fetchErr } = await supabase
    .from("chat_messages")
    .select("role, text")
    .eq("user_id", userId)
    .eq("page", page)
    .order("created_at", { ascending: true })
    .limit(25);

  if (fetchErr) console.error("❌ Supabase fetch error:", fetchErr);
  console.log("🕵️  conversation history:", chatRows);

  // 2) Build the messages array
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(chatRows || []).map((r) => ({
      role: r.role,
      content: r.text,
    })),
    { role: "user", content: prompt },
  ];

  try {
    // 3) Call OpenAI with full context
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
    if (insertErr) console.error("❌ Insert reply error:", insertErr);

    // 5) Return it
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    return res.status(500).json({ error: "AI service error" });
  }
}
