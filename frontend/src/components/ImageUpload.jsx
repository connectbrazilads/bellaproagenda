import React, { useState } from 'react';
import { uploadImage } from '../services/api';

export default function ImageUpload({ value, onChange, label, className = '' }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const r = await uploadImage(file);
      onChange(r.data.url);
    } catch (e) {
      alert('Erro ao enviar imagem.');
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-400 uppercase tracking-widest">{label}</label>}
      <div className="relative group">
        <div className="w-full h-32 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-2xl overflow-hidden flex items-center justify-center hover:border-purple-500/50 transition-all">
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <p className="text-xs text-gray-500 font-bold">CLIQUE PARA ENVIAR</p>
            </div>
          )}
          
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={handleFile}
            accept="image/*"
            disabled={uploading}
          />

          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        {value && (
          <button 
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
