import { useEffect, useRef } from "react";

export const Reveal = ({ as: Tag = "div", delay = 0, className = "", children, ...rest }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
};

export const SectionHead = ({ eyebrow, title, children, id }) => (
  <Reveal className="max-w-2xl">
    <p className="eyebrow" data-testid={`${id}-eyebrow`}>{eyebrow}</p>
    <h2 className="font-display mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
      {title}
    </h2>
    {children && <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">{children}</p>}
  </Reveal>
);
