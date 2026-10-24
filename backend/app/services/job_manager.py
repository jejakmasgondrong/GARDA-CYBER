"""
Job Manager -- lifecycle: QUEUED -> RUNNING -> COMPLETED / FAILED / CANCELLED.

Penegakan scope: target job HARUS berupa Asset yang sudah terdaftar di Asset
Inventory dan berstatus ACTIVE. Tool diambil dari integrations.registry, jadi
menambah tool baru = tambahkan adapter ke registry, tidak perlu mengubah file ini.

Tahap ini SENGAJA sinkron (bukan antrian/worker terpisah) -- sesuai instruksi
"jangan menambahkan message queue kompleks tanpa kebutuhan yang terbukti".
Untuk tool yang benar-benar lama berjalan, desain ini didokumentasikan sebagai
batasan di README, bukan ditutup-tutupi.
"""
import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.integrations.registry import get_adapter_by_id
from app.models.job import Job, JobStatus
from app.repositories.asset import AssetRepository
from app.repositories.job import JobRepository
from app.schemas.job import JobCreate
from app.services.audit_service import record_audit_event

MAX_OUTPUT_CHARS = 2000  # batas evidence yang disimpan, mencegah blob tak terbatas


class ScopeViolationError(ValueError):
    """Target job bukan aset terdaftar/aktif -- job ditolak sebelum dibuat."""


class JobManagerService:
    def __init__(self, db: Session):
        self.db = db
        self.jobs = JobRepository(db)
        self.assets = AssetRepository(db)

    def _validate_scope(self, asset_id: str):
        asset = self.assets.get(asset_id)
        if asset is None:
            raise ScopeViolationError(f"Asset id '{asset_id}' tidak ditemukan di Asset Inventory.")
        if asset.status.value != "active":
            raise ScopeViolationError(
                f"Asset '{asset.name}' berstatus '{asset.status.value}', bukan 'active'. "
                "Job hanya boleh menargetkan aset yang sudah disetujui aktif."
            )
        return asset

    def create_and_run(self, data: JobCreate, requested_by: str = "system") -> Job:
        asset = self._validate_scope(data.asset_id)  # melempar ScopeViolationError jika gagal

        job = Job(
            tool_id=data.tool_id,
            scenario=data.scenario,
            asset_id=data.asset_id,
            parameters_json=json.dumps(data.parameters),
            status=JobStatus.QUEUED,
            requested_by=requested_by,
        )
        job = self.jobs.create(job)
        record_audit_event(
            self.db, actor=requested_by, action="job.created",
            target=f"{data.tool_id}:{asset.identifier}", detail=f"job_id={job.id}",
        )

        adapter = get_adapter_by_id(data.tool_id)
        if adapter is None:
            return self._fail(job, f"Tool '{data.tool_id}' tidak terdaftar di registry.")

        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        self.db.commit()

        if not adapter.is_executable():
            reasons = []
            if not adapter.info.implemented:
                reasons.append("adapter belum diimplementasikan")
            if not adapter.is_installed():
                reasons.append("tool belum terpasang di sistem ini")
            if not adapter.is_configured():
                reasons.append("konfigurasi (.env) belum lengkap")
            return self._fail(job, f"Tidak bisa eksekusi: {', '.join(reasons)}.")

        result = adapter.execute(asset.identifier, data.parameters)

        job.completed_at = datetime.utcnow()
        job.output_summary = result.summary
        if result.raw_output_excerpt:
            job.output_summary += f"\n\n--- Cuplikan output (maks {MAX_OUTPUT_CHARS} char) ---\n" \
                                   f"{result.raw_output_excerpt[:MAX_OUTPUT_CHARS]}"

        if result.success:
            job.status = JobStatus.COMPLETED
            outcome = "success"
        else:
            job.status = JobStatus.FAILED
            job.failure_reason = result.summary
            outcome = "failure"

        self.db.commit()
        self.db.refresh(job)
        record_audit_event(
            self.db, actor=requested_by, action="job.completed", target=f"{data.tool_id}:{asset.identifier}",
            outcome=outcome, detail=f"job_id={job.id}, status={job.status.value}",
        )
        return job

    def _fail(self, job: Job, reason: str) -> Job:
        job.status = JobStatus.FAILED
        job.failure_reason = reason
        job.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        record_audit_event(
            self.db, actor=job.requested_by or "system", action="job.failed",
            target=job.tool_id, outcome="failure", detail=reason,
        )
        return job

    def cancel(self, job_id: str, actor: str = "system") -> Job | None:
        job = self.jobs.get(job_id)
        if job is None:
            return None
        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
            return job  # tidak bisa cancel job yang sudah selesai -- dikembalikan apa adanya
        job.status = JobStatus.CANCELLED
        job.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        record_audit_event(self.db, actor=actor, action="job.cancelled", target=job.tool_id, detail=f"job_id={job.id}")
        return job

    def list_jobs(self, skip: int = 0, limit: int = 50) -> tuple[list[Job], int]:
        limit = max(1, min(limit, 200))
        return self.jobs.list_paginated(skip, limit), self.jobs.count()

    def get(self, job_id: str) -> Job | None:
        return self.jobs.get(job_id)
