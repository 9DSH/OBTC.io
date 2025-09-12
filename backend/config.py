## config.py
from os import getenv

DB_URI = getenv('DATABASE_URL', 'sqlite:///./deribit_data.db')

DERIBIT_CLIENT_ID = getenv('DERIBIT_CLIENT_ID', 'bQIeKWun')  
DERIBIT_CLIENT_SECRET = getenv('DERIBIT_CLIENT_SECRET', '8swCvyHGZUhvbwUH5tzxE-YG8U7YhXWcAP21vGHAMCI')

MAX_CONCURRENT_REQUESTS = 10  # concurrency limit for async requests
