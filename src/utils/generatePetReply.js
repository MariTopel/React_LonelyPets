// src/utils/generatePetReply.js
import { supabase } from "../supabaseClient";

export async function generatePetReply(prompt, page, userId, pet) {
  // 1) Get session & token
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    console.error("Auth session error:", sessionError);
    throw new Error("Not authenticated");
  }

  const token = session.access_token;

  // 2) Prepare request payload
  const body = {
    prompt,
    page,
    userId,
    pet, // includes pet.name, pet.type, pet.personality
  };

  // 3) Call your API
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // 4) Handle errors
  if (!res.ok) {
    const errText = await res.text();
    console.error("Chat API error", res.status, errText);
    return "Sorry, I couldn’t think of a reply just now.";
  }

  // 5) Parse JSON
  const { reply } = await res.json();
  return reply;
}
