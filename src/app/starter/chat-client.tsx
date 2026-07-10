"use client";

import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StarterPlanView, type StarterPlanData } from "@/components/starter/plan-view";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "user" | "assistant"; content: string };
type SessionStatus = "GATHERING_INFO" | "ADVISING" | "PLAN_READY";

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SessionStatus>("GATHERING_INFO");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StarterPlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/starter/chat");
      const data = await res.json();
      setMessages(data.messages);
      setStatus(data.status);
      setLoading(false);

      if (data.status === "PLAN_READY") {
        const planRes = await fetch("/api/starter/plan");
        const planData = await planRes.json();
        if (planData.plan) setPlan(planData.plan);
      }
    }
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, plan]);

  async function fetchPlan() {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/starter/plan", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPlan(data.plan);
      } else {
        setError(data.error ?? "Suunnitelman koonti epäonnistui.");
      }
    } finally {
      setPlanLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: text }]);

    try {
      const res = await fetch("/api/starter/chat", {
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
      setStatus(data.status);

      if (data.status === "PLAN_READY") {
        await fetchPlan();
      }
    } catch {
      setError("Verkkovirhe. Yritä uudelleen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI-liiketoimintaneuvoja</h1>
        <p className="text-muted-foreground">
          Ilmainen ja veloitukseton — kerro tilanteestasi, niin saat henkilökohtaisen
          käynnistyssuunnitelman.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex items-start gap-3", m.role === "user" && "flex-row-reverse")}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback>{m.role === "user" ? "S" : "AI"}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending && <Skeleton className="h-10 w-2/3" />}
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
          disabled={sending}
        />
        <Button onClick={sendMessage} disabled={sending || !input.trim()}>
          Lähetä
        </Button>
      </div>

      {status === "PLAN_READY" && !plan && (
        <Button variant="outline" onClick={fetchPlan} disabled={planLoading}>
          {planLoading ? "Kootaan suunnitelmaa…" : "Näytä käynnistyssuunnitelmani"}
        </Button>
      )}

      {plan && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Käynnistyssuunnitelmasi</h2>
          <StarterPlanView plan={plan} />
        </div>
      )}
    </div>
  );
}
