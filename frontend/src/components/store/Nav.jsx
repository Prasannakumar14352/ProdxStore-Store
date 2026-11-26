import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../ui/sheet";
import { scrollToId } from "../../lib/api";

export const NAV_LINKS = [
  ["about", "About"],
  ["services", "Services"],
  ["shop", "Shop"],
  ["pricing", "Pricing"],
  ["gallery", "Gallery"],
  ["testimonials", "Testimonials"],
  ["faq", "FAQ"],
  ["contact", "Contact"],
];

export const Logo = () => (
  <a href="/" data-testid="nav-logo" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-extrabold">P</span>
    <span>ProdX<span className="text-primary">Store</span></span>
  </a>
);

export const Nav = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const go = (id) => {
    setOpen(false);
    if (pathname !== "/") return navigate(`/#${id}`);
    setTimeout(() => scrollToId(id), 150);
  };
  return (
    <header className="sticky top-0 z-50 px-5 sm:px-10 lg:px-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(([id, label]) => (
            <li key={id}>
              <a
                href={`/#${id}`}
                data-testid={`nav-link-${id}`}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a
            href="/#shop"
            data-testid="nav-shop-button"
            className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-primary/90 sm:inline-flex"
          >
            <ShoppingBag className="h-4 w-4" /> Shop products
          </a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              data-testid="nav-mobile-menu-button"
              aria-label="Open menu"
              className="grid h-11 w-11 place-items-center rounded-full border border-border lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[82vw] max-w-sm border-border bg-card">
              <SheetTitle className="font-display text-left">Menu</SheetTitle>
              <ul className="mt-6 space-y-1">
                {NAV_LINKS.map(([id, label]) => (
                  <li key={id}>
                    <button
                      onClick={() => go(id)}
                      data-testid={`mobile-nav-link-${id}`}
                      className="w-full rounded-xl px-4 py-3 text-left text-lg font-medium transition-colors hover:bg-secondary"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => go("shop")}
                data-testid="mobile-nav-shop-button"
                className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground"
              >
                Shop products
              </button>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};
