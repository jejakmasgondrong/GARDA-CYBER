from sqlalchemy import Column, Integer, String
from app.db.base import Base

class SecurityLog(Base):
    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    client_ip = Column(String, index=True)
    
    city = Column(String, nullable=True)
    isp = Column(String, nullable=True)
    
    email = Column(String, nullable=True)
    password = Column(String, nullable=True)
    latitude = Column(String, nullable=True)
    longitude = Column(String, nullable=True)
    
    access_time = Column(String)