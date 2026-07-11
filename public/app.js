const WEATHER_API_KEY = '8cd562d84eaabd242faff60cb54eee56';

const features = [
    { name: "NEXUS", info: "STABLE" }, 
    { name: "GRID", info: "ENCRYPTED" }, 
    
    { name: "OPTICS", info: "ACTIVE" }, 
    { name: "ATMOS", info: "NOMINAL" },
    { name: "HOLODECK", info: "SECURED" }, 
    { name: "TOOLS", info: "SYNCED" }, 
    { name: "COMLINK", info: "OPEN" }
];

const carousel = document.getElementById('carousel');
const logBox = document.getElementById('activity-log');
const canvasCtx = document.getElementById('output-canvas').getContext('2d');
const cursor = document.getElementById('cursor');
const mainCore = document.getElementById('main-core');
const video = document.getElementById('cam');

let curr = 0; 
const radius = 300;
let lastActivation = 0;
let isPinched = false;
let canSwipe = true;
let handActive = false;
let opticsModel = null;
let lastFrameTime = Date.now();
let fps = 0;
let opticsMode = 'normal';
let nexusHistory = { cpu: new Array(30).fill(0) };
let jitterPulse = 0;
let timerInterval;
let timerSeconds = 0;
let isPaused = true;
let currentMode = 'countdown';
let alarmInterval; 


features.forEach((f, i) => {
    let c = document.createElement('div');
    c.className = 'cell';
    c.style.transform = `rotateY(${i * (360/features.length)}deg) translateZ(${radius}px)`;
    c.innerHTML = `<span>${f.name}</span>`;
    carousel.appendChild(c);
});
function addLog(msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = `[${new Date().toLocaleTimeString()}] > ${msg}`;
    logBox.prepend(entry);
    if(logBox.childNodes.length > 8) logBox.removeChild(logBox.lastChild);
}
function activate(i) {
    curr = i;
    carousel.style.transform = `translateZ(-${radius}px) rotateY(${-i * (360/features.length)}deg)`;
    
  
    document.getElementById('selection-details').innerText = `MOD_${features[i].name}::ACTIVE`;
    addLog(`INITIALIZING: ${features[i].name}_PROTOCOL`);
    
    
    if (isPinched) {
        openModuleInterface(features[i].name);
    }
    
    document.querySelectorAll('.cell').forEach((el, idx) => el.classList.toggle('active', idx === i));
}


