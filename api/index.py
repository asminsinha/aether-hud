import psutil
import time
import platform
import subprocess
import requests
from scapy.all import srp, Ether, ARP, conf
import socket
from flask import Flask, jsonify, send_file, request
import sympy as sp
from chempy import balance_stoichiometry
from flask_cors import CORS
import os

app = Flask(__name__, static_url_path="", static_folder=".")
CORS(app)

last_net_io = psutil.net_io_counters()
last_net_time = time.time()
cached_network_info = {"ip": "127.0.0.1", "node": "LOCAL_NODE"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(os.path.dirname(BASE_DIR), "public")
GIF_PATH = os.path.join(PUBLIC_DIR, "jarvis.gif")
GIF_PATH2 = os.path.join(PUBLIC_DIR, "jarvis_back.gif")



@app.get('/api/stats')
def get_stats():
    # Optimization Percentage (Simulated based on RAM/CPU health)
    opt_percent = 100 - ((psutil.cpu_percent() + psutil.virtual_memory().percent) / 2)
    
    stats = {
        "cpu": psutil.cpu_percent(interval=None),
        "cpu_freq": psutil.cpu_freq().current if psutil.cpu_freq() else 0,
        "ram": psutil.virtual_memory().percent,
        "ram_used": round(psutil.virtual_memory().used / (1024**3), 2),
        "ram_total": round(psutil.virtual_memory().total / (1024**3), 2),
        "disk": psutil.disk_usage('/').percent,
        "disk_free": round(psutil.disk_usage('/').free / (1024**3), 2),
        "battery": psutil.sensors_battery().percent if psutil.sensors_battery() else 100,
        "power_plugged": psutil.sensors_battery().power_plugged if psutil.sensors_battery() else True,
        "latency": 24, # Placeholder for ping - can be calculated with subprocess
        "optimization": round(opt_percent, 1),
        "boot_time": time.strftime("%H:%M:%S", time.localtime(psutil.boot_time())),
        "processes": len(psutil.pids())
    }
    return jsonify(stats)

@app.route('/api/core_gif')
def get_core_gif():
    if os.path.exists(GIF_PATH):
        return send_file(GIF_PATH, mimetype='image/gif')
    return jsonify({"error": "jarvis.gif asset missing from project directory"}), 404

@app.route('/api/core_back_gif')
def get_core_back_gif():
    if os.path.exists(GIF_PATH2):
        return send_file(GIF_PATH2, mimetype='image/gif')
    return jsonify({"error": "jarvis_back.gif asset missing from project directory"}), 404

def fetch_initial_geo():
    global cached_network_info
    try:
        # We only call this ONCE to avoid being blocked
        response = requests.get('https://ipapi.co/json/', timeout=3.0).json()
        if 'ip' in response:
            cached_network_info["ip"] = response.get('ip')
            cached_network_info["node"] = f"{response.get('city', 'KOLKATA')}, {response.get('country_code', 'IN')}".upper()
    except:
        # If blocked, use a secondary silent service that rarely rate-limits
        try:
            ip = requests.get('https://api.ipify.org', timeout=3.0).text
            cached_network_info["ip"] = ip
            cached_network_info["node"] = "WEST BENGAL, IN"
        except:
            pass

fetch_initial_geo()

@app.get('/api/network_stats')
def get_network_stats():
    global last_net_io, last_net_time,cached_network_info
    
    # 1. Real-Time IP and Location
    ip = cached_network_info["ip"]
    location = cached_network_info["node"]
    try:
        # Primary Provider: Detailed Geo-Data
        geo = requests.get('https://ipapi.co/json/', timeout=1.5).json()
        if 'ip' in geo:
            ip = geo.get('ip')
            location = f"{geo.get('city', 'UNKNOWN')}, {geo.get('country_code', 'XX')}"
    except:
        try:
            # Fallback Provider: High-reliability IP-only check
            # ifconfig.me is very stable and less likely to block requests
            ip = requests.get('https://ifconfig.me', timeout=2.0).text.strip()
            location = "KOLKATA, IN" # Regional fallback
        except:
            # Absolute last resort: Localhost
            ip = "127.0.0.1"
            location = "INTERNAL_CORE"
    # 2. Ping / Latency / Loss
    try:
        param = '-n' if platform.system().lower()=='windows' else '-c'
        output = subprocess.check_output(['ping', param, '1', '8.8.8.8'], timeout=1).decode()
        latency = float(output.split("time=")[1].split("ms")[0])
        packet_loss = 0
    except:
        latency = 0.0
        packet_loss = 100

    # 3. Real Bandwidth Utilization
    now = time.time()
    curr_net_io = psutil.net_io_counters()
    interval = now - last_net_time
    
    # Calculate KB/s
    up_speed = round(((curr_net_io.bytes_sent - last_net_io.bytes_sent) / 1024) / interval, 1)
    down_speed = round(((curr_net_io.bytes_recv - last_net_io.bytes_recv) / 1024) / interval, 1)
    
    last_net_io = curr_net_io
    last_net_time = now

    # 4. Signal Strength (Simulated based on Latency quality)
    signal = 100 - (latency / 5) if latency > 0 else 0
    signal = max(0, min(100, signal))

    # 5. Uplinks
    uplinks = []
    try:
        for conn in psutil.net_connections(kind='inet'):
            if conn.status == 'ESTABLISHED' and len(uplinks) < 4:
                uplinks.append(f"UPLINK_{conn.raddr[0][:12]}")
    except:
        uplinks = ["LOCAL_LOOPBACK"]

    return jsonify({
        "ip": ip,
        "node": location.upper(),
        "jitter": round(latency * 0.12, 2),
        "latency": latency,
        "packet_loss": packet_loss,
        "bandwidth": {"up": up_speed, "down": down_speed},
        "signal": round(signal, 1),
        "uplinks": uplinks if uplinks else ["IDLE"]
    })

@app.get('/api/network_topology')
def get_network_topology():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    gateway = "192.168.1.1" # Standard default
    
    # Identify your specific device name
    my_device_name = platform.node().upper()

    devices = []
    try:
        # Keep your existing Scapy logic exactly as is
        ans, unans = srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst="192.168.1.0/24"), timeout=2, verbose=False)
        for snd, rcv in ans:
            devices.append({
                "ip": rcv.psrc,
                "mac": rcv.hwsrc,
                "status": "TRUSTED" if rcv.psrc == gateway else "EXTERNAL"
            })
    except Exception as e:
        devices = [{"ip": local_ip, "status": "CORE_NODE"}]

    return jsonify({
        "core": {"ip": local_ip, "name": my_device_name},
        "gateway": gateway,
        "nodes": devices
    })


