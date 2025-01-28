export default function SkeletonCard() {
  return (
    <div className="relative rounded-lg shadow-lg p-3 md:p-4 bg-overlay-5 border border-overlay-10 animate-pulse flex flex-col justify-between">
      {/* Simulate the provider icon and label */}
      <div className="flex items-center mt-2 mb-3 space-x-2">
        <div className="w-3 h-3 bg-overlay-10 rounded-full" />
        <div className="h-3 w-16 bg-overlay-10 rounded" />
      </div>

      {/* Simulate the email text */}
      <div className="h-4 bg-overlay-10 rounded w-4/5 mb-6 md:mb-8" />

      {/* Simulate the button */}
      <div className="h-8 w-36 bg-overlay-10 rounded mt-4" />
    </div>
  );
}
