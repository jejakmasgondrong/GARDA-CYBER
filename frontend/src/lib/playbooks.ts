export interface Playbook {
  id: string;
  name: string;
  /** Kata kunci (huruf kecil) untuk menebak template dari judul/ringkasan insiden. */
  keywords: string[];
  steps: { id: string; text: string }[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'account-takeover',
    name: 'Account takeover',
    keywords: ['akun', 'account', 'takeover', 'credential', 'login', 'phishing', 'password', 'kata sandi'],
    steps: [
      { id: 'confirm', text: 'Konfirmasi aktivitas mencurigakan dari log autentikasi (login tak wajar, perubahan email atau MFA).' },
      { id: 'reset', text: 'Reset kata sandi akun dan cabut semua sesi serta token yang aktif.' },
      { id: 'mfa', text: 'Pastikan MFA aktif. Hapus metode MFA, aturan forwarding, atau alias yang tidak dikenal.' },
      { id: 'scope', text: 'Periksa apa yang diakses akun tersebut (email, file, aplikasi) dan cabut otorisasi OAuth yang mencurigakan.' },
      { id: 'related', text: 'Cek akun lain dengan kata sandi sama atau pola login serupa (credential stuffing).' },
      { id: 'notify', text: 'Beri tahu pemilik akun dan pihak terkait, catat linimasa kejadian.' },
      { id: 'monitor', text: 'Pantau akun beberapa hari setelah pemulihan.' },
    ],
  },
  {
    id: 'malware',
    name: 'Malware / Ransomware',
    keywords: ['malware', 'ransomware', 'virus', 'trojan', 'enkripsi', 'encrypted', 'tebusan'],
    steps: [
      { id: 'isolate', text: 'Isolasi perangkat terdampak dari jaringan. Jangan dimatikan dulu jika perlu forensik memori.' },
      { id: 'scope', text: 'Tentukan cakupan: perangkat lain, folder berbagi, dan akun yang terdampak.' },
      { id: 'evidence', text: 'Amankan bukti: log, sampel file, dan catatan tebusan. Jangan dihapus.' },
      { id: 'creds', text: 'Reset kredensial yang pernah dipakai di perangkat terdampak.' },
      { id: 'restore', text: 'Bangun ulang dari image bersih dan pulihkan data dari backup yang sudah diverifikasi bebas malware.' },
      { id: 'ioc', text: 'Terapkan patch dan blokir IOC (hash, domain, IP) di kontrol yang tersedia.' },
      { id: 'review', text: 'Tinjau pasca-insiden: vektor masuk dan perbaikannya. Keputusan soal tebusan diambil manajemen dan hukum.' },
    ],
  },
  {
    id: 'data-exposure',
    name: 'Data exposure',
    keywords: ['bocor', 'leak', 'exposure', 'expose', 'secret', 'exposed', 'data', 'repository', 'repo'],
    steps: [
      { id: 'identify', text: 'Pastikan data apa yang terekspos, di mana, dan sejak kapan.' },
      { id: 'close', text: 'Tutup akses: cabut tautan publik, perbaiki izin, atau hapus dari sumber terbuka.' },
      { id: 'rotate', text: 'Rotasi kredensial, API key, atau token yang ikut terekspos.' },
      { id: 'logs', text: 'Periksa log akses untuk melihat apakah data sudah diakses pihak lain.' },
      { id: 'cache', text: 'Minta penghapusan dari cache atau indeks (mesin pencari, arsip) bila perlu.' },
      { id: 'legal', text: 'Jika menyangkut data pribadi, nilai kewajiban pemberitahuan menurut UU PDP (periksa batas waktunya) dan informasikan pihak terdampak.' },
      { id: 'fix', text: 'Perbaiki akar masalah (konfigurasi atau proses) dan catat pelajarannya.' },
    ],
  },
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find(p => p.id === id);
}

/** Tebak template dari teks insiden. Default: template pertama. */
export function guessPlaybook(text: string): string {
  const t = text.toLowerCase();
  const hit = PLAYBOOKS.find(p => p.keywords.some(k => t.includes(k)));
  return (hit ?? PLAYBOOKS[0]).id;
}

export const playbookKey = (incidentId: string) => `gc.playbook.${incidentId}`;
