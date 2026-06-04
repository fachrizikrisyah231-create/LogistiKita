export default function TrackingTimeline({ statusHistory }) {
  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  // Pre-defined status order for LogistiKita
  const statusFlow = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];
  
  // Find current status to highlight progress
  const currentStatusIndex = statusFlow.indexOf(statusHistory[statusHistory.length - 1].status);

  return (
    <div className="bg-canvas p-2xl rounded-xl border border-surface-pressed shadow-sm">
      <h3 className="text-display-sm font-bold mb-xl">Riwayat Pengiriman</h3>
      
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-canvas-soft"></div>
        <div 
          className="absolute left-4 top-0 w-0.5 bg-primary transition-all duration-500"
          style={{ height: `${(Math.max(0, currentStatusIndex) / (statusFlow.length - 1)) * 100}%` }}
        ></div>

        <div className="space-y-xl">
          {statusFlow.map((status, index) => {
            const isCompleted = index <= currentStatusIndex;
            const historyItem = statusHistory.find(h => h.status === status);
            const isCurrent = index === currentStatusIndex;

            return (
              <div key={status} className="relative flex items-start group">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 shrink-0 transition-colors ${
                    isCompleted ? "bg-primary text-on-primary" : "bg-canvas-soft text-mute"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                  )}
                </div>
                <div className="ml-lg pt-1">
                  <p className={`text-body-md-strong ${isCurrent ? "text-ink" : isCompleted ? "text-ink" : "text-mute"}`}>
                    {status}
                  </p>
                  {historyItem && (
                    <div className="mt-sm space-y-1">
                      <p className="text-body-sm text-body">{historyItem.description}</p>
                      <p className="text-caption text-mute">{new Date(historyItem.timestamp).toLocaleString("id-ID")}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
