// src/utils/generatePetReply.js
import { supabase } from "../supabaseClient";

export async function generatePetReply(prompt, page, userId) {
  // 1) Fetch the current session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  // 2) Call your API with that token
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, page, userId }),
  });

  // 3) Usual error handling + return
  if (!res.ok) {
    const errText = await res.text();
    console.error("Chat API error", res.status, errText);
    return "Sorry, I couldn’t think of a reply just now.";
  }
  const { reply } = await res.json();
  return reply;
}
