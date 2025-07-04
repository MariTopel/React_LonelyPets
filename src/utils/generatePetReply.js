export async function generatePetReply(prompt, page) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, page }),
  });
  const { reply } = await res.json();
  return reply;
}
