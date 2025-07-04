//src/components/ChatView.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { generatePetReply } from "../utils/generatePetReply";

export default function ChatView() {
  const user = supabase.auth.getUser();
  const page = window.location.pathname;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef();

  // Load history on mount or when page changes
  useEffect(() => {
    (async () => {
      +console.log(
        "🔍 ChatView loading messages for",
        user.id,
        "on page",
        page
      );
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, text")
        .eq("user_id", user.id)
        .eq("page", page)
        .order("created_at", { ascending: true });
      +console.log("🔗 load result:", { data, error });
      if (error) console.error(error);
      else setMessages(data || []);
    })();
  }, [user.id, page]);

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    +console.log("✏️  Sending user message:", text, "for", user.id);
    // Save and show user message
    setMessages((prev) => [...prev, { role: "user", text }]);
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      text,
      page,
    });
    +console.log("   → insert user error:", insertErr);
    // Get AI reply
    const reply = await generatePetReply(text, page);
    +console.log("🤖 AI replied:", reply);
    // Save and show AI reply
    setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      text: reply,
      page,
    });
    +console.log("   → insert ai error:", insertErr2);
  }

  return (
    <section id="chat">
      <h2>Chat with your pet</h2>
      <div id="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}-bubble`}>
            <strong>{m.role === "user" ? "You" : "Pet"}:</strong> {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div id="chat-input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </section>
  );
}
