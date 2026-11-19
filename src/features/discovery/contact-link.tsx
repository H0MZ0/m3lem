"use client";
export function ContactLink({
  href,
  id,
  trade,
  city,
  channel,
  children,
}: {
  href: string;
  id: string;
  trade: string;
  city: string;
  channel: "call" | "whatsapp";
  children: React.ReactNode;
}) {
  return (
    <a
      className={"button" + (channel === "whatsapp" ? " alt" : "")}
      href={href}
      onClick={() => {
        navigator.sendBeacon?.(
          "/contact-event?" + new URLSearchParams({ id, city, trade, channel }),
        );
      }}
    >
      {children}
    </a>
  );
}
