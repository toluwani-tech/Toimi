"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "user" | "assistant"; content: string };

export function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/copilot/chat");
      const data = await res.json();
      setMessages(data.messages ?? []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: text }]);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Jotain meni pieleen.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: data.reply },
      ]);
    } catch {
      setError("Verkkovirhe. Yritä uudelleen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI-copilot</h1>
          <p className="text-muted-foreground">
            Kysy yrityksesi tiedoista — avoimista laskuista, tulevista töistä, kuluista ja muusta.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-10 text-center">
            <Sparkles className="size-6 text-muted-foreground" />
            <p className="text-muted-foreground">
              Ei vielä viestejä. Kysy vaikka: &quot;Mitkä laskut ovat myöhässä?&quot;
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              data-testid="copilot-message"
              data-role={m.role}
              className={cn("flex items-start gap-3", m.role === "user" && "flex-row-reverse")}
            >
              <Avatar className="size-8 shrink-0">
                {m.role === "assistant" ? (
                  <div className="flex size-full items-center justify-center bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </div>
                ) : (
                  <AvatarFallback>S</AvatarFallback>
                )}
              </Avatar>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-card-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending && <Skeleton data-testid="copilot-loading" className="h-10 w-2/3" />}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Kirjoita viestisi…"
          rows={2}
          disabled={loading || sending}
        />
        <Button onClick={sendMessage} disabled={loading || sending || !input.trim()}>
          Lähetä
        </Button>
      </div>
    </div>
  );
}