function openModuleInterface(moduleName) {
    const overlay = document.getElementById('module-overlay');
    const title = document.getElementById('overlay-title');
    
    overlay.style.display = "flex"; 
    document.body.style.overflow = "hidden"; 
    
    addLog(`INTERFACE_LOCKED: ${moduleName}_CORTEX`);

    if(moduleName === "ATMOS") {
        getLiveWeather();}
    else if(moduleName === "OPTICS") {
        initializeOptics();}
    else if(moduleName === "NEXUS") {
        initializeNexus();}
    else if(moduleName === "COMLINK") { 
        initializeComlink();}
    else if(moduleName === "GRID") { 
        initializeGrid();}
    else if(moduleName === "TOOLS") {
        initializeTools();}
    else if(moduleName === "HOLODECK") {
        initializeHolodeck();
    }
    else {
        if(title) title.innerText = `${moduleName}_SYSTEM`;
        document.getElementById('overlay-content').innerHTML = "<p>ACCESSING ENCRYPTED DATA...</p>";
    }
}
function getLiveWeather() {
    const content = document.getElementById('overlay-content');
    const title = document.getElementById('overlay-title');
    
    if (title) title.innerText = "ATMOSPHERIC_SCAN";
    if (content) content.innerHTML = "<p class='loading'>SYNCHRONIZING WITH SAT_LINK...</p>";

    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${WEATHER_API_KEY}`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
             
                const dailyData = data.list.filter(reading => reading.dt_txt.includes("12:00:00"));
              
                renderWeatherUI(data.list[0], dailyData);
            })
            .catch(err => {
                console.error("Uplink Error:", err);
                if (content) content.innerHTML = `<p style='color:red;'>UPLINK_ERROR: ${err.message}</p>`;
            });
    }, () => {
        if (content) content.innerHTML = "<p style='color:red;'>GPS_ERROR: SIGNAL_LOST</p>";
    });
}

function renderWeatherUI(current, forecast) {
    const content = document.getElementById('overlay-content');
    if (!content) return;

    
    const temps = forecast.map(day => Math.round(day.main.temp));
    const labels = forecast.map(day => new Date(day.dt * 1000).toLocaleDateString([], {weekday: 'short'}));

   
    const forecastHTML = forecast.map(day => `
        <div class="forecast-day" style="border: 1px solid rgba(0,247,255,0.2); padding: 10px; text-align: center; flex: 1; background: rgba(0,247,255,0.03);">
            <div style="font-size: 11px; opacity: 0.7; margin-bottom:5px;">${new Date(day.dt * 1000).toLocaleDateString([], {weekday: 'short'}).toUpperCase()}</div>
            <div style="font-size: 18px; color: #fff; font-family: 'Orbitron';">${Math.round(day.main.temp)}°C</div>
            <div style="font-size: 11px; opacity: 0.5; margin-top:5px;">
                Humidity: ${day.main.humidity}% <br> 
                Wind_Velocity: ${day.wind.speed.toFixed(1)}m/s
            </div>
        </div>
    `).join('');

    content.innerHTML = `
        <div class="weather-display" style="display: flex; flex-direction: column; gap: 15px; padding: 20px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div style="font-size: 55px; font-family: 'Orbitron'; line-height: 1;">${Math.round(current.main.temp)}°C</div>
                    <div style="letter-spacing: 5px; color: #00f7ff; margin-top: 5px; font-size: 14px;">${current.weather[0].description.toUpperCase()}</div>
                </div>
                <div style="text-align: right; opacity: 0.8; font-size: 13px; font-family: 'Orbitron'; border-left: 2px solid #00f7ff; padding-left: 15px;">
                    PRESSURE: ${current.main.pressure} hPa<br>
                    HUMIDITY_LVL: ${current.main.humidity}%<br>
                    WIND_VECTORS: ${current.wind.speed} m/s
                </div>
            </div>

            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 10px;">
                ${forecastHTML}
            </div>

            <div style="margin-top: 10px; border: 1px solid rgba(0,247,255,0.1); padding: 10px; position: relative;">
                <div style="font-size: 11px; color: #00f7ff; margin-bottom: 5px; letter-spacing: 2px;">THERMAL_TREND_ANALYSIS</div>
                <canvas id="weatherGraph" width="600" height="80" style="width:100%; height:80px;"></canvas>
            </div>

            <div class="atmos-diagnostics" style="border: 1px solid #00f7ff; padding: 12px; display: flex; justify-content: space-around; font-size: 13px; background: rgba(0,247,255,0.05); font-family: 'Orbitron';">
                <span><span style="color:#00f7ff;">VISIBILITY:</span> ${(current.visibility / 1000).toFixed(1)} KM</span>
                <span style="opacity: 0.3;">|</span>
                <span><span style="color:#00f7ff;">FEELS_LIKE:</span> ${Math.round(current.main.feels_like)}°C</span>
                <span style="opacity: 0.3;">|</span>
                <span><span style="color:#00f7ff;">THERMAL_FLUX:</span> ${Math.abs(current.main.temp - current.main.feels_like).toFixed(1)} Δ</span>
            </div>
        </div>
    `;

    setTimeout(() => {
        drawWeatherGraph(temps);
    }, 100);
}
function drawWeatherGraph(data) {
    const canvas = document.getElementById('weatherGraph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#00f7ff';
    ctx.lineWidth = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const step = canvas.width / (data.length - 1);
    const max = Math.max(...data) + 5;
    const min = Math.min(...data) - 5;
    const range = max - min;

    ctx.beginPath();
    data.forEach((val, i) => {
        const x = i * step;
        const y = canvas.height - ((val - min) / range) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(x-2, y-2, 4, 4);
    });
    ctx.stroke();
}
function closeModule() {
    document.getElementById('module-overlay').style.display = "none";
    document.body.style.overflow = "auto";
    addLog("INTERFACE_DEACTIVATED");
}

async function loadOpticsModel() {
    if (!opticsModel) {
        addLog("NEURAL_ENGINE: LOADING_COCO_SSD...");
        opticsModel = await cocoSsd.load();
        addLog("NEURAL_ENGINE: MODEL_LOADED_SUCCESS");
    }
}
async function initializeOptics() {
    const content = document.getElementById('overlay-content');
    const title = document.getElementById('overlay-title');
    if (title) title.innerText = "VISUAL_OPTICS_SENSORS";

    content.innerHTML = `
        <div class="optics-container" style="display: flex; gap: 20px; height: 100%; padding: 10px; align-items: stretch;">
            <!-- VIDEO SECTION -->
            <div class="video-feed-large" style="flex: 2; border: 1px solid var(--iron-cyan); position: relative; background: #000; height: 400px;">
                <!-- Canvas is NOT flipped here; we flip the drawing logic instead to keep text readable -->
                <canvas id="optics-canvas" style="width: 100%; height: 100%;"></canvas>
                <div class="scan-line"></div>
            </div>

            <!-- SIDEBAR SECTION -->
            <div class="optics-data" style="flex: 1; display: flex; flex-direction: column; gap: 10px; font-family: 'Share Tech Mono';">
                <div style="border: 1px solid rgba(0,247,255,0.3); padding: 10px; background: rgba(0,247,255,0.05);">
                    <div style="font-size: 15px; color: #00f7ff; margin-bottom: 5px; letter-spacing: 2px;">OBJECT_RECOGNITION</div>
                    <div id="object-list" style="font-size: 16px; color: #fff; min-height: 40px;">SCANNING...</div>
                </div>

                <div style="border: 1px solid rgba(0,247,255,0.3); padding: 10px; flex-grow: 1; background: rgba(0,247,255,0.05); display: flex; flex-direction: column; gap: 5px;">
                    <div style="font-size: 15px; color: #00f7ff; margin-bottom: 5px; letter-spacing: 2px;">VISUAL_TELEMETRY</div>
                    <div id="optics-meta" style="font-size: 15px; color: #00f7ff; line-height: 1.6;">
                        FPS: <span id="optics-fps">0</span><br>
                        LUMINANCE: <span id="optics-lum">0</span>%<br>
                        OBJECT_COUNT: <span id="optics-count">0</span><br>
                        <div style="margin-top:10px; padding-top:10px; border-top: 1px solid rgba(0,247,255,0.2);">
                            RANGE_EST: <span id="optics-dist" style="color:#fff">0.0m</span><br>
                            SIGNAL_STR: <span style="color:#fff">OPTIMAL</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadOpticsModel();
    startOpticsProcessing();
}
async function startOpticsProcessing() {
    const opticsCanvas = document.getElementById('optics-canvas');
    if (!opticsCanvas) return;
    const ctx = opticsCanvas.getContext('2d');
    const video = document.getElementById('cam');
    const objList = document.getElementById('object-list');
    
    let localPredictions = [];
    let isDetecting = false;

    async function runModel() {
        if (document.getElementById('module-overlay').style.display === "none") return;
        if (!isDetecting && opticsModel) {
            isDetecting = true;
            localPredictions = await opticsModel.detect(video);
            isDetecting = false;
        }
        setTimeout(runModel, 150); 
    }
    runModel();

    function render() {
        if (document.getElementById('module-overlay').style.display === "none") return;

        const now = Date.now();
        fps = Math.round(1000 / (now - lastFrameTime));
        lastFrameTime = now;
        document.getElementById('optics-fps').innerText = fps;

        opticsCanvas.width = video.videoWidth;
        opticsCanvas.height = video.videoHeight;
        
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-opticsCanvas.width, 0);
        ctx.drawImage(video, 0, 0, opticsCanvas.width, opticsCanvas.height);
        ctx.restore(); 

        const frame = ctx.getImageData(0, 0, opticsCanvas.width, opticsCanvas.height);
        let brightness = 0;
        let samples = 0;
        for (let i = 0; i < frame.data.length; i += 400) { 
            brightness += (frame.data[i] + frame.data[i+1] + frame.data[i+2]) / 3;
            samples++;
        }
        const lumPerc = Math.round((brightness / samples) / 255 * 100); 
        document.getElementById('optics-lum').innerText = lumPerc;
        document.getElementById('optics-count').innerText = localPredictions.length;

        ctx.strokeStyle = "#00f7ff";
        ctx.lineWidth = 2;
        
        let sidebarStrings = [];
        let maxDist = 0;

        localPredictions.forEach(p => {
            const [x, y, w, h] = p.bbox;
            const flippedX = opticsCanvas.width - x - w;
            const confidence = Math.round(p.score * 100);
            
            sidebarStrings.push(`${p.class.toUpperCase()} [${confidence}%]`);

            ctx.strokeRect(flippedX, y, w, h);

            const distance = (0.6 / (w / opticsCanvas.width)).toFixed(1);
            if(parseFloat(distance) > maxDist) maxDist = distance;

            ctx.fillStyle = "#00f7ff";
            ctx.font = "14px Orbitron";
            
            ctx.fillText(`${p.class.toUpperCase()} [${confidence}%]`, flippedX, y > 20 ? y - 10 : 20);
            ctx.font = "10px 'Share Tech Mono'";
            ctx.fillText(`CONFIDENCE_STABLE`, flippedX, y + h + 15);
        });

        document.getElementById('optics-dist').innerText = maxDist > 0 ? maxDist + "m" : "0.0m";
        objList.innerHTML = sidebarStrings.length > 0 ? sidebarStrings.join("<br>") : "SCANNING...";
        
        requestAnimationFrame(render);
    }
    render();
}
async function initializeNexus() {
    const content = document.getElementById('overlay-content');
    const title = document.getElementById('overlay-title');
    if (title) title.innerText = "NEXUS_DEEP_DIAGNOSTIC";

    content.innerHTML = `
        <div class="nexus-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; padding: 20px; font-family: 'Share Tech Mono';">
            
            <!-- REAL-TIME GRAPHS -->
            <div class="nexus-panel" style="grid-column: span 2; border: 1px solid rgba(0,247,255,0.3); padding: 15px; background: rgba(0,10,20,0.8);">
                <div style="color:var(--iron-cyan); font-size:10px; margin-bottom:10px;">CORE_LOAD_DISTRIBUTION</div>
                <canvas id="nexus-main-graph" width="600" height="150" style="width:100%; height:150px;"></canvas>
            </div>

            <!-- OPTIMIZATION CIRCLE -->
            <div class="nexus-panel" style="border: 1px solid rgba(0,247,255,0.3); padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="color:var(--iron-cyan); font-size:10px;">SYSTEM_OPTIMIZATION</div>
                <div id="nexus-opt-val" style="font-size: 40px; color: #fff;">0%</div>
                <svg width="80" height="80">
                    <circle cx="40" cy="40" r="35" stroke="rgba(0,247,255,0.1)" stroke-width="5" fill="none" />
                    <circle id="opt-ring" cx="40" cy="40" r="35" stroke="#00f7ff" stroke-width="5" fill="none" 
                            stroke-dasharray="220" stroke-dashoffset="220" style="transition: stroke-dashoffset 1s;" />
                </svg>
            </div>

            <!-- DATA VISUALS: PIE CHARTS -->
            <div class="nexus-panel" style="border: 1px solid rgba(0,247,255,0.3); padding: 15px; text-align: center;">
                <div style="color:var(--iron-cyan); font-size:10px;">MEMORY_RESOURCES (GB)</div>
                <canvas id="ram-pie" width="120" height="120" style="margin-top:10px;"></canvas>
                <div id="ram-text" style="font-size:12px; margin-top:5px;">0 / 0 GB</div>
            </div>

            <div class="nexus-panel" style="border: 1px solid rgba(0,247,255,0.3); padding: 15px; text-align: center;">
                <div style="color:var(--iron-cyan); font-size:10px;">STORAGE_DENSITY (GB)</div>
                <canvas id="disk-pie" width="120" height="120" style="margin-top:10px;"></canvas>
                <div id="disk-text" style="font-size:12px; margin-top:5px;">0 GB FREE</div>
            </div>

            <!-- TECHNICAL SPECS LIST -->
            <div class="nexus-panel" style="border: 1px solid rgba(0,247,255,0.3); padding: 15px; background: rgba(0,247,255,0.05);">
                <div style="color:var(--iron-cyan); font-size:10px; margin-bottom:10px;">SYSTEM_MANIFEST</div>
                <div id="nexus-tech-specs" style="font-size: 11px; line-height: 1.6; color: #aaa;">
                    LATENCY: <span id="spec-lat" style="color:#fff;">--</span> ms<br>
                    POWER: <span id="spec-pwr" style="color:#fff;">--</span><br>
                    CPU_FREQ: <span id="spec-freq" style="color:#fff;">--</span> MHz<br>
                    PROCESS_COUNT: <span id="spec-proc" style="color:#fff;">--</span><br>
                    UPTIME_START: <span id="spec-boot" style="color:#fff;">--</span>
                </div>
            </div>
        </div>
    `;

    updateNexusData();
}
async function updateNexusData() {
    if (document.getElementById('module-overlay').style.display === "none") return;

    try {
        const res = await fetch('http://127.0.0.1:5000/api/stats');
        const d = await res.json();

       
        document.getElementById('nexus-opt-val').innerText = `${d.optimization}%`;
        const offset = 220 - (220 * d.optimization) / 100;
        document.getElementById('opt-ring').style.strokeDashoffset = offset;

        
        drawNexusPie('ram-pie', d.ram, "#00f7ff");
        drawNexusPie('disk-pie', d.disk, "#ff0055");
        document.getElementById('ram-text').innerText = `${d.ram_used} / ${d.ram_total} GB`;
        document.getElementById('disk-text').innerText = `${d.disk_free} GB AVAILABLE`;

        document.getElementById('spec-lat').innerText = d.latency;
        document.getElementById('spec-pwr').innerText = d.power_plugged ? "AC_CONNECTED" : `${d.battery}%_BATTERY`;
        document.getElementById('spec-freq').innerText = d.cpu_freq;
        document.getElementById('spec-proc').innerText = d.processes;
        document.getElementById('spec-boot').innerText = d.boot_time;

        nexusHistory.cpu.push(d.cpu); nexusHistory.cpu.shift();
        drawNexusLineGraph('nexus-main-graph', nexusHistory.cpu);

    } catch (e) {
        addLog("NEXUS_ERR: UPLINK_LOST");
    }
    setTimeout(updateNexusData, 1000);
}
function drawNexusPie(id, percent, color) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');
    const center = canvas.width / 2;
    ctx.clearRect(0,0,120,120);
    
    ctx.beginPath(); ctx.arc(center, center, 45, 0, 2*Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 10; ctx.stroke();
  
    ctx.beginPath();
    ctx.arc(center, center, 45, -Math.PI/2, (-Math.PI/2) + (2*Math.PI * percent/100));
    ctx.strokeStyle = color; ctx.stroke();
}
function drawNexusLineGraph(id, data) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00f7ff'; ctx.lineWidth = 2;
    ctx.beginPath();
    const step = canvas.width / (data.length - 1);
    data.forEach((val, i) => {
        const x = i * step;
        const y = canvas.height - (val / 100 * canvas.height);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  
    ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height);
    ctx.fillStyle = "rgba(0, 247, 255, 0.1)"; ctx.fill();
}
async function initializeComlink() {
    const content = document.getElementById('overlay-content');
    const title = document.getElementById('overlay-title');
    title.innerText = "COMLINK_EXTERNAL_UPLINK";

    content.innerHTML = `
        <div class="comlink-grid" style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; padding: 20px; height: 100%;">
            
            <!-- LEFT COLUMN: RADAR -->
            <div class="comlink-main" style="position: relative; border: 1px solid rgba(0,247,255,0.2); display: flex; flex-direction: column; background: rgba(0,5,10,0.5);">
                <div style="padding: 10px; font-size: 10px; color: var(--iron-cyan); border-bottom: 1px solid rgba(0,247,255,0.1);">SIGNAL_INTEGRITY_PULSE</div>
                <div style="flex-grow:1; display:flex; align-items:center; justify-content:center; position:relative;">
                    <canvas id="comlink-radar" width="300" height="300"></canvas>
                    <div id="jitter-val" style="position: absolute; font-family: 'Orbitron'; font-size: 14px; color: var(--iron-cyan);">0.00ms</div>
                </div>
                <div id="signal-bar" style="height:4px; width:100%; background:rgba(0,247,255,0.1);">
                    <div id="signal-fill" style="height:100%; width:0%; background: #17600a; transition: width 0.5s;"></div>
                </div>
            </div>

            <!-- RIGHT COLUMN: STATS -->
            <div class="comlink-side" style="display: flex; flex-direction: column; gap: 15px;">
                <div style="border: 1px solid rgba(0,247,255,0.3); padding: 12px; background: rgba(0,10,20,0.8);">
                    <div style="font-size: 10px; color: var(--iron-cyan); margin-bottom: 5px;">ACTIVE_NODE_TRACKING</div>
                    <div id="node-info" style="font-size: 14px; color: #fff;">SYNCING...</div>
                    <div id="ip-info" style="font-size: 10px; opacity: 0.6; color: #39FF14;">IP: 0.0.0.0</div>
                </div>

                <div style="border: 1px solid rgba(0,247,255,0.3); padding: 12px; flex-grow: 1; position: relative;">
                    <div style="font-size: 10px; color: var(--iron-cyan); margin-bottom: 5px;">PACKET_STREAM_INTEGRITY</div>
                    <!-- Increased width to prevent compressed characters -->
                    <canvas id="binary-drop" width="250" height="100" style="width:100%; height:100px;"></canvas>
                    
                    <div style="margin-top:10px; font-size:9px; font-family:monospace; line-height:1.4;">
                        <div id="bw-util">BW_UTIL: 0.0 / 0.0 KB/s</div>
                        <div id="uplink-data" style="color:rgba(0,247,255,0.5)"></div>
                    </div>

                    <div id="loss-perc" style="text-align: right; font-size: 18px; font-family: 'Orbitron'; color: var(--iron-cyan);">0% LOSS</div>
                </div>
            </div>
        </div>
    `;
    updateComlinkData();
}
async function updateComlinkData() {
    if (document.getElementById('module-overlay').style.display === "none") return;
    
    try {
        const res = await fetch('http://127.0.0.1:5000/api/network_stats');
        const d = await res.json();

        
        document.getElementById('node-info').innerText = d.node;
        document.getElementById('ip-info').innerText = `PUBLIC_IP: ${d.ip}`;
        document.getElementById('jitter-val').innerText = `${d.jitter}ms_JITTER`;
        document.getElementById('loss-perc').innerText = `${d.packet_loss}%_LOSS`;
        document.getElementById('bw-util').innerText = `UP: ${d.bandwidth.up} KB/s | DN: ${d.bandwidth.down} KB/s`;
        document.getElementById('signal-fill').style.width = d.signal + "%";
        
        const uplinkBox = document.getElementById('uplink-data');
        uplinkBox.innerHTML = d.uplinks.map(u => `<div>> ${u}</div>`).join('');

       
        drawRadialRadar('comlink-radar', d.jitter);
        drawBinaryDrop('binary-drop', d.packet_loss);

    } catch (e) { console.error("COMLINK_OFFLINE"); }

    setTimeout(updateComlinkData, 5000);
}
function drawRadialRadar(id, jitter) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');
    const center = 150;
    ctx.clearRect(0,0,300,300);

  
    ctx.strokeStyle = "rgba(0, 247, 255, 0.1)";
    ctx.beginPath(); ctx.arc(center, center, 100, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(center, center, 60, 0, Math.PI*2); ctx.stroke();

    
    ctx.beginPath();
    ctx.strokeStyle = "#db735e"; 
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff2a00";
    
    for(let i=0; i<360; i+=2) {
        let angle = i * Math.PI / 180;
        let spike = (Math.random() * jitter * 4); 
        let r = 80 + spike;
        let x = center + r * Math.cos(angle);
        let y = center + r * Math.sin(angle);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
}
function drawBinaryDrop(id, loss) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    
    ctx.font = "bold 12px monospace";
    
    for(let i=0; i<10; i++) {
        for(let j=0; j<4; j++) {
            let val = Math.round(Math.random());
            
            ctx.fillStyle = (loss > 0 && Math.random() < 0.1) ? "#ff003c" : "#39FF14";
            
           
            ctx.fillText(val, i * 25 + 5, j * 20 + 20);
        }
    }
}
async function initializeGrid() {
    const content = document.getElementById('overlay-content');
    const title = document.getElementById('overlay-title');
    if (title) title.innerText = "NETWORK_TOPOLOGY_GRID";

    content.innerHTML = `
        <div style="height: 100%; width: 100%; position: relative; 
                    background-color: #000b14;
                    background-image: 
                        linear-gradient(30deg, #000b14 12%, transparent 12.5%, transparent 87%, #000b14 87.5%, #000b14),
                        linear-gradient(150deg, #000b14 12%, transparent 12.5%, transparent 87%, #000b14 87.5%, #000b14),
                        linear-gradient(30deg, #000b14 12%, transparent 12.5%, transparent 87%, #000b14 87.5%, #000b14),
                        linear-gradient(150deg, #000b14 12%, transparent 12.5%, transparent 87%, #000b14 87.5%, #000b14),
                        linear-gradient(60deg, rgba(0,247,255,0.05) 25%, transparent 25.5%, transparent 75%, rgba(0,247,255,0.05) 75%, rgba(0,247,255,0.05)),
                        linear-gradient(60deg, rgba(0,247,255,0.05) 25%, transparent 25.5%, transparent 75%, rgba(0,247,255,0.05) 75%, rgba(0,247,255,0.05));
                    background-size: 60px 105px; /* Scaled Up Grid */
                    background-position: 0 0, 0 0, 30px 52.5px, 30px 52.5px, 0 0, 30px 52.5px;
                    overflow: hidden; border: 1px solid rgba(0, 247, 255, 0.2);">
            
            <svg id="topo-svg" width="100%" height="500" style="position: absolute; top: 0; left: 0;">
                <!-- Scaled Scanning Rings -->
                <circle cx="50%" cy="250" r="150" fill="none" stroke="rgba(0,247,255,0.18)" stroke-width="2" stroke-dasharray="10,10" />
                <circle cx="50%" cy="250" r="250" fill="none" stroke="rgba(0,247,255,0.16)" stroke-width="1.5" />
            </svg>
            
            <div id="node-layer" style="position: relative; height: 500px; width: 100%;"></div>
            
            <div id="trust-panel" style="position: absolute; bottom: 30px; right: 30px; width: 320px; 
                 border-left: 4px solid var(--iron-cyan); background: rgba(0,15,25,0.92); padding: 20px;
                 backdrop-filter: blur(8px); box-shadow: -15px 0 30px rgba(0,0,0,0.6);">
                <div style="font-size: 12px; color: var(--iron-cyan); letter-spacing: 3px; margin-bottom: 12px; font-weight: bold;">
                    GRID_REPORT
                </div>
                <div id="node-list" style="font-size: 13px; max-height: 150px; overflow-y: auto;"></div>
            </div>
        </div>
    `;
    updateTopology();
}
async function updateTopology() {
    if (document.getElementById('module-overlay').style.display === "none") return;

    try {
        const res = await fetch('http://127.0.0.1:5000/api/network_topology');
        const data = await res.json();
        
        const nodeLayer = document.getElementById('node-layer');
        const svg = document.getElementById('topo-svg');
        const list = document.getElementById('node-list');
        
        nodeLayer.innerHTML = ''; 
        const staticRings = svg.querySelectorAll('circle:not([id])');
        svg.innerHTML = '';
        staticRings.forEach(r => svg.appendChild(r));
        list.innerHTML = '';

        const centerX = nodeLayer.offsetWidth / 2;
        const centerY = 250;

        createNode(centerX, centerY, data.core.name, data.core.ip, '#00f7ff', true);

        data.nodes.forEach((node, i) => {
            if(node.ip === data.core.ip) return;
            
            const angle = (i / data.nodes.length) * Math.PI * 2;
            const radius = 230; 
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", centerX); line.setAttribute("y1", centerY);
            line.setAttribute("x2", x); line.setAttribute("y2", y);
            line.setAttribute("stroke", "rgba(0,247,255,0.25)");
            line.setAttribute("stroke-width", "1.5");
            svg.appendChild(line);

            
            const pulse = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            pulse.setAttribute("width", "6"); pulse.setAttribute("height", "6");
            pulse.setAttribute("fill", "#00f7ff");
            pulse.style.filter = "drop-shadow(0 0 5px #00f7ff)";
            pulse.innerHTML = `<animateMotion dur="${1.2 + Math.random()}s" repeatCount="indefinite" path="M ${centerX} ${centerY} L ${x} ${y}" />`;
            svg.appendChild(pulse);

            const nodeColor = node.status === "TRUSTED" ? "#00f7ff" : "#ffcc00";
            createNode(x, y, node.status, node.ip, nodeColor, false);
            
            list.innerHTML += `
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; font-family: 'Share Tech Mono';">
                    <span style="color: rgba(255,255,255,0.85);">> ${node.ip}</span>
                    <span style="color: ${nodeColor}; font-weight: bold;">[${node.status}]</span>
                </div>
            `;
        });

    } catch (e) { console.error("SIGNAL_LOSS"); }
    setTimeout(updateTopology, 5000);
}
function createNode(x, y, label, ip, color, isCore) {
    const div = document.createElement('div');
    const size = isCore ? 60 : 45; 
    div.style.cssText = `
        position: absolute; left: ${x - (size/2)}px; top: ${y - (size/2)}px;
        width: ${size}px; text-align: center; font-family: 'Share Tech Mono';
    `;
    
    
    const shape = isCore ? 
        `<svg width="50" height="50" viewBox="0 0 30 30"><rect x="5" y="5" width="20" height="20" fill="none" stroke="${color}" stroke-width="2.5"><animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite"/></rect><rect x="11" y="11" width="8" height="8" fill="${color}"/></svg>` :
        `<svg width="35" height="35" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="${color}" stroke-width="2"/></svg>`;

    div.innerHTML = `
        <div style="height: ${isCore ? '55px' : '40px'}; display: flex; justify-content: center; align-items: center;">${shape}</div>
        <div style="font-size: 13px; color: ${color}; font-weight: bold; margin-top: 8px;">
            ${isCore ? `<span style="border: 2px solid ${color}; padding: 2px 6px; background: rgba(0,247,255,0.1);">${label}</span>` : label}
        </div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px;">${ip}</div>
    `;
    document.getElementById('node-layer').appendChild(div);
}




