import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { IoCopyOutline, IoCheckmark } from 'react-icons/io5';
import { useState } from 'react';
import styles from './ChatBody.module.css';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock = ({ node, inline, className, children, ...props }: CodeProps) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const codeString = String(children).replace(/\n$/, '');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (inline) {
    return (
      <code
        className="bg-neutral-700 text-red-300 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        className={`${styles.syntaxhighlighter} rounded-lg !bg-neutral-800 !mt-2 !mb-2 overflow-x-auto`}
        codeTagProps={{
          style: {
            fontSize: '0.875rem',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }
        }}
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
      
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {language !== 'text' && (
          <div className="text-xs text-neutral-400 bg-neutral-700 px-2 py-1 rounded">
            {language}
          </div>
        )}
        <button
          onClick={copyToClipboard}
          className="text-neutral-400 hover:text-white bg-neutral-700 hover:bg-neutral-600 p-1.5 rounded transition-colors group-hover:opacity-100"
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <IoCheckmark size={14} className="text-green-400" />
          ) : (
            <IoCopyOutline size={14} />
          )}
        </button>
      </div>
    </div>
  );
};

export default function ChatBody({ messages }: { messages: Message[] }) {
  console.log(messages);
  return (
    <div className="wrapper flex overflow-y-auto justify-center py-8 grow">
      <div className="flex-1 flex flex-col p-4 space-y-4 container max-w-[60%] min-h-full grow">
        {messages.length === 0 ? (
          <p className="text-center flex text-3xl m-auto text-neutral-200">What can I help you with?</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl ${
                msg.isUser
                  ? "bg-neutral-800 text-white self-end ml-auto max-w-lg w-fit"
                  : "bg-transparent text-white self-start mr-auto w-full"
              }`}
            >
              {msg.isUser ? (
                <div className="whitespace-pre-line">{msg.text}</div>
              ) : (
                <div className="prose prose-invert prose-neutral max-w-none">
                  <ReactMarkdown
                    components={{
                      code: CodeBlock,
                      h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-white">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0 text-white">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-white">{children}</h3>,
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-white">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-white">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-white">{children}</ol>,
                      li: ({ children }) => <li className="text-white">{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-neutral-600 pl-4 italic mb-3 text-neutral-300">
                          {children}
                        </blockquote>
                      ),
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-white">{children}</em>,
                      a: ({ children, href }) => (
                        <a 
                          href={href} 
                          className="text-blue-400 hover:text-blue-300 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-3">
                          <table className="min-w-full border-collapse border border-neutral-600">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-neutral-600 px-3 py-2 bg-neutral-700 text-left font-semibold text-white">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-neutral-600 px-3 py-2 text-white">
                          {children}
                        </td>
                      ),
                      hr: () => <hr className="border-neutral-600 my-4" />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              {msg.isStreaming && (
                <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}