// api/chat.js
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  // 1) Grab and validate the Bearer token
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Missing Supabase JWT" });
  }

  // 2) Create an authenticated Supabase client
  const supabase = createClient(URL, ANON, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  // 3) Pull in your payload
  const { prompt, page, userId } = req.body;
  if (!prompt || !page || !userId) {
    return res.status(400).json({ error: "Missing prompt, page, or userId" });
  }

  // 4) Fetch history under that user’s identity
  const { data: chatRows, error: fetchErr } = await supabase
    .from("chat_messages")
    .select("role, text")
    .eq("user_id", userId)
    .eq("page", page)
    .order("created_at", { ascending: true })
    .limit(25);

  if (fetchErr) {
    console.error("Supabase fetch error:", fetchErr);
    return res.status(500).json({ error: "DB fetch error" });
  }

  // 5) Build the OpenAI messages array
  const SYSTEM_PROMPT = `
You are a friendly virtual pet. You remember personal details (like names) and use them when you reply.
Keep replies short and cheerful.
`.trim();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatRows.map((r) => ({ role: r.role, content: r.text })),
    { role: "user", content: prompt },
  ];

  // 6) Call OpenAI
  let reply;
  try {
    const completion = await OPENAI.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    reply = completion.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: "AI service error" });
  }

  // 7) Persist the assistant’s reply (still under the user’s JWT for RLS)
  const { error: insertErr } = await supabase.from("chat_messages").insert({
    user_id: userId,
    role: "assistant",
    text: reply,
    page,
  });
  if (insertErr) {
    console.error("Insert reply error:", insertErr);
    // Even if insert fails, we can still return the reply
  }

  // 8) Return the generated text
  return res.status(200).json({ reply });
}
