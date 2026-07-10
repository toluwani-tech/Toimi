import { ChatClient } from "./chat-client";

export default function StarterPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <ChatClient />
    </div>
  );
}