function initializeTools() {
    const content = document.getElementById('overlay-content');
    const title = document.getElementById('overlay-title');
    title.innerText = "SYSTEM_UTILITIES";

    content.innerHTML = `
        <div id="tools-frame">
            <div id="tools-list">
                
                <div class="jarvis-btn" onclick="openTool('math')">
                    <div class="btn-scanline"></div>
                    <div class="btn-content">
                        <span class="btn-tag">MN_01</span>
                        <span class="btn-text">NUMERICAL ARCHIVE</span>
                    </div>
                </div>

                <div class="jarvis-btn" onclick="openTool('physics')">
                    <div class="btn-scanline"></div>
                    <div class="btn-content">
                        <span class="btn-tag">PH_02</span>
                        <span class="btn-text">DYNAMICS DATABASE</span>
                    </div>
                </div>

                <div class="jarvis-btn" onclick="openTool('chem')">
                    <div class="btn-scanline"></div>
                    <div class="btn-content">
                        <span class="btn-tag">CH_03</span>
                        <span class="btn-text">CHEMICAL_ELEMENT_MATRIX</span>
                    </div>
                </div>

                <div class="jarvis-btn" onclick="openTool('calc')">
                    <div class="btn-scanline"></div>
                    <div class="btn-content">
                        <span class="btn-tag">CA_04</span>
                        <span class="btn-text">A.R.I.T.H.M.O.S</span>
                    </div>
                </div>

                <div class="jarvis-btn" onclick="openTool('timer')">
                    <div class="btn-scanline"></div>
                    <div class="btn-content">
                        <span class="btn-tag">TI_05</span>
                        <span class="btn-text">PHASE COUNTER</span>
                    </div>
                </div>

            </div>
        </div>
        <div id="tool-viewport" style="display:none;"></div>
    `;
}

