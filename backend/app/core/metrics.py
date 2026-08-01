from prometheus_client import Counter, Histogram, Gauge

REQUEST_COUNT = Counter(
    "cybersentinel_http_requests_total",
    "Total HTTP Requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "cybersentinel_http_request_duration_seconds",
    "HTTP Request Latency in Seconds",
    ["method", "endpoint"],
)

ACTIVE_SCANS = Gauge(
    "cybersentinel_active_scans_total",
    "Total Active Defensive Scans",
)
