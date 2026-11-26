import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { SectionHead } from "./Reveal";

const FAQS = [
  ["How do I get access after I buy?", "One-time products are delivered instantly — you can download everything right after purchase. CreatorFlow AI is an online app: sign in at creatorflowai.prodxstore.com and your plan's credits are added to your account."],
  ["Is access lifetime or a subscription?", "Each product card shows its billing period. One-time products are pay once, own forever, with updates included. CreatorFlow AI has a free plan, monthly and yearly subscriptions, and lifetime options on its pricing page."],
  ["What is the difference between monthly and yearly on CreatorFlow AI?", "Yearly is the same plan billed once per year — you save about 17% compared to paying month-to-month, and you receive 12× the monthly credits upfront."],
  ["Do CreatorFlow AI credits expire?", "Credits from one-time credit packs never expire and stack on top of any plan. Media credits are only spent after you approve a scene, and failed generations are refunded."],
  ["Where do I pay, and is it secure?", "Checkout happens on each product's own page. The “Buy now” and “See plans” buttons take you straight there."],
  ["Can I use the products in client work?", "Yes — catalogue products come with a commercial license for client projects, internal tools or your own products, and CreatorFlow AI outputs can be used in client work and monetized content."],
  ["What if something goes wrong with my purchase?", "Send us a message through the Contact form below with your order email and what happened. Refund terms are listed on each product's own page."],
];

export const FAQ = () => (
  <section id="faq" className="section-pad">
    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.4fr]">
      <SectionHead id="faq" eyebrow="FAQ" title="Access & billing, answered.">
        Still unsure? Our support team is one message away.
      </SectionHead>
      <Accordion type="single" collapsible className="w-full" data-testid="faq-accordion">
        {FAQS.map(([q, a], i) => (
          <AccordionItem key={q} value={`q${i}`} className="border-border">
            <AccordionTrigger data-testid={`faq-trigger-${i}`} className="py-5 text-left font-display text-base font-semibold hover:text-primary hover:no-underline sm:text-lg">
              {q}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);
