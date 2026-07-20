"use client";

import { Fragment, useState } from "react";
import { useChat } from "@ai-sdk/react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
} from "@/components/ai-elements/context";
import { Spinner } from "@/components/ui/spinner";

export default function RagChatbot() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (message:PromptInputMessage) => {
    if (!message.text) return

    sendMessage({text: message.text})
    setInput("")
  }
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.metadata);
  const usage = (lastAssistantMessage?.metadata as any)?.usage;

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-[calc(100vh)]">
      <div className="flex flex-col h-full">
        <div className="flex justify-end mb-2">
          {usage && (
            <Context
              usedTokens={usage.inputTokens + usage.outputTokens}
              maxTokens={128000}
              usage={usage}
              modelId="gpt-4.1-mini"
            >
              <ContextTrigger />
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody>
                  <ContextInputUsage />
                  <ContextOutputUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          )}
        </div>
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse> 
                            </MessageContent>
                          </Message>
                        </Fragment>
                      );
                    default:
                      return null
                  }
                })}
              </div>
            ))}
            {(status == "submitted" || status == "streaming") && <Spinner />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput className="mt-4" onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>{/* message, files etc */}</PromptInputTools>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
