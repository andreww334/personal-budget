import multiprocessing

# Render free tier has limited memory - keep workers low
workers = 2
worker_class = "sync"
timeout = 120
preload_app = True  # Share app memory across workers (copy-on-write)

# Recycle workers periodically to prevent memory leaks
max_requests = 1000
max_requests_jitter = 100
