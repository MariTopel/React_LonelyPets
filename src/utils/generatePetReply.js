export async function generatePetReply(userText) {
  const res = await fetch("https://react-lonely-pets.vercel.app/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: userText }),
  });
  const { reply } = await res.json();
  return reply;
}
