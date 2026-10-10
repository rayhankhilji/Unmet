import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-reading px-4 py-16 md:px-6">
      <EmptyState
        title="We couldn't find that."
        action={
          <Button asChild variant="secondary">
            <Link href="/">Back to investigations</Link>
          </Button>
        }
      >
        It may be private, or the link may be out of date.
      </EmptyState>
    </div>
  );
}
