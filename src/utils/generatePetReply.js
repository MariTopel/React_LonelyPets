// src/utils/generatePetReply.js

/**
 * Sends your prompt + page to the /api/chat endpoint,
 * then returns the assistant’s reply text (or a fallback on error).
 */
export async function generatePetReply(prompt, page) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, page }),
    });

    if (!res.ok) {
      // log raw body for debugging
      const errText = await res.text();
      console.error("Chat API error", res.status, errText);
      return "Sorry, I couldn't think of a reply just now.";
    }

    const text = await res.text();
    if (!text) {
      console.error("Empty response from /api/chat");
      return "Oops, I got nothing back!";
    }

    const data = JSON.parse(text);
    return data.reply;
  } catch (err) {
    console.error("Failed to talk to /api/chat:", err);
    return "Error talking to my brain!";
  }
}
