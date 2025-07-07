// api/chat.js

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ─── Env vars ────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ─── Chat-memory tuning ───────────────────────────────────────────────────────
const SUMMARY_THRESHOLD = 20; // start summarizing after N turns
const WINDOW = 10; // keep this many recent turns in-context

// ─── Init OpenAI once ─────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_KEY });

export default async function handler(req, res) {
  // 0) Only accept POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // 1) Grab Supabase JWT from Authorization header
  const authHeader = req.headers.authorization || "";
  const jwt = authHeader.replace(/^Bearer\s+/, "");
  if (!jwt) {
    return res.status(401).json({ error: "Missing Supabase JWT" });
  }

  // 2) Create Supabase client scoped to this user
  const supabase = createClient(SUPA_URL, SUPA_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  // 3) Parse body
  const { prompt, page, userId } = req.body || {};
  if (!prompt || !page || !userId) {
    return res.status(400).json({ error: "Missing prompt, page or userId" });
  }

  // 4) Load full chat history (oldest→newest)
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

  // 5) Load or generate memory summary
  const { data: memRow } = await supabase
    .from("chat_memories")
    .select("summary")
    .eq("user_id", userId)
    .eq("page", page)
    .single();
  let summary = memRow?.summary ?? null;

  if (!summary && chatRows.length > SUMMARY_THRESHOLD) {
    // Summarize the oldest turns
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

      // Persist it
      await supabase
        .from("chat_memories")
        .upsert({ user_id: userId, page, summary });
    } catch (err) {
      console.error("Summary error:", err);
    }
  }

  // 6) Fetch the user’s profile
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("full_name, favorite_color, bio")
    .eq("user_id", userId)
    .single();
  if (profErr && profErr.code !== "PGRST116") {
    console.error("Profile load error:", profErr);
  }
  const profileMsg = prof
    ? `Profile — name: ${prof.full_name}, favorite color: ${prof.favorite_color}, bio: ${prof.bio}.`
    : null;

  // 7) Build a single SYSTEM_PROMPT + messages array
  const SYSTEM_PROMPT = `
You are a friendly virtual pet. You remember personal details (names, preferences)
and reply in short, cheerful sentences.
  `.trim();

  const messages = [
    // a) your role & instructions
    { role: "system", content: SYSTEM_PROMPT },

    // b) inject profile context if we have it
    ...(profileMsg ? [{ role: "system", content: profileMsg }] : []),

    // c) inject memory summary if present
    ...(summary
      ? [{ role: "system", content: `Memory summary: ${summary}` }]
      : []),

    // d) the last WINDOW turns
    ...chatRows.slice(-WINDOW).map((r) => ({
      role: r.role,
      content: r.text,
    })),

    // e) finally the user’s new prompt
    { role: "user", content: prompt },
  ];

  // 8) Call OpenAI for a reply
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

  // 9) Log assistant’s reply back to Supabase
  const { error: insertErr } = await supabase
    .from("chat_messages")
    .insert({ user_id: userId, role: "assistant", text: reply, page });
  if (insertErr) console.error("Insert reply error:", insertErr);

  // 10) Return the AI’s reply to the client
  return res.status(200).json({ reply });
}
