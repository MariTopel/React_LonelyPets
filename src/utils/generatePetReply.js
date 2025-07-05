// src/utils/generatePetReply.js

/**
 * Sends your prompt + page + userId to /api/chat,
 * then returns the assistant’s reply text (or a fallback on error).
 */
export async function generatePetReply(prompt, page, userId) {
  try {
    // 1) Send exactly one request, passing all three fields
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, page, userId }),
    });

    // 2) Handle non-200 statuses
    if (!res.ok) {
      const errText = await res.text();
      console.error("Chat API error", res.status, errText);
      return "Sorry, I couldn't think of a reply just now.";
    }

    // 3) Grab the body as text, guard against empty
    const text = await res.text();
    if (!text) {
      console.error("Empty response from /api/chat");
      return "Oops, I got nothing back!";
    }

    // 4) Parse once, return the reply
    const data = JSON.parse(text);
    return data.reply;
  } catch (err) {
    console.error("Failed to talk to /api/chat:", err);
    return "Error talking to my brain!";
  }
}
