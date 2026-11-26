import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Logo, NAV_LINKS } from "./Nav";
import { Newsletter } from "./Newsletter";

export const Footer = () => (
  <footer className="border-t border-border px-5 sm:px-10 lg:px-16">
    <div className="mx-auto max-w-7xl py-16">
      <div className="flex flex-col gap-8 rounded-[2rem] bg-primary p-8 text-primary-foreground sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="font-display max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Spend less time on content work, starting this week.</h2>
        <a href="/#shop" data-testid="footer-shop-button" className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-7 py-4 font-semibold text-foreground transition-transform hover:-translate-y-0.5">
          Shop products <ArrowRight className="h-5 w-5" />
        </a>
      </div>
      <div className="mt-14 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Digital products for creators, featuring CreatorFlow AI.</p>
          <Newsletter />
        </div>
        <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-4">
          {NAV_LINKS.map(([id, label]) => (
            <li key={id}><a href={`/#${id}`} data-testid={`footer-link-${id}`} className="text-muted-foreground hover:text-primary">{label}</a></li>
          ))}
        </ul>
      </div>
      <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} ProdXStore</p>
        <Link to="/admin" data-testid="footer-admin-link" className="hover:text-primary">Admin sign-in</Link>
      </div>
    </div>
  </footer>
);
