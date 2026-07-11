// تذييل «مدعوم بواسطة AktBot».
export function PublicFooter() {
  return (
    <footer className="mt-10 pb-4 text-center">
      <a
        href="https://aktbot.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
        style={{ color: "var(--pp-text)" }}
      >
        <span
          className="flex size-4 items-center justify-center rounded text-[10px] font-bold"
          style={{ background: "var(--pp-accent)", color: "var(--pp-btn-text)" }}
        >
          A
        </span>
        مدعوم بواسطة AktBot
      </a>
    </footer>
  );
}
