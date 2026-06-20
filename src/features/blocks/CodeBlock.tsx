import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CodeBlockProps {
  children: string;
  className?: string;
}

const LANG_LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript JSX",
  js: "JavaScript",
  jsx: "JavaScript JSX",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  c: "C",
  cpp: "C++",
  cs: "C#",
  css: "CSS",
  html: "HTML",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  sql: "SQL",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  fish: "Fish",
  powershell: "PowerShell",
  ps1: "PowerShell",
  md: "Markdown",
  dockerfile: "Dockerfile",
  docker: "Dockerfile",
  makefile: "Makefile",
  swift: "Swift",
  kt: "Kotlin",
  scala: "Scala",
  php: "PHP",
  r: "R",
  lua: "Lua",
  dart: "Dart",
  zig: "Zig",
  ex: "Elixir",
  exs: "Elixir",
  erl: "Erlang",
  hs: "Haskell",
  vim: "Vim",
  diff: "Diff",
  proto: "Protocol Buffers",
  graphql: "GraphQL",
  graphqls: "GraphQL",
  nginx: "Nginx",
  apache: "Apache",
  text: "Text",
  plaintext: "Text",
  log: "Log",
  env: "Env",
  gitignore: "Gitignore",
  csv: "CSV",
  typescript: "TypeScript",
  javascript: "JavaScript",
};

function extractLanguage(className?: string): string {
  if (!className) return "";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "";
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const lang = extractLanguage(className);
  const label = LANG_LABELS[lang] || lang;
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API might not be available
    }
  }, [children]);

  const lines = children.split("\n");

  return (
    <div className="relative group/code my-2" data-testid="code-block">
      {/* Header bar: language label + copy button */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 rounded-t-lg",
          "dark:bg-white/[0.04] light:bg-black/[0.03]",
          "border dark:border-white/[0.08] light:border-black/[0.08]",
          "border-b-0",
          "text-[11px] font-medium",
        )}
      >
        <span className="dark:text-mac-tertiary-label light:text-gray-500 uppercase tracking-wider">
          {label || "Code"}
        </span>
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy code"}
          aria-label={copied ? "Copied!" : "Copy code"}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
            "transition-all duration-150 active:scale-[0.95]",
            "opacity-0 group-hover/code:opacity-100",
            copied
              ? "dark:text-mac-green light:text-green-600"
              : "dark:text-mac-tertiary-label light:text-gray-400 dark:hover:text-mac-label light:hover:text-gray-700",
          )}
          data-testid="code-copy-btn"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre
        className={cn(
          "relative overflow-x-auto rounded-b-lg",
          "p-3 m-0",
          "text-[12px] leading-[1.6]",
          "font-mono",
          "dark:bg-mac-control light:bg-gray-100",
          "border dark:border-white/[0.08] light:border-black/[0.08]",
          "border-t-0",
        )}
      >
        <code className={className}>
          {lines.length > 1 ? (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td
                      className={cn(
                        "pr-3 select-none text-right align-top",
                        "dark:text-mac-quaternary-label light:text-gray-400",
                        "text-[11px] w-[1%] whitespace-nowrap",
                      )}
                    >
                      {i + 1}
                    </td>
                    <td className="whitespace-pre">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            children
          )}
        </code>
      </pre>
    </div>
  );
}
