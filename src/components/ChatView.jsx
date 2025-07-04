import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { generatePetReply } from "../utils/generatePetReply";

export default function ChatView({ user, page: pageProp }) {
  // If no user, render nothing
  if (!user) return null;

  // Derive the page key: use the prop if passed in, otherwise use the URL
  const currentPage = pageProp || window.location.pathname;

  // Local state for chat messages & input box
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef();

  // Load existing messages from Supabase whenever the user or page changes
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      console.log("🔍 Loading chat for", user.id, "on", currentPage);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, text")
        .eq("user_id", user.id)
        .eq("page", currentPage)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Load error:", error);
      } else {
        setMessages(data || []);
      }
    })();
  }, [user?.id, currentPage]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handler for Send button
  async function handleSend() {
    if (!user?.id) return;
    const text = input.trim();
    if (!text) return;

    setInput("");

    // 1) Persist user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      text,
      page: currentPage,
    });
    setMessages((prev) => [...prev, { role: "user", text }]);

    // 2) Generate pet reply
    const reply = await generatePetReply(text, currentPage);

    // 3) Persist assistant reply
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      text: reply,
      page: currentPage,
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
