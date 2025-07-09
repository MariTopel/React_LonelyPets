// src/components/ChatView.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { generatePetReply } from "../utils/generatePetReply";

export default function ChatView({ user, pet, page: pageProp }) {
  if (!user) return null;

  const [animateUser, setAnimateUser] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState(null);

  // Use pet.id as the chat storage key for persistence across pages
  const chatKey = pageProp ?? pet?.id ?? window.location.pathname;
  // Use the actual path for AI context (prompts include location)
  const pagePath = window.location.pathname;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef();

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      console.log("🔍 Loading chat for user", user.id, "using key", chatKey);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, text")
        .eq("user_id", user.id)
        .eq("page", chatKey)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Load error:", error);
      } else {
        setMessages(data || []);
      }
    })();
  }, [user?.id, chatKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!user?.id) return;
    const text = input.trim();
    if (!text) return;

    // Optimistically clear input
    setInput("");

    // Persist user message under chatKey
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      text,
      page: chatKey,
    });
    const userMsg = { role: "user", text };
    setMessages((prev) => [...prev, userMsg].slice(-50));
    setLastUserMessage(userMsg);
    setAnimateUser(true);
    setTimeout(() => {
      setAnimateUser(false);
      setLastUserMessage(null);
    }, 300);

    // Generate AI reply using pagePath for context
    const aiReply = await generatePetReply(text, pagePath, user.id, pet);

    // Persist assistant message under chatKey
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      text: aiReply,
      page: chatKey,
    });
    const petMsg = { role: "assistant", text: aiReply };
    setMessages((prev) => [...prev, petMsg].slice(-50));
  }

  return (
    <section id="chat">
      <h2>Chat with your pet</h2>

      <div id="chat-messages">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLatestUser = isUser && animateUser && m === lastUserMessage;
          const isLatestPet = !isUser && i === messages.length - 1;
          const extraClass = isLatestUser
            ? "user-fade-in"
            : isLatestPet
            ? "fade-in"
            : "";
          const key = `${m.role}-${i}-${m.text.slice(0, 10)}`;
          return (
            <div
              key={key}
              className={`chat-bubble ${m.role}-bubble ${extraClass}`}
            >
              <strong>{isUser ? "You" : pet?.name || "Pet"}:</strong> {m.text}
            </div>
          );
        })}
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
