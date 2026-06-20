export default function StatCard({ title, value, icon, colorClass = "text-primary bg-canvas-soft" }) {
  return (
    <div className="bg-canvas p-6 rounded-xl shadow-sm border border-surface-pressed flex items-center gap-4">
      <div className={`p-4 rounded-full ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-body-sm-strong text-mute">{title}</p>
        <p className="text-display-md font-bold">{value}</p>
      </div>
    </div>
  );
}
