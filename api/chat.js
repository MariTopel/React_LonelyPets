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

  // ─── Fetch the user’s profile from Supabase ─────────────────────────────────
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("full_name, favorite_color, bio")
    .eq("user_id", userId)
    .single();

  if (profErr) {
    console.error("Couldn’t load profile:", profErr);
    // we’ll proceed without it if there’s an error
  }

  // ─── Build the OpenAI system‐prompts ────────────────────────────────────────
  const SYSTEM_PROMPT = `
You are a friendly virtual pet. You remember personal details (names, preferences)
and reply in short, cheerful sentences.
  `.trim();

  // If we have a profile row, turn it into a system message:
  const profileMsg = prof
    ? `Profile — name: ${prof.full_name || "N/A"}, favorite color: ${
        prof.favorite_color || "N/A"
      }, bio: ${prof.bio || "N/A"}.`
    : null;

  // Assemble the messages in order:
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    // inject profile context _first_
    ...(profileMsg ? [{ role: "system", content: profileMsg }] : []),

    // then (optional) memory summary and recent turns…
    ...(summary
      ? [{ role: "system", content: `Memory summary: ${summary}` }]
      : []),
    ...chatRows.slice(-WINDOW).map((r) => ({ role: r.role, content: r.text })),

    // and finally the user’s new prompt
    { role: "user", content: prompt },
  ];

  // 5) Fetch any existing memory summary (must happen BEFORE building messages)
  const { data: memRow } = await supabase
    .from("chat_memories")
    .select("summary")
    .eq("user_id", userId)
    .eq("page", page)
    .single();
  let summary = memRow?.summary ?? null;

  // 6) If too many turns and no summary, generate & persist one
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
            content: "Condense the following into a 2-sentence summary.",
          },
          { role: "user", content: toSummarize },
        ],
      });
      summary = sumResp.choices[0].message.content.trim();

      await supabase
        .from("chat_memories")
        .upsert({ user_id: userId, page, summary });
    } catch (err) {
      console.error("Summary error:", err);
    }
  }



  const profileMsg = prof
    ? `Profile — name: ${prof.full_name}, color: ${prof.favorite_color}, bio: ${prof.bio}.`
    : null;



    // 7a) optional profile context
    ...(profileMsg ? [{ role: "system", content: profileMsg }] : []),

    // 7b) optional summary
    ...(summary
      ? [{ role: "system", content: `Memory summary: ${summary}` }]
      : []),

    // 7c) last WINDOW chat turns
    ...chatRows.slice(-WINDOW).map((r) => ({
      role: r.role,
      content: r.text,
    })),

    // 7d) finally the new user prompt
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
