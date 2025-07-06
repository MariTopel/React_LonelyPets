// api/chat.js

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ─── Environment Variables ────────────────────────────────────────────────────
// These must be set in Vercel’s Environment Variables (no `VITE_` prefix for the secret!)
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ─── Chat‐Memory Parameters ────────────────────────────────────────────────────
const SUMMARY_THRESHOLD = 20; // how many turns before we summarize
const WINDOW = 10; // how many recent turns to keep in context

// ─── Initialize clients at module top ────────────────────────────────────────
// 1) Supabase client (will override auth header per-request below)
const supabase = createClient(SUPA_URL, SUPA_ANON);

// 2) OpenAI client
const openai = new OpenAI({ apiKey: OPENAI_KEY });

export default async function handler(req, res) {
  // ─── 0) Only accept POST ─────────────────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // ─── 1) Extract & validate Supabase JWT ──────────────────────────────────────
  // Vercel passes the header Authorization: Bearer <token>
  const authHeader = req.headers.authorization || "";
  const jwt = authHeader.split(" ")[1];
  if (!jwt) {
    return res.status(401).json({ error: "Missing Supabase JWT" });
  }

  // ─── 2) Inject the JWT into our Supabase client for RLS enforcement ─────────
  supabase.auth.setAuth(jwt);

  // ─── 3) Unpack request body ─────────────────────────────────────────────────
  // Vercel already parses JSON bodies, so req.body is an object
  const { prompt, page, userId } = req.body || {};
  if (!prompt || !page || !userId) {
    return res
      .status(400)
      .json({ error: "Missing one of: prompt, page, userId" });
  }

  // ─── 4) Load full chat history (oldest→newest) ───────────────────────────────
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

  // ─── 5) Load existing memory summary (if any) ────────────────────────────────
  const { data: memRow } = await supabase
    .from("chat_memories")
    .select("summary")
    .eq("user_id", userId)
    .eq("page", page)
    .single();
  // Use optional chaining to avoid null.summary
  let summary = memRow?.summary ?? null;

  // ─── 6) Summarize old turns if too many and no summary exists ────────────────
  if (!summary && chatRows.length > SUMMARY_THRESHOLD) {
    // Prepare the text to summarize (all but the last WINDOW turns)
    const toSummarize = chatRows
      .slice(0, chatRows.length - WINDOW)
      .map((r) => `${r.role}: ${r.text}`)
      .join("\n");

    try {
      // Ask OpenAI to condense it
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

      // Store (upsert) the new summary back into chat_memories
      const { error: upsertErr } = await supabase
        .from("chat_memories")
        .upsert({ user_id: userId, page, summary });
      if (upsertErr) console.error("Upsert summary error:", upsertErr);
    } catch (err) {
      console.error("Summary generation error:", err);
      // proceed without a summary if it fails
    }
  }

  // ─── 7) Build OpenAI messages: system → memory → recent context → user ──────
  const SYSTEM_PROMPT = `
You are a friendly virtual pet. You remember personal details (like names and preferences)
and stay on topic in short, cheerful replies.
  `.trim();

  const messages = [
    // Always start with the system instruction
    { role: "system", content: SYSTEM_PROMPT },

    // If we have a summary, inject it as another system message
    ...(summary
      ? [{ role: "system", content: `Memory summary: ${summary}` }]
      : []),

    // Then only the last WINDOW turns for local context
    ...chatRows.slice(-WINDOW).map((r) => ({
      role: r.role,
      content: r.text,
    })),

    // Finally, the new user prompt
    { role: "user", content: prompt },
  ];

  // ─── 8) Call OpenAI to get the pet’s reply ───────────────────────────────────
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

  // ─── 9) Persist the assistant’s reply into chat_messages ────────────────────
  const { error: insertErr } = await supabase.from("chat_messages").insert({
    user_id: userId,
    role: "assistant",
    text: reply,
    page,
  });
  if (insertErr) {
    console.error("Insert reply error:", insertErr);
    // we still return the reply even if the database log fails
  }

  // ─── 10) Return the AI reply to the client ─────────────────────────────────
  return res.status(200).json({ reply });
}
