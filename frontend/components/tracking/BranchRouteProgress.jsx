import React from 'react';

export default function BranchRouteProgress({ routeCabang }) {
  if (!routeCabang || routeCabang.length === 0) return null;

  return (
    <div className="bg-canvas p-xl rounded-xl border border-surface-pressed shadow-sm mb-lg">
      <h3 className="text-display-sm font-bold mb-xl">Rute Pengiriman</h3>
      <div className="flex flex-col md:flex-row items-start md:items-center w-full relative">
        {(() => {
          const currentTargetIndex = routeCabang.findIndex(r => r.arrived_at === null);
          return routeCabang.map((rute, index) => {
            const isDone = rute.arrived_at !== null;
            const isCurrent = index === currentTargetIndex;
            
          return (
            <React.Fragment key={rute.id}>
              <div className="flex items-center gap-2 relative z-10 my-2 md:my-0">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${isCurrent ? 'border-primary bg-primary text-on-primary' : isDone ? 'border-primary bg-canvas text-primary' : 'border-surface-pressed bg-canvas-soft text-mute'}`}>
                  {isCurrent ? '⏳' : isDone ? '✅' : '⬜'}
                </div>
                <div className="flex flex-col">
                  <span className={`text-body-sm-strong ${isDone || isCurrent ? 'text-ink' : 'text-mute'}`}>{rute.branch_name.replace(/Cabang\s+/i, '')}</span>
                  {rute.arrived_at && <span className="text-caption text-mute">{new Date(rute.arrived_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>}
                </div>
              </div>
              {index < routeCabang.length - 1 && (
                <div className={`hidden md:block flex-1 h-0.5 mx-2 ${isDone ? 'bg-primary' : 'bg-surface-pressed'}`}></div>
              )}
            </React.Fragment>
          );
        })})()}
      </div>
    </div>
  );
}
