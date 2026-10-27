export default function FounderLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-end justify-between gap-4 pt-1">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-navy-100" />
          <div className="h-4 w-40 rounded bg-navy-100/70" />
        </div>
        <div className="h-10 w-36 rounded-full bg-navy-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-[20px] bg-white ring-1 ring-navy-100/70" />
        ))}
      </div>
      <div className="h-[420px] rounded-[24px] bg-obsidian/90" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-56 rounded-[20px] bg-white ring-1 ring-navy-100/70" />
        <div className="h-56 rounded-[20px] bg-white ring-1 ring-navy-100/70" />
        <div className="h-56 rounded-[20px] bg-white ring-1 ring-navy-100/70" />
      </div>
    </div>
  );
}
