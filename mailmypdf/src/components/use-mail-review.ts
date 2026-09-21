import { useState } from "react";
import { reviewForBasis, type MailReview } from "@/lib/mail-review";

export function useMailReview(basis: string) {
  const [stored, setStored] = useState<MailReview>({ basis, reviewed: false, content: false });
  const review = reviewForBasis(stored, basis);
  // Reset during render so an old approval is never actionable for new inputs.
  if (stored !== review) setStored(review);
  return {
    agreedReviewed: review.reviewed,
    agreedContent: review.content,
    setAgreedReviewed: (reviewed: boolean) => setStored({ ...review, reviewed }),
    setAgreedContent: (content: boolean) => setStored({ ...review, content }),
  };
}
