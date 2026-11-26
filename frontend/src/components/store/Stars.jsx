import { useState } from "react";
import { Star } from "lucide-react";

export const Stars = ({ value, size = "h-4 w-4", testid }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`} data-testid={testid}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
    ))}
  </span>
);

export const StarPicker = ({ value, onChange, testid = "star-picker" }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)} onMouseEnter={() => setHover(n)} data-testid={`${testid}-${n}`}
          className="rounded-md p-1 transition-transform hover:scale-110">
          <Star className={`h-7 w-7 ${n <= shown ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm text-muted-foreground">{value} / 5</span>}
    </div>
  );
};
