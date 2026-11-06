#!/usr/bin/env bash
# Pasang tool opsional GARDA CYBER TANPA sudo.
#
# Kenapa tanpa sudo: di mesin ini sudo butuh password interaktif, dan memasang
# ke ~/.local tidak mengubah sistem. Yang dipasang:
#   - nmap    : paket .deb diekstrak ke ~/.local/opt/nmap + wrapper ~/.local/bin/nmap
#               (nmap butuh LD_LIBRARY_PATH + --datadir, itu yang diurus wrapper)
#   - nuclei  : binary rilis resmi projectdiscovery + template (~87 MB, sekali saja)
#   - amass   : v4.2.0 dibangun dari source lewat `go install`
#               (v5+ bukan single-binary lagi: butuh service "engine" terpisah,
#               sedangkan adapter memanggil `amass enum` langsung)
#
# Setelah selesai, tambahkan baris ini ke backend/.env:
#   NMAP_BINARY=$HOME/.local/bin/nmap
# lalu restart backend.
#
# Pemakaian:
#   bash scripts/install_optional_tools.sh            # pasang yang belum ada
#   bash scripts/install_optional_tools.sh --check    # hanya laporkan status
set -euo pipefail

BIN="$HOME/.local/bin"
OPT="$HOME/.local/opt"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

say() { printf '\n== %s\n' "$1"; }

status() {
  for t in nmap nuclei amass; do
    if command -v "$t" >/dev/null 2>&1; then
      printf '  %-8s OK   %s\n' "$t" "$(command -v "$t")"
    else
      printf '  %-8s --   belum ada\n' "$t"
    fi
  done
}

say "status awal"
status
if [ "$CHECK_ONLY" = "1" ]; then exit 0; fi

mkdir -p "$BIN" "$OPT"

# ---------------- nmap ----------------
if ! command -v nmap >/dev/null 2>&1; then
  say "memasang nmap (ekstrak .deb, tanpa root)"
  TMP=$(mktemp -d)
  ( cd "$TMP"
    apt-get download nmap nmap-common liblinear4 liblua5.3-0 libssh2-1t64 2>/dev/null || true
    mkdir -p root
    for d in *.deb; do dpkg-deb -x "$d" root; done
  )
  rm -rf "$OPT/nmap"
  cp -r "$TMP/root" "$OPT/nmap"
  rm -rf "$TMP"

  cat > "$BIN/nmap" <<'SH'
#!/bin/sh
# Wrapper nmap tanpa root: paket .deb diekstrak ke ~/.local/opt/nmap.
# nmap butuh library (liblinear/lua/ssh2) dan data file (nmap-services);
# keduanya diarahkan di sini supaya `nmap` bisa dipanggil seperti biasa.
NMAPDIR="$HOME/.local/opt/nmap"
export LD_LIBRARY_PATH="$NMAPDIR/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$NMAPDIR/usr/bin/nmap" --datadir "$NMAPDIR/usr/share/nmap" "$@"
SH
  chmod +x "$BIN/nmap"
  nmap --version | head -1
else
  say "nmap sudah ada"
fi

# ---------------- nuclei ----------------
if ! command -v nuclei >/dev/null 2>&1; then
  say "memasang nuclei"
  TMP=$(mktemp -d)
  URL=$(curl -s "https://api.github.com/repos/projectdiscovery/nuclei/releases/latest" \
        | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(a['browser_download_url'] for a in d['assets'] if 'linux_amd64.zip' in a['name']))")
  curl -sL -o "$TMP/nuclei.zip" "$URL"
  ( cd "$TMP" && unzip -o -q nuclei.zip nuclei )
  install -m 755 "$TMP/nuclei" "$BIN/nuclei"
  rm -rf "$TMP"
  nuclei -version | head -1
else
  say "nuclei sudah ada"
fi

say "menyiapkan template nuclei (sekali saja, ~87 MB)"
nuclei -update-templates -silent || true
du -sh "$HOME/nuclei-templates" 2>/dev/null || echo "  (template belum ada)"

# ---------------- amass ----------------
AMASS_OK=0
if command -v amass >/dev/null 2>&1; then
  if amass -version 2>&1 | grep -q '^v4\.'; then AMASS_OK=1; fi
fi
if [ "$AMASS_OK" = "0" ]; then
  say "memasang amass v4.2.0 (go install)"
  if ! command -v go >/dev/null 2>&1; then
    echo "  Go tidak ada; lewati amass. Adapter amass akan tetap 'belum terpasang'."
  else
    GOFLAGS=-mod=mod go install github.com/owasp-amass/amass/v4/cmd/amass@v4.2.0
    install -m 755 "$HOME/go/bin/amass" "$BIN/amass"
    amass -version | head -1
  fi
else
  say "amass v4 sudah ada"
fi

say "status akhir"
status
cat <<EOF

Langkah manual terakhir:
  echo 'NMAP_BINARY=$BIN/nmap' >> backend/.env
  # lalu restart backend

Yang TIDAK dipasang script ini (butuh infrastruktur/key, bukan sekadar binary):
  owasp_zap, wazuh, greenbone  -> service + kredensial
  github_exposure              -> GITHUB_TOKEN + allowlist repo
  ip_reputation                -> ABUSEIPDB_API_KEY
  sigma, suricata, osquery     -> adapter-nya masih placeholder (is_configured() hardcoded False)
EOF
