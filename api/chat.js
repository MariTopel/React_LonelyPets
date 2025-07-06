// api/chat.js

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ─── Environment Variables ────────────────────────────────────────────────────
// URL of your Supabase project
const SUPA_URL = process.env.VITE_SUPABASE_URL;
// Public (anon) key to initialize Supabase client (we’ll override with JWT below)
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY;
// Your OpenAI secret key, used only on the server
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ─── Chat‐Memory Parameters ────────────────────────────────────────────────────
// After this many raw turns, we’ll summarize older ones
const SUMMARY_THRESHOLD = 20;
// Keep this many of the most recent turns for direct context
const WINDOW = 10;

// Initialize OpenAI once per cold start
const openai = new OpenAI({ apiKey: OPENAI_KEY });

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // ─── 1) Extract & validate Supabase JWT from the Authorization header ─────────
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Missing Supabase JWT" });
  }

  // ─── 2) Create a Supabase client that uses the user’s JWT for RLS ─────────────
  // This ensures all DB calls respect Row­Level Security for that user
  const supabase = createClient(SUPA_URL, SUPA_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // ─── 3) Parse & validate request body ────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  const { prompt, page, userId } = payload;
  if (!prompt || !page || !userId) {
    return res
      .status(400)
      .json({ error: "Missing one of: prompt, page, userId" });
  }

  // ─── 4) Load full chat history (oldest → newest) for this user+page ─────────
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

  // ─── 5) Load any existing memory summary for this user+page ────────────────────
  const { data: memRow = {} } = await supabase
    .from("chat_memories")
    .select("summary")
    .eq("user_id", userId)
    .eq("page", page)
    .single();
  let summary = memRow.summary; // may be undefined if no summary yet

  // ─── 6) If too many turns & no summary yet, generate & store one ──────────────
  if (!summary && chatRows.length > SUMMARY_THRESHOLD) {
    // Take all but the last WINDOW turns to summarize
    const toSummarize = chatRows
      .slice(0, chatRows.length - WINDOW)
      .map((r) => `${r.role}: ${r.text}`)
      .join("\n");

    try {
      // Ask OpenAI to condense into two sentences
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

      // Upsert that summary back into the chat_memories table
      const { error: upsertErr } = await supabase
        .from("chat_memories")
        .upsert({ user_id: userId, page, summary });
      if (upsertErr) console.error("Upsert summary error:", upsertErr);
    } catch (err) {
      console.error("Summary generation error:", err);
      // If summarization fails, we’ll continue without it
    }
  }

  // ─── 7) Build the final messages array for the pet’s response ─────────────────
  const SYSTEM_PROMPT = `
You are a friendly virtual pet. You remember personal details (like names and preferences)
and stay on topic in short, cheerful replies.
  `.trim();

  // Compose: system prompt → optional memory → recent turns → new prompt
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },

    // Inject memory summary if available
    ...(summary
      ? [{ role: "system", content: `Memory summary: ${summary}` }]
      : []),

    // Only include the last WINDOW turns for inline context
    ...chatRows.slice(-WINDOW).map((r) => ({
      role: r.role,
      content: r.text,
    })),

    // Finally, the user’s new message
    { role: "user", content: prompt },
  ];

  // ─── 8) Call OpenAI to generate the pet’s reply ───────────────────────────────
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

  // ─── 9) Persist the assistant’s reply under the user’s identity ───────────────
  const { error: insertErr } = await supabase.from("chat_messages").insert({
    user_id: userId,
    role: "assistant",
    text: reply,
    page,
  });
  if (insertErr) {
    console.error("Insert reply error:", insertErr);
    // We still return the reply even if DB log fails
  }

  // ─── 10) Return the generated reply to the client ────────────────────────────
  return res.status(200).json({ reply });
}
