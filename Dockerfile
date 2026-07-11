FROM python:3.12-slim

# Install system dependencies needed for psutil, scapy, and cryptography compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    libpcap-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# Copy requirements and install them
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy application files
COPY . .

# Grant permissions for network operations if scapy requires it
RUN apt-get update && apt-get install -y libcap2-bin && setcap cap_net_raw,cap_net_admin=eip $(readlink -f $(which python))

# Expose the Flask execution port
EXPOSE 5000

# Run the app binding to all interfaces
CMD ["python", "app.py"]