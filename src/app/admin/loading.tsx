export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-navy-50" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-navy-50 lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-navy-100" />
      </div>
      <div className="h-64 rounded-2xl bg-navy-50" />
    </div>
  );
}
