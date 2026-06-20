export default function TaskCard({ t, branches, handleUpdateStatus }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PICKUP': return 'bg-orange-100 text-orange-800';
      case 'IN_TRANSIT': return 'bg-blue-100 text-blue-800';
      case 'AT_BRANCH': return 'bg-purple-100 text-purple-800';
      case 'OUT_FOR_DELIVERY': return 'bg-cyan-100 text-cyan-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-canvas-soft text-mute';
    }
  };

  const getTipeColor = (tipe) => {
    switch(tipe) {
      case 'reguler': return 'bg-gray-100 text-gray-800';
      case 'nextday': return 'bg-blue-100 text-blue-800';
      case 'sameday': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isCompleted = t.status === 'DELIVERED' || t.status === 'FAILED';

  return (
    <div className={`bg-canvas p-6 rounded-xl border border-surface-pressed shadow-sm ${isCompleted ? 'opacity-70' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-display-sm font-bold">{t.order_id}</h3>
          <div className="flex gap-2 mt-2">
             <span className={`text-caption font-bold px-2 py-1 rounded-md ${getStatusColor(t.status)}`}>{t.status}</span>
             <span className={`text-caption font-bold px-2 py-1 rounded-md capitalize ${getTipeColor(t.tipe_pengiriman)}`}>{t.tipe_pengiriman}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-body-md text-ink mb-6">
        <div><span className="text-mute font-medium">Asal:</span> {t.alamat_asal}</div>
        <div><span className="text-mute font-medium">Tujuan:</span> {t.alamat_tujuan}</div>
        {!isCompleted && t.rute_cabang && (
          <div className="text-body-sm text-mute mt-2 p-3 bg-canvas-soft rounded-md">
            Rute: {t.rute_cabang.map(r => r.branch_name).join(' → ')}
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className="pt-4 border-t border-surface-pressed flex flex-wrap gap-2 items-center">
          {t.status === 'PENDING' && (
            <button onClick={() => handleUpdateStatus(t.id, 'PICKUP')} className="bg-primary text-on-primary px-4 py-2 rounded-pill text-button-md font-medium hover:bg-black-elevated">✅ Sudah Diambil</button>
          )}
          {t.status === 'PICKUP' && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {(() => {
                const nextBranch = t.rute_cabang?.find(r => !r.arrived_at);
                if (!nextBranch) return null;
                return (
                  <button 
                    onClick={() => handleUpdateStatus(t.id, 'AT_BRANCH', nextBranch.branch_id)} 
                    className="bg-primary text-on-primary px-4 py-2 rounded-pill text-button-md font-medium hover:bg-black-elevated shrink-0 w-full"
                  >
                    🏢 Tiba di {nextBranch.branch_name}
                  </button>
                );
              })()}
            </div>
          )}
          {t.status === 'IN_TRANSIT' && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {(() => {
                const nextBranch = t.rute_cabang?.find(r => !r.arrived_at);
                if (!nextBranch) return null;
                return (
                  <button 
                    onClick={() => handleUpdateStatus(t.id, 'AT_BRANCH', nextBranch.branch_id)} 
                    className="bg-primary text-on-primary px-4 py-2 rounded-pill text-button-md font-medium hover:bg-black-elevated shrink-0 w-full"
                  >
                    🏢 Tiba di {nextBranch.branch_name}
                  </button>
                );
              })()}
            </div>
          )}
          {t.status === 'AT_BRANCH' && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {(() => {
                const nextBranch = t.rute_cabang?.find(r => !r.arrived_at);
                if (nextBranch) {
                  return (
                    <button 
                      onClick={() => handleUpdateStatus(t.id, 'IN_TRANSIT')} 
                      className="bg-canvas text-ink border border-surface-pressed px-4 py-2 rounded-pill text-button-md font-medium hover:bg-canvas-softer shrink-0 w-full"
                    >
                      🚚 Lanjut Transit ke {nextBranch.branch_name}
                    </button>
                  );
                } else {
                  return (
                    <button 
                      onClick={() => handleUpdateStatus(t.id, 'OUT_FOR_DELIVERY')} 
                      className="bg-primary text-on-primary px-4 py-2 rounded-pill text-button-md font-medium hover:bg-black-elevated shrink-0 w-full"
                    >
                      🏃 Antar ke Penerima
                    </button>
                  );
                }
              })()}
            </div>
          )}
          {t.status === 'OUT_FOR_DELIVERY' && (
            <button onClick={() => handleUpdateStatus(t.id, 'DELIVERED')} className="bg-green-600 text-white px-4 py-2 rounded-pill text-button-md font-medium hover:bg-green-700">✅ Sudah Diterima</button>
          )}
          
          <button onClick={() => handleUpdateStatus(t.id, 'FAILED')} className="bg-red-100 text-red-800 px-4 py-2 rounded-pill text-button-md font-medium hover:bg-red-200 ml-auto">⚠️ Lapor Masalah</button>
        </div>
      )}
    </div>
  );
}
