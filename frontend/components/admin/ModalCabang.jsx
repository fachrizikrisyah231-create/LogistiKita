import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ModalCabang({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    latitude: '',
    longitude: '',
    route_order: '',
    is_active: 1
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ name: '', city: '', latitude: '', longitude: '', route_order: '', is_active: 1 });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      route_order: parseInt(formData.route_order, 10),
      is_active: parseInt(formData.is_active, 10)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-canvas w-[90vw] max-w-[500px] shrink-0 rounded-xl shadow-lg border border-surface-pressed overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-surface-pressed sticky top-0 bg-canvas z-10">
          <h2 className="text-display-sm font-bold text-ink">
            {initialData ? 'Edit Cabang' : 'Tambah Cabang Baru'}
          </h2>
          <button onClick={onClose} className="text-mute hover:text-ink transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1">Nama Cabang</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Contoh: Cabang Jakarta Pusat" />
          </div>
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1">Kota</label>
            <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Contoh: Jakarta" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1">Latitude</label>
              <input required type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="-6.2088" />
            </div>
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1">Longitude</label>
              <input required type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="106.8456" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1">Urutan Rute</label>
              <input required type="number" name="route_order" value={formData.route_order} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="1" />
            </div>
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1">Status</label>
              <select name="is_active" value={formData.is_active} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                <option value={1}>Aktif</option>
                <option value={0}>Nonaktif</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-pill text-body-md font-medium text-mute hover:bg-canvas-soft transition-colors">Batal</button>
            <button type="submit" className="bg-primary text-on-primary px-6 py-2 rounded-pill font-medium text-button-md hover:opacity-90 transition-opacity">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
