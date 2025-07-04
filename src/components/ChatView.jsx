//src/components/ChatView.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { generatePetReply } from "../utils/generatePetReply";

export default function ChatView({ user }) {
  const page = window.location.pathname;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef();

  // Don’t attempt DB calls until user is ready
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      console.log("🔍 Loading for", user.id, "page", page);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, text")
        .eq("user_id", user.id)
        .eq("page", page)
        .order("created_at", { ascending: true });
      console.log("🔗 load result:", { data, error });
      if (error) return console.error("Load error:", error);
      setMessages(data || []);
    })();
  }, [user?.id, page]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!user?.id) return;
    const text = input.trim();
    if (!text) return;
    setInput("");

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      text,
      page,
    });
    setMessages((prev) => [...prev, { role: "user", text }]);

    // Generate and save AI reply
    const reply = await generatePetReply(text, page);
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      text: reply,
      page,
    });
    setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
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
