import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-[var(--gc-primary)] mb-4">404</p>
        <h1 className="text-xl font-bold text-[var(--gc-text)] mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-[var(--gc-text-secondary)] mb-6">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
          <Button leftIcon={<Home className="h-4 w-4" />} onClick={() => navigate('/')}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
