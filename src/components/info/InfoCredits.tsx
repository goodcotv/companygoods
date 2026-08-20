const linkClass =
  "underline underline-offset-2 transition-opacity hover:opacity-70";

const creditsType =
  "font-display text-[calc(11pt-2px)] font-medium uppercase leading-none md:text-[calc(13pt-2px)]";

type InfoCreditsProps = {
  className?: string;
};

export function InfoCredits({ className = "" }: InfoCreditsProps) {
  return (
    <p
      className={[creditsType, "max-w-none whitespace-nowrap text-foreground", className]
        .filter(Boolean)
        .join(" ")}
    >
      Website Design + Production:{" "}
      <a
        href="https://mayabormann.com/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Maya Bormann
      </a>{" "}
      and{" "}
      <a
        href="https://ninalu.work/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Nina Lu
      </a>
      <br />
      Development by{" "}
      <a
        href="https://emwhitney.com"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Emily Whitney
      </a>
    </p>
  );
}
