import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ModalUser({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, password: '' }); // Don't show existing password
    } else {
      setFormData({ name: '', email: '', password: '', role: 'customer' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-canvas w-[90vw] max-w-[500px] shrink-0 rounded-xl shadow-lg border border-surface-pressed overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-surface-pressed sticky top-0 bg-canvas z-10">
          <h2 className="text-display-sm font-bold text-ink">
            {initialData ? 'Edit User' : 'Tambah User Baru'}
          </h2>
          <button onClick={onClose} className="text-mute hover:text-ink transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1">Nama Lengkap</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1">Email</label>
            <input required={!initialData} type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="john@example.com" disabled={!!initialData} />
            {initialData && <p className="text-xs text-mute mt-1">Email tidak dapat diubah.</p>}
          </div>
          {!initialData && (
            <div>
              <label className="block text-body-sm font-bold text-ink mb-1">Password</label>
              <input required={!initialData} type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Min. 6 karakter" />
            </div>
          )}
          <div>
            <label className="block text-body-sm font-bold text-ink mb-1">Role</label>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-canvas-soft border border-surface-pressed rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="customer">Customer</option>
              <option value="kurir">Kurir</option>
              <option value="admin">Admin</option>
            </select>
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
