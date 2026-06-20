export default function TrackingTimeline({ statusHistory }) {
  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  // Pre-defined status order for LogistiKita v2
  const statusFlow = ["PENDING", "PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
  
  const latestStatus = statusHistory[statusHistory.length - 1].status;
  const displayStatus = latestStatus === 'AT_BRANCH' ? 'IN_TRANSIT' : latestStatus;
  
  // Find current status to highlight progress
  const currentStatusIndex = statusFlow.indexOf(displayStatus);
  const isFailed = latestStatus === 'FAILED';

  const getStatusLabel = (status, historyItem) => {
    switch (status) {
      case "PENDING": return "Menunggu";
      case "PICKUP": return "Penjemputan";
      case "IN_TRANSIT": return "Dalam Perjalanan";
      case "AT_BRANCH": 
        if (historyItem?.branch_name) {
           return "Tiba di " + historyItem.branch_name.replace(/Cabang\s+/i, '');
        }
        return "Tiba di Kota Transit";
      case "OUT_FOR_DELIVERY": return "Sedang Diantar";
      case "DELIVERED": return "Diterima";
      case "FAILED": return "Gagal";
      default: return status;
    }
  };

  return (
    <div className="bg-canvas p-2xl rounded-xl border border-surface-pressed shadow-sm">
      <h3 className="text-display-sm font-bold mb-xl">Riwayat Status</h3>
      
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-canvas-soft"></div>
        <div 
          className={`absolute left-4 top-0 w-0.5 transition-all duration-500 ${isFailed ? 'bg-red-500' : 'bg-primary'}`}
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
                    isFailed && isCurrent ? "bg-red-500 text-white" : isCompleted ? "bg-primary text-on-primary" : "bg-canvas-soft text-mute"
                  }`}
                >
                  {isFailed && isCurrent ? (
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                  )}
                </div>
                <div className="ml-lg pt-1">
                  <p className={`text-body-md-strong ${isCurrent ? "text-ink" : isCompleted ? "text-ink" : "text-mute"}`}>
                    {getStatusLabel(status, historyItem)}
                  </p>
                  {historyItem && (
                    <div className="mt-sm space-y-1">
                      <p className="text-body-sm text-body">{historyItem.description || historyItem.keterangan}</p>
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
