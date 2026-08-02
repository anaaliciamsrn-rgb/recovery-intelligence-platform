import { useState, type ReactNode } from "react";

interface AccordionItemData {
  question: string;
  answer: ReactNode;
}

export function Accordion({ items }: { items: AccordionItemData[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      className="divide-y rounded-[var(--radius-lg)] border"
      style={{ borderColor: "var(--color-border)" }}
    >
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;

        return (
          <div key={item.question} style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
              style={{ color: "var(--color-text)" }}
            >
              {item.question}
              <span
                aria-hidden
                className="shrink-0 transition-transform duration-200"
                style={{
                  transform: isOpen ? "rotate(180deg)" : "none",
                  color: "var(--color-text-muted)",
                }}
              >
                ▾
              </span>
            </button>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                className="animate-fade-in px-5 pb-4 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
