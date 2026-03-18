import { useState, FormEvent, ChangeEvent } from "react";

interface Props {
  onAddShotNodes: (shots: any[]) => void;
}

export function ScriptCopilotPanel({ onAddShotNodes }: Props) {
  const [messages, setMessages] = useState<Array<{id: string, role: string, content: string}>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/script-to-shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, newMsg] })
      });
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = { id: (Date.now()+1).toString(), role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        // Very basic parse of the 0:"text"\n format from Vercel AI mock
        const lines = chunk.split('\\n');
        for (const line of lines) {
           if (line.startsWith('0:"')) {
               const textPart = line.substring(3, line.lastIndexOf('"')).replace(/\\\\n/g, '\n').replace(/\\\\"/g, '"');
               assistantMsg.content += textPart;
               setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...assistantMsg } : m));
           }
        }
      }

      // Check if the final message contains our JSON shots structure
      try {
        const payload = JSON.parse(assistantMsg.content.trim());
        if (payload && payload.shots) {
          onAddShotNodes(payload.shots);
        }
      } catch (err) {
        /* Ignore parse error, it might just be text */
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel-block script-copilot">
      <div className="ghost-header">
        <h2>Script to Scene Engine</h2>
        <span className="ghost-sub">Powered by Vercel AI SDK</span>
      </div>
      
      <div className="chat-history" style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "1rem" }}>
        {messages.map((m: any) => (
          <div key={m.id} className={`chat-message ${m.role}`}>
            <strong>{m.role === "user" ? "Director: " : "Ghost: "}</strong>
            {m.content}
          </div>
        ))}
        {isLoading && <div className="loading-pulse">Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-row" style={{ display: "flex", gap: "8px" }}>
        <input 
          width="100%"
          value={input}
          placeholder="Type your script here e.g. 'A ninja jumps off a neon roof...'"
          onChange={handleInputChange}
          style={{ flex: 1, padding: "8px", background: "#1f2434", color: "white", border: "1px solid #333" }}
        />
        <button type="submit" disabled={isLoading} className="ghost-button">
          Generate Nodes
        </button>
      </form>
    </section>
  );
}
