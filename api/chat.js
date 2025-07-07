// api/chat.js

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ─── Environment Variables ────────────────────────────────────────────────────
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ─── Chat‐Memory Parameters ────────────────────────────────────────────────────
const SUMMARY_THRESHOLD = 20; // start summarizing after this many turns
const WINDOW = 10; // keep this many recent turns inline

// ─── Initialize OpenAI once────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_KEY });

export default async function handler(req, res) {
  // 0) Only POST allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // 1) Grab the user’s Supabase JWT from the Authorization header
  const authHeader = req.headers.authorization || "";
  const jwt = authHeader.split(" ")[1];
  if (!jwt) {
    return res.status(401).json({ error: "Missing Supabase JWT" });
  }

  // 2) Create a Supabase client _per request_ with that JWT in its headers
  const supabase = createClient(SUPA_URL, SUPA_ANON, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  });

  // 3) Pull prompt, page, userId straight from the already‐parsed JSON body
  const { prompt, page, userId } = req.body || {};
  if (!prompt || !page || !userId) {
    return res
      .status(400)
      .json({ error: "Missing one of: prompt, page, userId" });
  }

  // 4) Fetch the full chat history (oldest → newest)
  const { data: chatRows = [], error: fetchErr } = await supabase
    .from("chat_messages")
    .select("role, text, created_at")
    .eq("user_id", userId)
    .eq("page", page)
    .order("created_at", { ascending: true });

  if (fetchErr) {
    console.error("DB fetch error:", fetchErr);
    return res.status(500).json({ error: "DB fetch failed" });
  }

  // 5) Fetch any existing memory summary
  const { data: memRow } = await supabase
    .from("chat_memories")
    .select("summary")
    .eq("user_id", userId)
    .eq("page", page)
    .single();
  let summary = memRow?.summary ?? null;

  // 6) Summarize old turns if over threshold and no summary exists
  if (!summary && chatRows.length > SUMMARY_THRESHOLD) {
    const toSummarize = chatRows
      .slice(0, chatRows.length - WINDOW)
      .map((r) => `${r.role}: ${r.text}`)
      .join("\n");

    try {
      const sumResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Condense the following conversation into a 2-sentence summary.",
          },
          { role: "user", content: toSummarize },
        ],
      });
      summary = sumResp.choices[0].message.content.trim();

      // Store that summary
      const { error: upsertErr } = await supabase
        .from("chat_memories")
        .upsert({ user_id: userId, page, summary });
      if (upsertErr) console.error("Upsert summary error:", upsertErr);
    } catch (err) {
      console.error("Summary generation error:", err);
    }
  }

  // 7) Build the OpenAI message array
  const SYSTEM_PROMPT = `
You are a friendly virtual pet. You remember personal details (names, preferences)
and reply in short, cheerful sentences.
  `.trim();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(summary
      ? [{ role: "system", content: `Memory summary: ${summary}` }]
      : []),
    ...chatRows.slice(-WINDOW).map((r) => ({ role: r.role, content: r.text })),
    { role: "user", content: prompt },
  ];

  // 8) Call OpenAI for the pet’s reply
  let reply;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    reply = completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: "AI service error" });
  }

  // 9) Log the assistant’s reply back to Supabase
  const { error: insertErr } = await supabase.from("chat_messages").insert({
    user_id: userId,
    role: "assistant",
    text: reply,
    page,
  });
  if (insertErr) console.error("Insert reply error:", insertErr);

  // 10) Return the generated reply
  return res.status(200).json({ reply });
}
