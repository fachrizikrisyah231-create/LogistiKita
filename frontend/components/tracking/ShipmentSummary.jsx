export default function ShipmentSummary({ data }) {
  if (!data) return null;

  return (
    <div className="bg-canvas p-2xl rounded-xl border border-surface-pressed shadow-sm h-fit">
      <h3 className="text-display-sm font-bold mb-xl">Rincian Pengiriman</h3>
      
      <div className="space-y-xl">
        <div>
          <h4 className="text-body-sm-strong text-mute mb-sm">Alamat Tujuan</h4>
          <p className="text-body-md text-ink">{data.destination}</p>
        </div>
        
        <div>
          <h4 className="text-body-sm-strong text-mute mb-md">Rincian Biaya</h4>
          <div className="bg-canvas-soft rounded-lg p-lg space-y-md">
            <div className="flex justify-between items-center text-body-sm text-body">
              <span>Nilai Transaksi</span>
              <span>Rp {data.transactionValue?.toLocaleString("id-ID") || 0}</span>
            </div>
            <div className="flex justify-between items-center text-body-sm text-body">
              <span>Ongkos Kirim</span>
              <span>Rp {data.shippingCost.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between items-center text-body-sm text-body">
              <span>Fee Layanan Logistik</span>
              <span>Rp {data.serviceFee.toLocaleString("id-ID")}</span>
            </div>
            <div className="pt-sm border-t border-surface-pressed flex justify-between items-center text-body-md-strong text-ink">
              <span>Total Biaya</span>
              <span>Rp {(data.shippingCost + data.serviceFee).toLocaleString("id-ID")}</span>
            </div>
          </div>
          <p className="text-caption text-mute mt-sm italic">
            *Biaya diproses secara otomatis oleh sistem, Anda tidak perlu melakukan pembayaran manual.
          </p>
        </div>
      </div>
    </div>
  );
}