def handle_physics_logic(raw_input):
    import re
    # Get the first word (the command)
    parts = raw_input.split()
    if not parts: return "EMPTY_INPUT"
    command_word = parts[0].lower()
    
    # NEW REGEX: Specifically looks for numbers, including scientific notation (1e10, 5.5e-14)
    # It ignores letters unless they are part of a number (like 'e' in 5e14)
    nums = [float(n) for n in re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", raw_input)]

    formulas = {
        "force": ("Newton's Second Law", lambda m, a: m * a, "N"),
        "work": ("Mechanical Work", lambda f, d: f * d, "J"),
        "power": ("Power Output", lambda w, t: w / t, "W"),
        "velocity": ("Linear Velocity", lambda d, t: d / t, "m/s"),
        "gravity": ("Weight", lambda m: m * 9.81, "N"),
        "energy": ("Kinetic Energy", lambda m, v: 0.5 * m * (v**2), "J"),
        "ohm": ("Ohm's Law", lambda i, r: i * r, "V"),
        "density": ("Density", lambda m, v: m / v, "kg/m³"),
        "einstein": ("Relativity", lambda m: m * (3e8**2), "J"),
        "photon": ("Quantum Energy", lambda f: 6.626e-34 * f, "J"),
        "ideal_gas": ("Ideal Gas Law (P)", lambda n, t, v: (n * 8.314 * t) / v, "Pa")
    }

    try:
        if command_word in formulas:
            name, logic, unit = formulas[command_word]
            # Verify we have enough numbers for the specific formula
            if len(nums) < logic.__code__.co_argcount:
                return f"PARAM_ERR: {command_word} needs {logic.__code__.co_argcount} numbers."
            
            result = logic(*nums[:logic.__code__.co_argcount])
            formatted_res = "{:.4e}".format(result) if abs(result) < 0.01 and result != 0 else round(result, 4)
            return f"{name}: {formatted_res} {unit}"
        return "MODEL_NOT_FOUND"
    except Exception as e:
        return f"CALC_ERROR: {str(e)}"
@app.route('/api/solve', methods=['POST'])

def solve():
    import sympy as sp
    import re
    data = request.json
    raw_input = data.get("input", "").strip()
    
    try:
        # Added ideal_gas to this list
        physics_keys = ["force", "work", "power", "energy", "ohm", "gravity", "velocity", 
                        "density", "einstein", "photon", "ideal_gas"]

        # 1. PHYSICS CHECK
        if any(raw_input.lower().startswith(k) for k in physics_keys):
            result = handle_physics_logic(raw_input)
            return jsonify({"success": True, "result": result})

        # 2. CHEMISTRY CHECK (->)
        elif "->" in raw_input:
            from chempy import balance_stoichiometry
            reactants, products = raw_input.split("->")
            reac, prod = balance_stoichiometry(set(reactants.split("+")), set(products.split("+")))
            balanced = " + ".join([f"{v}{k}" for k, v in reac.items()]) + " -> " + \
                       " + ".join([f"{v}{k}" for k, v in prod.items()])
            return jsonify({"success": True, "result": balanced})

        # 3. SIMULTANEOUS EQUATIONS (;)
        elif ";" in raw_input and "=" in raw_input:
            eq_strings = raw_input.split(";")
            equations = []
            for eq_str in eq_strings:
                if "=" not in eq_str: continue
                l, r = eq_str.split("=")
                l = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', l.strip())
                r = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', r.strip())
                equations.append(sp.Eq(sp.sympify(l), sp.sympify(r)))
            sol = sp.solve(equations)
            return jsonify({"success": True, "result": f"System: {sol}"})

        # 4. ALGEBRA / ARITHMETIC
        else:
            proc_input = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', raw_input)
            if "=" in proc_input:
                l, r = proc_input.split("=")
                sol = sp.solve(sp.Eq(sp.sympify(l), sp.sympify(r)))
            else:
                sol = sp.sympify(proc_input).evalf()
            return jsonify({"success": True, "result": str(sol)})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)