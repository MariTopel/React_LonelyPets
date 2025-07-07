//src/components/ChatView.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { generatePetReply } from "../utils/generatePetReply";

export default function ChatView({ user, page: pageProp }) {
  // If no user, render nothing
  if (!user) return null;

  //states

  const [animateUser, setAnimateUser] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState(null);

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
  // Handler for Send button
  async function handleSend() {
    if (!user?.id) return;
    const text = input.trim();
    if (!text) return;

    // 1) Optimistically clear the input
    setInput("");

    // 2) Persist the user’s message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      text,
      page: currentPage,
    });
    const newMessage = { role: "user", text };
    setMessages((prev) => {
      const next = [...prev, newMessage];
      return next.slice(-50);
    });
    setLastUserMessage(newMessage);
    setAnimateUser(true);

    setTimeout(() => {
      setAnimateUser(false);
      setLastUserMessage(null);
    }, 300); // Adjust timing to match your animation

    // 3) Generate the AI reply (with full context)
    //    Pass in prompt, page, and userId
    const aiReply = await generatePetReply(text, currentPage, user.id);

    // 4) Persist the assistant’s reply
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      text: aiReply,
      page: currentPage,
    });
    setMessages((prev) => {
      const next = [...prev, { role: "assistant", text: aiReply }];
      return next.slice(-50);
    });
  }

  return (
    <section id="chat">
      <h2>Chat with your pet</h2>

      <div id="chat-messages">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isPet = m.role === "assistant";

          const isLatestUser = isUser && animateUser && m === lastUserMessage;
          const isLatestPet = isPet && i === messages.length - 1;

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
              <strong>{isUser ? "You" : "Pet"}:</strong> {m.text}
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

console.log("History fetched:", history);
