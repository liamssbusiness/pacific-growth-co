export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="text-sm font-medium text-stone-700">
              Pacific Growth Co
            </span>
          </div>

          <p className="max-w-sm text-sm leading-relaxed text-stone-400">
            We&apos;re picky about who we work with — we only take on clients we know
            we can move the needle for.
          </p>

          <p className="text-xs text-stone-400">
            &copy; {new Date().getFullYear()} Pacific Growth Co. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
