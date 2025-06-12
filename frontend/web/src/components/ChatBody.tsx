interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatBody({ messages }: { messages: Message[] }) {
  return (
    <div className="wrapper flex overflow-y-auto justify-center py-8 grow">
        <div className="flex-1 flex flex-col p-4 space-y-4 container max-w-[60%] min-h-full grow">
          {messages.length === 0 ? (
            <p className="text-center flex text-3xl m-auto text-neutral-200">What can I help you with?</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-xl whitespace-pre-line ${
                  msg.isUser
                    ? "bg-neutral-800 text-white self-end ml-auto max-w-lg w-fit"
                    : "bg-transparent text-white self-start mr-auto w-full"
                }`}
              >
                {msg.text}
              </div>
            ))
          )}
        </div>
    </div>
  );
}
