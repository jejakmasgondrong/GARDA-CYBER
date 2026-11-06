from sqlalchemy import Column, Integer, String
from app.db.base import Base


class SecurityLog(Base):
    """Log akses ringan untuk panel Blue Team.

    Hanya metadata akses yang disimpan. Kolom email/password/latitude/longitude
    yang ada pada versi awal GARDA CYBER 2.0 SENGAJA tidak dipakai: platform ini
    tidak mengumpulkan kredensial maupun koordinat pengguna.
    """

    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    client_ip = Column(String, index=True)

    city = Column(String, nullable=True)
    isp = Column(String, nullable=True)

    access_time = Column(String)
