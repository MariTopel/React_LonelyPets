// src/components/ChatView.jsx
import { useState, useEffect, useRef } from "react";
import { generatePetReply } from "../utils/generatePetReply.js";

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

  // 1) Make handleSend async
  async function handleSend() {
    const text = input.trim();
    if (!text) return;

    // 2) push user's message
    setMessages((prev) => [...prev, { who: "You", text }]);
    setInput("");

    // 3) get the AI's reply and push it
    const reply = await generatePetReply(text);
    setMessages((prev) => [...prev, { who: "Pet", text: reply }]);
  }

  return (
    <section id="chat" className="chat-view">
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
        {/* 4) onClick now calls the async handle */}
        <button onClick={handleSend}>Send</button>
      </div>
    </section>
  );
}
