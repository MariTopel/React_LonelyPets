// src/components/ChatView.jsx
import { useState, useEffect, useRef } from "react";

export default function ChatView() {
  const [messages, setMessages] = useState(
    () => JSON.parse(localStorage.getItem("chatHistory")) || []
  );
  const [input, setInput] = useState("");
  const endRef = useRef();

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { who: "You", text }]);
    setInput("");

    //this is the ai chatbot
    export async function generatePetReply(userText) {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ prompt: userText }),
      });
      const data = await res.json();
      return data.reply;
    }
  }

  return (
    <section id="chat">
      <h2>Chat with your pet</h2>
      <div id="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-bubble ${
              m.who === "You" ? "user-bubble" : "pet-bubble"
            }`}
          >
            <strong>{m.who}:</strong> {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div id="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </section>
  );
}
