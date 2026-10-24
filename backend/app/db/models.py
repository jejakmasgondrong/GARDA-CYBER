
"""
Import seluruh model agar tabel terdaftar di Base.metadata.
Import file ini setelah Base didefinisikan.
"""
from app.models.asset import Asset
from app.models.alert import Alert
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.models.integration import IntegrationRegistryEntry
from app.models.finding import Finding
from app.models.investigation_case import InvestigationCase
from app.models.ip_lookup import IpLookup
from app.models.osint_lookup import OsintLookup
from app.models.github_scan import GithubScanRun
from app.models.job import Job
