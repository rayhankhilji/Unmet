import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-16 pb-24 md:px-6 md:pt-24">
      <div className="max-w-3xl">
        <h1 className="font-display text-display text-balance md:text-display-xl">
          What do skincare buyers want that doesn&rsquo;t exist yet?
        </h1>
        <p className="mt-6 max-w-measure text-body text-muted">
          Unmet reads short-form skincare video &mdash; what people say, show and write in the
          comments &mdash; and finds the complaints, wishes and workarounds that point at a product
          nobody sells. Every number comes from a query, every claim links to the moment in the
          video that supports it, and each need is argued against before it is recommended.
        </p>
        <p className="mt-6">
          <Link
            href="/about"
            className="rounded-sm text-body text-info underline underline-offset-4 decoration-1 hover:decoration-2"
          >
            How it works
          </Link>
        </p>
      </div>
    </div>
  );
}
