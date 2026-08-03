"use client";

import { Fragment, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

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
import { Spinner } from "@/components/ui/spinner";

export default function RagChatbot() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (message:PromptInputMessage) => {
    if (!message.text) return

    sendMessage({text: message.text})
    setInput("")
  }

  return (
    <>
      <Show when="signed-out">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">Log in to use chat</h1>
          <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
            You need an account to ask questions.
          </p>
          <div className="flex gap-2">
            <SignInButton mode="modal">
              <Button variant="outline">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Sign Up</Button>
            </SignUpButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="max-w-4xl mx-auto p-6 relative size-full h-[calc(100dvh-4rem)]">
          <div className="flex flex-col h-full">
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
      </Show>
    </>
  );
}