function openTool(type) {
    const menu = document.getElementById('tools-frame');
    const viewport = document.getElementById('tool-viewport');
    menu.style.display = "none";
    viewport.style.display = "block";

    let header = `
        <div class="jarvis-btn" onclick="initializeTools()" style="border-color:#ff003c; width: 95%; margin: 10px auto; clip-path: none; border-left: 4px solid #ff003c; padding: 15px;">
            <div class="btn-content">
                <span class="btn-tag" style="background:#ff003c; color:white;">ESC</span>
                <span class="btn-text" style="color:#ff003c;">BACK_TO_UTILITIES</span>
            </div>
        </div>`;

    let sheetContent = "";

    if(type === 'math') {
        sheetContent = `
            <div class="formula-sheet-container">
                <h3 style="color:var(--iron-cyan); font-family:Orbitron;">MATHEMATICAL_INDEX</h3>
                <img src="formula_1.jpg" class="formula-sheet-img">
                <img src="M_formula_1.jpg" class="formula-sheet-img">
                <img src="M_formula_2.jpg" class="formula-sheet-img">
                <img src="M_formula_3.jpg" class="formula-sheet-img">
                <img src="M_formula_4.jpg" class="formula-sheet-img">
                <img src="M_formula_5.jpg" class="formula-sheet-img">
                <img src="M_formula_6.jpg" class="formula-sheet-img">
                <img src="M_formula_7.jpg" class="formula-sheet-img">
                <img src="M_formula_8.jpg" class="formula-sheet-img">
                <img src="M_formula_9.jpg" class="formula-sheet-img">
                <img src="M_formula_10.jpg" class="formula-sheet-img">
            </div>
        `;
    } 
    else if(type === 'physics') {
        sheetContent = `
            <div class="formula-sheet-container">
                <h3 style="color:var(--iron-cyan); font-family:Orbitron;">FORMULA_REPOSITORY</h3>
                <img src="P_formula_1.jpg" class="formula-sheet-img">
                <img src="P_formula_2.jpg" class="formula-sheet-img">
                <img src="P_formula_3.jpg" class="formula-sheet-img">
                <img src="P_formula_4.jpg" class="formula-sheet-img">
                <img src="P_formula_5.jpg" class="formula-sheet-img">
                <img src="P_formula_6.jpg" class="formula-sheet-img">
                <img src="P_formula_7.jpg" class="formula-sheet-img">
                <img src="P_formula_8.jpg" class="formula-sheet-img">
            </div>
        `;
    }
    else if(type === 'chem') {
        sheetContent = `
            <div class="formula-sheet-container" style="width: 100%; overflow-x: auto;">
                <h3 style="color:var(--iron-cyan); font-family:Orbitron; text-align:center;">MATERIAL_INTELLIGENCE</h3>
                ${renderPeriodicTable()} 
            </div>
        `;
    }
    else if(type === 'timer') {
       
        sheetContent = `
            <div class="formula-sheet-container">
                <h3 style="color:var(--iron-cyan); font-family:Orbitron; text-align:center; margin-bottom:20px;">COUNTDOWN SEQUENCE ACTIVE</h3>
                <div id="chrono-anchor"></div>
            </div>
        `;
        
       
        setTimeout(() => {
            const anchor = document.getElementById('chrono-anchor');
            if(anchor) {
                renderTimer(anchor);
                
                
                const input = document.getElementById('timer-input');
                if(input) {
                    input.focus();
                    console.log("CHRONO_UPLINK: Keyboard focus established.");
                }
            }
        }, 100);
    }
    else if(type === 'calc') {
        sheetContent = `
            <div class="formula-sheet-container">
                <h3 style="color:var(--iron-cyan); font-family:Orbitron; text-align:center; margin-bottom:20px;">COMPUTATION INTERFACE</h3>
                <div id="calc-anchor"></div>
            </div>
        `;
        
        setTimeout(() => {
            const anchor = document.getElementById('calc-anchor');
            if(anchor) {
                renderCalculator(anchor);
                const input = document.getElementById('calc-input');
                if(input) input.focus(); 
            }
        }, 100);
    }

    viewport.innerHTML = header + sheetContent;
}
function renderPeriodicTable() {
const elements = [
    // ROW 1
    { num: 1, sym: "H", name: "Hydrogen", weight: "1.008", type: "reactive-nonmetal", pos: [1, 1] },
    { num: 2, sym: "He", name: "Helium", weight: "4.002", type: "noble-gas", pos: [1, 18] },
    // ROW 2
    { num: 3, sym: "Li", name: "Lithium", weight: "6.941", type: "alkali-metal", pos: [2, 1] },
    { num: 4, sym: "Be", name: "Beryllium", weight: "9.012", type: "alkaline-earth", pos: [2, 2] },
    { num: 5, sym: "B", name: "Boron", weight: "10.81", type: "metalloid", pos: [2, 13] },
    { num: 6, sym: "C", name: "Carbon", weight: "12.01", type: "reactive-nonmetal", pos: [2, 14] },
    { num: 7, sym: "N", name: "Nitrogen", weight: "14.01", type: "reactive-nonmetal", pos: [2, 15] },
    { num: 8, sym: "O", name: "Oxygen", weight: "16.00", type: "reactive-nonmetal", pos: [2, 16] },
    { num: 9, sym: "F", name: "Fluorine", weight: "19.00", type: "reactive-nonmetal", pos: [2, 17] },
    { num: 10, sym: "Ne", name: "Neon", weight: "20.18", type: "noble-gas", pos: [2, 18] },
    // ROW 3
    { num: 11, sym: "Na", name: "Sodium", weight: "22.99", type: "alkali-metal", pos: [3, 1] },
    { num: 12, sym: "Mg", name: "Magnesium", weight: "24.31", type: "alkaline-earth", pos: [3, 2] },
    { num: 13, sym: "Al", name: "Aluminum", weight: "26.98", type: "post-transition", pos: [3, 13] },
    { num: 14, sym: "Si", name: "Silicon", weight: "28.09", type: "metalloid", pos: [3, 14] },
    { num: 15, sym: "P", name: "Phosphorus", weight: "30.97", type: "reactive-nonmetal", pos: [3, 15] },
    { num: 16, sym: "S", name: "Sulfur", weight: "32.06", type: "reactive-nonmetal", pos: [3, 16] },
    { num: 17, sym: "Cl", name: "Chlorine", weight: "35.45", type: "reactive-nonmetal", pos: [3, 17] },
    { num: 18, sym: "Ar", name: "Argon", weight: "39.95", type: "noble-gas", pos: [3, 18] },
    // ROW 4
    { num: 19, sym: "K", name: "Potassium", weight: "39.10", type: "alkali-metal", pos: [4, 1] },
    { num: 20, sym: "Ca", name: "Calcium", weight: "40.08", type: "alkaline-earth", pos: [4, 2] },
    { num: 21, sym: "Sc", name: "Scandium", weight: "44.96", type: "transition-metal", pos: [4, 3] },
    { num: 22, sym: "Ti", name: "Titanium", weight: "47.87", type: "transition-metal", pos: [4, 4] },
    { num: 23, sym: "V", name: "Vanadium", weight: "50.94", type: "transition-metal", pos: [4, 5] },
    { num: 24, sym: "Cr", name: "Chromium", weight: "52.00", type: "transition-metal", pos: [4, 6] },
    { num: 25, sym: "Mn", name: "Manganese", weight: "54.94", type: "transition-metal", pos: [4, 7] },
    { num: 26, sym: "Fe", name: "Iron", weight: "55.85", type: "transition-metal", pos: [4, 8] },
    { num: 27, sym: "Co", name: "Cobalt", weight: "58.93", type: "transition-metal", pos: [4, 9] },
    { num: 28, sym: "Ni", name: "Nickel", weight: "58.69", type: "transition-metal", pos: [4, 10] },
    { num: 29, sym: "Cu", name: "Copper", weight: "63.55", type: "transition-metal", pos: [4, 11] },
    { num: 30, sym: "Zn", name: "Zinc", weight: "65.38", type: "transition-metal", pos: [4, 12] },
    { num: 31, sym: "Ga", name: "Gallium", weight: "69.72", type: "post-transition", pos: [4, 13] },
    { num: 32, sym: "Ge", name: "Germanium", weight: "72.63", type: "metalloid", pos: [4, 14] },
    { num: 33, sym: "As", name: "Arsenic", weight: "74.92", type: "metalloid", pos: [4, 15] },
    { num: 34, sym: "Se", name: "Selenium", weight: "78.97", type: "reactive-nonmetal", pos: [4, 16] },
    { num: 35, sym: "Br", name: "Bromine", weight: "79.90", type: "reactive-nonmetal", pos: [4, 17] },
    { num: 36, sym: "Kr", name: "Krypton", weight: "83.80", type: "noble-gas", pos: [4, 18] },
    // ROW 5
    { num: 37, sym: "Rb", name: "Rubidium", weight: "85.47", type: "alkali-metal", pos: [5, 1] },
    { num: 38, sym: "Sr", name: "Strontium", weight: "87.62", type: "alkaline-earth", pos: [5, 2] },
    { num: 39, sym: "Y", name: "Yttrium", weight: "88.91", type: "transition-metal", pos: [5, 3] },
    { num: 40, sym: "Zr", name: "Zirconium", weight: "91.22", type: "transition-metal", pos: [5, 4] },
    { num: 41, sym: "Nb", name: "Niobium", weight: "92.91", type: "transition-metal", pos: [5, 5] },
    { num: 42, sym: "Mo", name: "Molybdenum", weight: "95.95", type: "transition-metal", pos: [5, 6] },
    { num: 43, sym: "Tc", name: "Technetium", weight: "98", type: "transition-metal radioactive", pos: [5, 7] },
    { num: 44, sym: "Ru", name: "Ruthenium", weight: "101.1", type: "transition-metal", pos: [5, 8] },
    { num: 45, sym: "Rh", name: "Rhodium", weight: "102.9", type: "transition-metal", pos: [5, 9] },
    { num: 46, sym: "Pd", name: "Palladium", weight: "106.4", type: "transition-metal", pos: [5, 10] },
    { num: 47, sym: "Ag", name: "Silver", weight: "107.9", type: "transition-metal", pos: [5, 11] },
    { num: 48, sym: "Cd", name: "Cadmium", weight: "112.4", type: "transition-metal", pos: [5, 12] },
    { num: 49, sym: "In", name: "Indium", weight: "114.8", type: "post-transition", pos: [5, 13] },
    { num: 50, sym: "Sn", name: "Tin", weight: "118.7", type: "post-transition", pos: [5, 14] },
    { num: 51, sym: "Sb", name: "Antimony", weight: "121.8", type: "metalloid", pos: [5, 15] },
    { num: 52, sym: "Te", name: "Tellurium", weight: "127.6", type: "metalloid", pos: [5, 16] },
    { num: 53, sym: "I", name: "Iodine", weight: "126.9", type: "reactive-nonmetal", pos: [5, 17] },
    { num: 54, sym: "Xe", name: "Xenon", weight: "131.3", type: "noble-gas", pos: [5, 18] },
    // ROW 6
    { num: 55, sym: "Cs", name: "Cesium", weight: "132.9", type: "alkali-metal", pos: [6, 1] },
    { num: 56, sym: "Ba", name: "Barium", weight: "137.3", type: "alkaline-earth", pos: [6, 2] },
    { num: 57, sym: "La", name: "Lanthanum", weight: "138.9", type: "lanthanide", pos: [9, 4] },
    { num: 58, sym: "Ce", name: "Cerium", weight: "140.1", type: "lanthanide", pos: [9, 5] },
    { num: 59, sym: "Pr", name: "Praseodymium", weight: "140.9", type: "lanthanide", pos: [9, 6] },
    { num: 60, sym: "Nd", name: "Neodymium", weight: "144.2", type: "lanthanide", pos: [9, 7] },
    { num: 61, sym: "Pm", name: "Promethium", weight: "145", type: "lanthanide radioactive", pos: [9, 8] },
    { num: 62, sym: "Sm", name: "Samarium", weight: "150.4", type: "lanthanide", pos: [9, 9] },
    { num: 63, sym: "Eu", name: "Europium", weight: "152.0", type: "lanthanide", pos: [9, 10] },
    { num: 64, sym: "Gd", name: "Gadolinium", weight: "157.3", type: "lanthanide", pos: [9, 11] },
    { num: 65, sym: "Tb", name: "Terbium", weight: "158.9", type: "lanthanide", pos: [9, 12] },
    { num: 66, sym: "Dy", name: "Dysprosium", weight: "162.5", type: "lanthanide", pos: [9, 13] },
    { num: 67, sym: "Ho", name: "Holmium", weight: "164.9", type: "lanthanide", pos: [9, 14] },
    { num: 68, sym: "Er", name: "Erbium", weight: "167.3", type: "lanthanide", pos: [9, 15] },
    { num: 69, sym: "Tm", name: "Thulium", weight: "168.9", type: "lanthanide", pos: [9, 16] },
    { num: 70, sym: "Yb", name: "Ytterbium", weight: "173.1", type: "lanthanide", pos: [9, 17] },
    { num: 71, sym: "Lu", name: "Lutetium", weight: "175.0", type: "lanthanide", pos: [9, 18] },
    { num: 72, sym: "Hf", name: "Hafnium", weight: "178.5", type: "transition-metal", pos: [6, 4] },
    { num: 73, sym: "Ta", name: "Tantalum", weight: "180.9", type: "transition-metal", pos: [6, 5] },
    { num: 74, sym: "W", name: "Tungsten", weight: "183.8", type: "transition-metal", pos: [6, 6] },
    { num: 75, sym: "Re", name: "Rhenium", weight: "186.2", type: "transition-metal", pos: [6, 7] },
    { num: 76, sym: "Os", name: "Osmium", weight: "190.2", type: "transition-metal", pos: [6, 8] },
    { num: 77, sym: "Ir", name: "Iridium", weight: "192.2", type: "transition-metal", pos: [6, 9] },
    { num: 78, sym: "Pt", name: "Platinum", weight: "195.1", type: "transition-metal", pos: [6, 10] },
    { num: 79, sym: "Au", name: "Gold", weight: "197.0", type: "transition-metal", pos: [6, 11] },
    { num: 80, sym: "Hg", name: "Mercury", weight: "200.6", type: "transition-metal", pos: [6, 12] },
    { num: 81, sym: "Tl", name: "Thallium", weight: "204.4", type: "post-transition", pos: [6, 13] },
    { num: 82, sym: "Pb", name: "Lead", weight: "207.2", type: "post-transition", pos: [6, 14] },
    { num: 83, sym: "Bi", name: "Bismuth", weight: "209.0", type: "post-transition", pos: [6, 15] },
    { num: 84, sym: "Po", name: "Polonium", weight: "209", type: "post-transition radioactive", pos: [6, 16] },
    { num: 85, sym: "At", name: "Astatine", weight: "210", type: "metalloid radioactive", pos: [6, 17] },
    { num: 86, sym: "Rn", name: "Radon", weight: "222", type: "noble-gas radioactive", pos: [6, 18] },
    // ROW 7
    { num: 87, sym: "Fr", name: "Francium", weight: "223", type: "alkali-metal radioactive", pos: [7, 1] },
    { num: 88, sym: "Ra", name: "Radium", weight: "226", type: "alkaline-earth radioactive", pos: [7, 2] },
    { num: 89, sym: "Ac", name: "Actinium", weight: "227", type: "actinide radioactive", pos: [10, 4] },
    { num: 90, sym: "Th", name: "Thorium", weight: "232.0", type: "actinide radioactive", pos: [10, 5] },
    { num: 91, sym: "Pa", name: "Protactinium", weight: "231.0", type: "actinide radioactive", pos: [10, 6] },
    { num: 92, sym: "U", name: "Uranium", weight: "238.0", type: "actinide radioactive", pos: [10, 7] },
    { num: 93, sym: "Np", name: "Neptunium", weight: "237", type: "actinide radioactive", pos: [10, 8] },
    { num: 94, sym: "Pu", name: "Plutonium", weight: "244", type: "actinide radioactive", pos: [10, 9] },
    { num: 95, sym: "Am", name: "Americium", weight: "243", type: "actinide radioactive", pos: [10, 10] },
    { num: 96, sym: "Cm", name: "Curium", weight: "247", type: "actinide radioactive", pos: [10, 11] },
    { num: 97, sym: "Bk", name: "Berkelium", weight: "247", type: "actinide radioactive", pos: [10, 12] },
    { num: 98, sym: "Cf", name: "Californium", weight: "251", type: "actinide radioactive", pos: [10, 13] },
    { num: 99, sym: "Es", name: "Einsteinium", weight: "252", type: "actinide radioactive", pos: [10, 14] },
    { num: 100, sym: "Fm", name: "Fermium", weight: "257", type: "actinide radioactive", pos: [10, 15] },
    { num: 101, sym: "Md", name: "Mendelevium", weight: "258", type: "actinide radioactive", pos: [10, 16] },
    { num: 102, sym: "No", name: "Nobelium", weight: "259", type: "actinide radioactive", pos: [10, 17] },
    { num: 103, sym: "Lr", name: "Lawrencium", weight: "262", type: "actinide radioactive", pos: [10, 18] },
    { num: 104, sym: "Rf", name: "Rutherfordium", weight: "267", type: "transition-metal radioactive", pos: [7, 4] },
    { num: 105, sym: "Db", name: "Dubnium", weight: "268", type: "transition-metal radioactive", pos: [7, 5] },
    { num: 106, sym: "Sg", name: "Seaborgium", weight: "269", type: "transition-metal radioactive", pos: [7, 6] },
    { num: 107, sym: "Bh", name: "Bohrium", weight: "270", type: "transition-metal radioactive", pos: [7, 7] },
    { num: 108, sym: "Hs", name: "Hassium", weight: "277", type: "transition-metal radioactive", pos: [7, 8] },
    { num: 109, sym: "Mt", name: "Meitnerium", weight: "278", type: "unknown radioactive", pos: [7, 9] },
    { num: 110, sym: "Ds", name: "Darmstadtium", weight: "281", type: "unknown radioactive", pos: [7, 10] },
    { num: 111, sym: "Rg", name: "Roentgenium", weight: "282", type: "unknown radioactive", pos: [7, 11] },
    { num: 112, sym: "Cn", name: "Copernicium", weight: "285", type: "transition-metal radioactive", pos: [7, 12] },
    { num: 113, sym: "Nh", name: "Nihonium", weight: "286", type: "unknown radioactive", pos: [7, 13] },
    { num: 114, sym: "Fl", name: "Flerovium", weight: "289", type: "unknown radioactive", pos: [7, 14] },
    { num: 115, sym: "Mc", name: "Moscovium", weight: "290", type: "unknown radioactive", pos: [7, 15] },
    { num: 116, sym: "Lv", name: "Livermorium", weight: "293", type: "unknown radioactive", pos: [7, 16] },
    { num: 117, sym: "Ts", name: "Tennessine", weight: "294", type: "unknown radioactive", pos: [7, 17] },
    { num: 118, sym: "Og", name: "Oganesson", weight: "294", type: "noble-gas radioactive", pos: [7, 18] }
];

let gridHtml = "";
    let tableRows = "";

    elements.forEach((el) => {
        const isRad = el.type.includes('radioactive');
        
        gridHtml += `
            <div class="element ${el.type}" style="grid-area: ${el.pos[0]} / ${el.pos[1]};">
                <span style="position:absolute; top:1px; left:2px; font-size:7px; color:#00f7ff;">${el.num}</span>
                <span style="font-size:14px; font-family:Orbitron; color:#fff; z-index:2;">${el.sym}</span>
                <span style="font-size:6px; color:rgba(255,255,255,0.5); z-index:2;">${el.weight}</span>
                ${isRad ? '<div class="rad-glow"></div>' : ''}
            </div>
        `;

        tableRows += `
            <tr>
                <td>${el.num}</td>
                <td style="color:#00f7ff; font-weight:bold;">${el.sym}</td>
                <td>${el.name}</td>
                <td>${el.weight}</td>
                <td style="font-size:9px;">${el.type.replace(/-/g, ' ').toUpperCase()}</td>
            </tr>
        `;
    });

    return `
        <div class="chem-interface">
            <!-- FULL OFFICIAL LEGEND -->
            <div class="ptable-legend" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:8px; padding:15px; background:rgba(0,0,0,0.6); border:1px solid rgba(0,247,255,0.2); margin-bottom:15px;">
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(238,59,59,0.4); border:1px solid #ff4d4d;"></div>ALKALI METALS</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(255,165,0,0.4); border:1px solid #ffa500;"></div>ALKALINE EARTH</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(68,68,136,0.5); border:1px solid #7b7bff;"></div>TRANSITION</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(46,139,87,0.5); border:1px solid #3cb371;"></div>POST-TRANSITION</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(0,128,128,0.5); border:1px solid #00ced1;"></div>METALLOIDS</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(50,205,50,0.4); border:1px solid #32cd32;"></div>REACTIVE NONMETALS</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(138,43,226,0.5); border:1px solid #9370db;"></div>NOBLE GASES</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(30,144,255,0.4); border:1px solid #1e90ff;"></div>LANTHANIDES</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#fff;"><div style="width:12px; height:12px; background:rgba(210,105,30,0.4); border:1px solid #cd853f;"></div>ACTINIDES</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:9px; color:#ff003c; font-weight:bold;"><div style="width:12px; height:12px; border:2px solid #ff003c; box-shadow: 0 0 8px #ff003c;"></div>RADIOACTIVE</div>
            </div>

            <div class="periodic-grid-mini">
                ${gridHtml}
            </div>

            <div style="margin-top:40px; font-family:Orbitron; color:#00f7ff; border-bottom:1px solid #00f7ff; padding-bottom:5px; letter-spacing:2px; font-size:12px;">
                ELEMENTAL_INDEX
            </div>
            
            <table class="master-data-table">
                <thead>
                    <tr><th>#</th><th>SYM</th><th>NAME</th><th>WEIGHT</th><th>CATEGORY</th></tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}
function renderTimer(container) {
    container.innerHTML = `
        <div class="timer-interface">
            <div class="timer-modes">
                <!-- Switched to <button> to match Initiate/Snooze logic for hand tracking -->
                <button class="mode-btn active" onclick="setTimerMode('countdown', this)">COUNTDOWN</button>
                <button class="mode-btn" onclick="setTimerMode('stopwatch', this)">STOPWATCH</button>
                <button class="mode-btn" onclick="setTimerMode('pomodoro', this)">POMODORO</button>
            </div>

            <div class="timer-viewport">
                <div id="timer-display">00:00:00</div>
                <div id="mode-label">SYSTEM_READY</div>
            </div>

            <div id="timer-setup" class="timer-controls">
                <!-- Single text input for HH:MM:SS keyboard entry -->
                <input type="text" id="timer-input" placeholder="00:00:00" maxlength="8" onkeyup="formatTimeInput(this)">
            </div>

            <div class="timer-actions">
                <button class="t-btn start" onclick="handleTimerStart()">INITIATE</button>
                <button class="t-btn pause" onclick="handleTimerPause()">PAUSE</button>
                <button class="t-btn reset" onclick="handleTimerReset()">RESET</button>
            </div>
            
            <button id="snooze-btn" class="snooze-btn" onclick="stopAlarm()" style="visibility: hidden;">SNOOZE_ALARM</button>
        </div>
    `;
    handleTimerReset();
}
function formatTimeInput(input) {
    let val = input.value.replace(/\D/g, ''); 
    if (val.length > 6) val = val.slice(0, 6);
    
    let formatted = "";
    if (val.length > 0) {
        if (val.length <= 2) formatted = val;
        else if (val.length <= 4) formatted = val.slice(0, 2) + ":" + val.slice(2);
        else formatted = val.slice(0, 2) + ":" + val.slice(2, 4) + ":" + val.slice(4);
    }
    input.value = formatted;
}
function setTimerMode(mode, btn) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const inputArea = document.getElementById('timer-setup');
    if(inputArea) inputArea.style.display = (mode === 'countdown') ? 'block' : 'none';
    
    handleTimerReset();
    const inputEl = document.getElementById('timer-input');
    if(inputEl) {
        inputEl.focus();
    }
}
function handleTimerStart() {
    if (!isPaused) return;
    stopAlarm();

    if (currentMode === 'countdown' && timerSeconds === 0) {
        const inputEl = document.getElementById('timer-input');
        const val = inputEl.value; 
        const parts = val.split(':').map(p => parseInt(p) || 0);
        
        let h = 0, m = 0, s = 0;
        if (parts.length === 3) [h, m, s] = parts;
        else if (parts.length === 2) [m, s] = parts;
        else if (parts.length === 1) [s] = parts;

        timerSeconds = (h * 3600) + (m * 60) + s;

        
        inputEl.value = ""; 
    } else if (currentMode === 'pomodoro' && timerSeconds === 0) {
        timerSeconds = 25 * 60;
    }

    if (timerSeconds <= 0 && currentMode !== 'stopwatch') return;

    isPaused = false;
    timerInterval = setInterval(() => {
        if (currentMode === 'stopwatch') {
            timerSeconds++;
        } else {
            timerSeconds--;
            if (timerSeconds <= 0) {
                startSciFiAlarmSequence();
                handleTimerReset();
            }
        }
        updateDisplay();
    }, 1000);
}
function startSciFiAlarmSequence() {
    const snoozeBtn = document.getElementById('snooze-btn');
    if(snoozeBtn) snoozeBtn.style.visibility = "visible";
    
    
    triggerSciFiAlarm();
    
    let count = 0;
    alarmInterval = setInterval(() => {
        triggerSciFiAlarm();
        count++;
        if (count >= 15) stopAlarm(); 
    }, 2000);
}
function stopAlarm() {
    clearInterval(alarmInterval);
    const snoozeBtn = document.getElementById('snooze-btn');
    if(snoozeBtn) snoozeBtn.style.visibility = "hidden";

    
    const inputEl = document.getElementById('timer-input');
    if(inputEl) {
        inputEl.focus();
    }
}
function triggerSciFiAlarm() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 1.2);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
}
function updateDisplay() {
    const display = document.getElementById('timer-display');
    if(!display) return;
    
    const absSecs = Math.abs(timerSeconds);
    const h = Math.floor(absSecs / 3600).toString().padStart(2, '0');
    const m = Math.floor((absSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (absSecs % 60).toString().padStart(2, '0');
    
    display.innerText = `${h}:${m}:${s}`;
}
function handleTimerPause() {
    isPaused = true;
    clearInterval(timerInterval);
}
function handleTimerReset() {
    handleTimerPause();
    timerSeconds = 0;
    updateDisplay();
}

function renderCalculator(container) {
    container.innerHTML = `
        <div class="calc-interface">
            <div class="calc-viewport">
                <div id="calc-history" style="height: 120px; overflow-y: auto; font-size: 12px; opacity: 0.6; margin-bottom: 10px; border-bottom: 1px solid rgba(0,247,255,0.2);">
                    <div style="color: #aaa;">READY_FOR_EQUATIONS...</div>
                </div>
                <div id="calc-result" style="font-size: 28px; color: #fff; font-family: 'Orbitron'; margin-bottom: 10px;">0.00</div>
            </div>
            
            <div class="calc-input-area">
                <textarea id="calc-input" placeholder="ENTER EQUATIONS (ONE PER LINE)" 
                    style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid var(--iron-cyan); color: #fff; font-family: 'Share Tech Mono'; padding: 10px; resize: none; height: 80px;"
                    onkeyup="handleCalcKey(event)"></textarea>
                <div style="font-size: 10px; margin-top: 5px; opacity: 0.5;">[ENTER] TO SOLVE</div>
            </div>

            <div class="calc-actions" style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="t-btn start" onclick="solveEquation()">SOLVE_LOGIC</button>
                <button class="t-btn reset" onclick="clearCalc()">PURGE_CACHE</button>
                <button class="t-btn info" onclick="showCalcHelp()" style="border-color: #00ffd9a6; color: #00f7ffa6;">HELP</button>
            </div>
        </div>
    `;
}
function showCalcHelp() {
    const history = document.getElementById('calc-history');
    if (!history) return;
    
    const docs = [
        "--- SYSTEM_SYNTAX_MANUAL ---",
        "MATH: Standard operators (+, -, *, /)",
        "POWERS: Use ** (e.g., x**2)",
        "ALGEBRA: x + y = 10; x - y = 2",
        "CHEMISTRY: H2 + O2 -> H2O",
        "PHYSICS [Keyword + Space + Numbers]:",
        "> force [m] [a]",
        "> gravity [m]",
        "> energy [m] [v]",
        "> photon [freq] (e.g. 5e14)",
        "> ideal_gas [n] [t] [v]",
        "----------------------------"
    ];

    history.innerHTML = ""; 
    docs.forEach(line => {
        const div = document.createElement('div');
        div.style.fontSize = "10px";
        div.style.color = "#00f7ff";
        div.style.marginBottom = "2px";
        div.innerText = line;
        history.appendChild(div);
    });
}
function handleCalcKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        solveEquation();
    }
}

// 
async function solveEquation() {
    const inputField = document.getElementById('calc-input');
    const resultDisplay = document.getElementById('calc-result');
    const history = document.getElementById('calc-history');
    
    if (!inputField || !resultDisplay) return; 

    const rawInput = inputField.value.trim();
    if (!rawInput) return;

   
    resultDisplay.innerText = "PROCESSING_LOGIC...";
    resultDisplay.style.color = "var(--iron-cyan)";

    try {
        const response = await fetch('http://127.0.0.1:5000/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: rawInput })
        });

        const data = await response.json();

        if (data.success) {
            resultDisplay.innerText = data.result;
            resultDisplay.style.color = "#00f7ff";
            
            //internal history
            if (history) {
                const entry = document.createElement('div');
                entry.style.padding = "5px 0";
                entry.style.borderBottom = "1px solid rgba(0,247,255,0.1)";
                entry.innerHTML = `<span style="color:var(--iron-cyan)">></span> ${rawInput} <br> <span style="color:#fff">RESULT: ${data.result}</span>`;
                history.prepend(entry);
            }
            inputField.value = ""; 
        } else {
            throw new Error(data.error);
        }
        
    } catch (err) {
        resultDisplay.innerText = "SYNTAX_ERR";
        resultDisplay.style.color = "#ff003c";
        console.error("LOGIC_FAULT:", err.message);
    }
}

function clearCalc() {
    document.getElementById('calc-input').value = "";
    document.getElementById('calc-result').innerText = "0.00";
    document.getElementById('calc-history').innerHTML = "";
}


//Holodeck
async function initializeHolodeck() {
    const content = document.getElementById('overlay-content');
    const title = document.getElementById('overlay-title');
    if (title) title.innerText = "SMART_HOLODECK";

content.innerHTML = `
    <style>
        #holodeck-sidebar::-webkit-scrollbar { width: 4px; }
        #holodeck-sidebar::-webkit-scrollbar-track { background: rgba(0, 247, 255, 0.05); }
        #holodeck-sidebar::-webkit-scrollbar-thumb { 
            background: #00f7ff; 
            border-radius: 10px; 
            box-shadow: 0 0 10px #00f7ff;
        }
    </style>
    <div class="holodeck-container" style="display: flex; gap: 20px; height: 100%; padding: 10px; overflow: hidden;">
        
        <div id="holodeck-sidebar" class="scrollable-panel" 
             style="width: 170px; height: 450px; border-right: 1px solid rgba(0,247,255,0.2); 
                    display: flex; flex-direction: column; gap: 10px; padding-right: 10px; 
                    overflow-y: auto; scroll-behavior: smooth;">
            
        
            <div class="jarvis-btn" onclick="Holodeck.loadObject('C')"><div class="btn-text" style="font-size: 10px;">ATOMS</div></div>
            <div class="jarvis-btn" onclick="Holodeck.loadObject('MOLECULE')"><div class="btn-text" style="font-size: 10px;">MOLECULE</div></div>
            <div class="jarvis-btn" onclick="Holodeck.loadObject('DNA')"><div class="btn-text" style="font-size: 10px;">DNA_HELIX</div></div>
            <div class="jarvis-btn" onclick="Holodeck.loadObject('MOBIUS')"><div class="btn-text" style="font-size: 10px;">TIME_VORTEX</div></div>
            <div class="jarvis-btn" onclick="Holodeck.loadObject('TESSERACT')"><div class="btn-text" style="font-size: 10px;">HYPERCUBE_4D</div></div>
            <div class="jarvis-btn" onclick="Holodeck.loadObject('SYNAPSE')"><div class="btn-text" style="font-size: 10px;">NEURAL_SYNAPSE</div></div>

            ${Object.keys(PLANET_DATA).map(p => `
                <div class="jarvis-btn" onclick="Holodeck.loadObject('${p}')">
                    <div class="btn-text" style="font-size: 10px;">${p}</div>
                </div>
            `).join('')}
            
            <div class="jarvis-btn" onclick="Holodeck.loadObject('SINGULARITY')"><div class="btn-text" style="font-size: 10px;">BLACK_HOLE</div></div>

        </div>

        <div id="holodeck-render-zone" style="flex: 1; position: relative; border: 1px solid rgba(0,247,255,0.3); background: #000;">
            <div id="hud-overlay" style="position: absolute; top: 15px; left: 15px; z-index: 100; pointer-events: none;">
                <input type="text" id="el-input" placeholder="SEARCH..." 
                    onkeypress="if(event.key === 'Enter') Holodeck.loadObject(this.value)" 
                    style="background: rgba(0,0,0,0.8); border: 1px solid #00f7ff; color: #00f7ff; font-family: 'Share Tech Mono'; padding: 5px; width: 120px; outline: none; pointer-events: auto; display: none;">
                <div id="el-data" style="margin-top: 8px; font-family: 'Share Tech Mono'; color: #00f7ff; font-size: 11px;"></div>
            </div>
            <div id="three-container" style="width: 100%; height: 100%;"></div>
        </div>
    </div>
