export default function RecommendationCard({ title, detail }) {
  return (
    <div className="rounded-[1.25rem] border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-cyan-200/90">{detail}</p>
    </div>
  );
}
