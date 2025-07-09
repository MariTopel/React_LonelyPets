// src/components/ChatView.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { generatePetReply } from "../utils/generatePetReply";

export default function ChatView({ user, pet, page: pageProp }) {
  if (!user) return null;

  const [animateUser, setAnimateUser] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState(null);

  // Derive chat namespace: use provided pageProp, else pet.id for persistence
  const currentPage = pageProp ?? pet?.id ?? window.location.pathname;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef();

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!user?.id) return;
    const text = input.trim();
    if (!text) return;

    setInput("");

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      text,
      page: currentPage,
    });
    const newMessage = { role: "user", text };
    setMessages((prev) => [...prev, newMessage].slice(-50));
    setLastUserMessage(newMessage);
    setAnimateUser(true);
    setTimeout(() => {
      setAnimateUser(false);
      setLastUserMessage(null);
    }, 300);

    // Generate and persist AI reply
    const aiReply = await generatePetReply(text, currentPage, user.id, pet);
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      text: aiReply,
      page: currentPage,
    });
    setMessages((prev) =>
      [...prev, { role: "assistant", text: aiReply }].slice(-50)
    );
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