`;

    Holodeck.active = true;
    setTimeout(() => {
        Holodeck.init('three-container');
        Holodeck.loadObject('C'); 
        const input = document.getElementById('el-input');
        if(input) input.focus();
    }, 100);
}
function closeModule() {
    document.getElementById('module-overlay').style.display = "none";
    document.body.style.overflow = "auto";
    
    
    if (typeof Holodeck !== 'undefined') {
        Holodeck.active = false;
       
        if(Holodeck.renderer) {
            Holodeck.renderer.dispose();
            Holodeck.renderer = null;
        }
    }
    
    addLog("SYSTEM: INTERFACE_RELEASED");
}


setInterval(() => {
    const d = new Date();
    document.getElementById('clock').innerText = d.toLocaleTimeString('en-GB');
    document.getElementById('date').innerText = d.toDateString().toUpperCase();
    
    for(let i=1; i<=3; i++) {
        document.getElementById(`bar${i}`).style.width = Math.random() * 100 + "%";
    }
}, 1000);

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
});

hands.setOptions({ 
    maxNumHands: 1, 
    modelComplexity: 1, 
    minDetectionConfidence: 0.7, 
    minTrackingConfidence: 0.7 
});

hands.onResults(results => {

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, 640, 480);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        if (typeof Holodeck !== 'undefined' && Holodeck.active) {
            Holodeck.processHandData(landmarks);
        }

        if(!handActive) { 
            addLog("NEURAL_LINK: ESTABLISHED"); 
            handActive = true; 
            mainCore.style.transform = "translate(-50%, -50%) scale(1.15)"; 
        }
        
       
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00f7ff', lineWidth: 2});
        drawLandmarks(canvasCtx, landmarks, {color: '#ffffff', lineWidth: 1, radius: 2});

        const x = landmarks[8].x; 
        const y = landmarks[8].y;
        const sX = (1 - x) * window.innerWidth;
        const sY = y * window.innerHeight;
        
        
        const frameArea = document.getElementById('tools-frame');
        const viewArea = document.getElementById('tool-viewport');
        
        
        let activeScrollArea = null;
        if (viewArea && viewArea.style.display === 'block') {
            activeScrollArea = viewArea;
        } else if (frameArea && frameArea.style.display !== 'none') {
            activeScrollArea = frameArea;
        }

        if (activeScrollArea) {
            
            const scrollTrigger = 0.2;
            const scrollSpeed = 12;
    
            if (y < scrollTrigger) {
                activeScrollArea.scrollTop -= scrollSpeed;
            } else if (y > (1 - scrollTrigger)) {
                activeScrollArea.scrollTop += scrollSpeed;
            }
    
            // 
            const thumb = document.getElementById('scroll-thumb');
            if(thumb) {
                const scrollPercent = (activeScrollArea.scrollTop / (activeScrollArea.scrollHeight - activeScrollArea.clientHeight)) * 100;
                thumb.style.top = scrollPercent + "%";
            }
        }

        cursor.style.left = sX + 'px'; 
        cursor.style.top = sY + 'px';

        
        const virtualHit = document.elementFromPoint(sX, sY);
        const exitBtn = document.querySelector('.exit-btn');

        if (exitBtn) {
            if (virtualHit && virtualHit.closest('.exit-btn')) {
                exitBtn.classList.add('exit-hover'); 
                cursor.style.backgroundColor = "rgba(255, 0, 60, 0.5)";
                cursor.style.borderColor = "#ff003c";
            } else {
                exitBtn.classList.remove('exit-hover');
                cursor.style.backgroundColor = "rgba(0, 247, 255, 0.2)";
                cursor.style.borderColor = "var(--iron-cyan)";
            }
        }

      
        const distance = Math.sqrt(Math.pow(landmarks[4].x - x, 2) + Math.pow(landmarks[4].y - y, 2));
        if (distance < 0.05) {
            if (!isPinched) {
                isPinched = true; 
                cursor.classList.add('pinched');
                addLog("INPUT: PINCH_DETECTED");
                
                const target = document.elementFromPoint(sX, sY);
                
                if (target) {
                   
                    if (target.closest('.exit-btn')) {
                        addLog("SYSTEM: TERMINATING_INTERFACE");
                        closeModule();
                    } 
                    
                    else if (target.closest('.cell')) {
                        activate(Array.from(carousel.children).indexOf(target.closest('.cell')));
                    }
                  
                    else {
                        const actionBtn = target.closest('.jarvis-btn, .tool-card, .hud-module, button');

                        if (actionBtn) {
                            actionBtn.click();
                           
                            actionBtn.style.transform = "scale(0.95)";
                            setTimeout(() => actionBtn.style.transform = "", 100);
                        }
                    }
                }
            }
        } else { 
            isPinched = false; 
            cursor.classList.remove('pinched'); 
        }

       
        let now = Date.now();
        if (x > 0.35 && x < 0.65) canSwipe = true;
        if (canSwipe && (now - lastActivation > 900)) {
            if (x < 0.2) { 
                activate((curr + 1) % features.length); 
                canSwipe = false; lastActivation = now; 
            }
            else if (x > 0.8) { 
                activate((curr - 1 + features.length) % features.length); 
                canSwipe = false; lastActivation = now; 
            }
        }
    } else if (handActive) {
        handActive = false;
        mainCore.style.transform = "translate(-50%, -50%) scale(1.0)";
        addLog("NEURAL_LINK: DISCONNECTED");
    }
    canvasCtx.restore();
});

const camera = new Camera(video, { 
    onFrame: async () => await hands.send({image: video}), 
    width: 640, 
    height: 480 
});

camera.start().then(() => { 
    addLog("INTERFACE_ONLINE"); 
    activate(0); 
});
