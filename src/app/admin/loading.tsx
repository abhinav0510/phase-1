export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-48 rounded-md bg-navy-100" />
        <div className="h-6 w-24 rounded-md bg-navy-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-navy-100" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-navy-100" />
    </div>
  );
}
