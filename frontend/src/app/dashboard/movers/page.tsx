import { QuoteCard } from "@/components/movers/quote-card";
import { BookingStepper } from "@/components/movers/booking-stepper";
import { mockQuotes } from "@/data/mock-quotes";

export default function MoversPage() {
  const sorted = [...mockQuotes].sort((a, b) => {
    if (a.isBestValue) return -1;
    if (b.isBestValue) return 1;
    return a.price - b.price;
  });

  return (
    <div className="space-y-6">
      <BookingStepper />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((quote) => (
          <QuoteCard key={quote.id} quote={quote} />
        ))}
      </div>
    </div>
  );
}
