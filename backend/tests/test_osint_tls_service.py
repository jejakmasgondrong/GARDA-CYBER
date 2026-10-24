from unittest.mock import MagicMock, patch

import pytest

from app.services.osint_tls_service import TlsFetchError, fetch_tls_certificate


def test_tls_fetch_raises_on_connection_failure():
    with patch("socket.create_connection", side_effect=OSError("refused")):
        with pytest.raises(TlsFetchError):
            fetch_tls_certificate("example.com", "93.184.216.34", timeout_seconds=2.0)


def test_tls_fetch_connects_to_validated_ip_not_hostname():
    """Pastikan create_connection dipanggil dengan IP yang sudah divalidasi,
    BUKAN hostname (itu tujuan utama proteksi DNS-rebinding)."""
    with patch("socket.create_connection") as mock_connect:
        mock_connect.side_effect = OSError("stop here, we only check the call args")
        with pytest.raises(TlsFetchError):
            fetch_tls_certificate("example.com", "93.184.216.34", timeout_seconds=2.0, port=443)
        called_address = mock_connect.call_args[0][0]
        assert called_address == ("93.184.216.34", 443)
