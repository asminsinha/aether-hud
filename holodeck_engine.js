const Holodeck = {
    active: false,
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    currentObject: null,
    
   
    isGrabbing: false,
    grabStartTime: 0,
    initialHandZ: null,
    lastHandPos: { x: 0, y: 0 },

init: function(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

  
    this.scene = new THREE.Scene();
    
  
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 450; 
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);

    
    this.renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true 
    });
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    
    this.container.innerHTML = ''; 
    this.container.appendChild(this.renderer.domElement);

   
    const light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);

    //test

    this.container.addEventListener('mousedown', () => {
        const input = document.getElementById('el-input');
        if(input) setTimeout(() => input.focus(), 10);
    });
   
    this.animate();
    
   
    this.loadObject('ATOM');
},

animate: function() {
    if (!this.active) return;
    requestAnimationFrame(() => this.animate());
    const time = Date.now() * 0.001;

    if (this.currentObject) {
     
        if (this.currentObject.isPlanet) {
            this.currentObject.meshGroup.rotation.y += this.currentObject.spinSpeed;
        } 
     
        else if (this.currentObject.isDNA) {
            this.currentObject.internalSpin.rotation.y += 0.02;
        }
        //synapse
        else if (this.currentObject.isSynapse) {
    const time = Date.now() * 0.001;
    const obj = this.currentObject;

  
    const pulseAttr = obj.pulses.geometry.attributes.position;
    for (let i = 0; i < obj.activePulses.length; i++) {
        let p = obj.activePulses[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
            obj.spawnPulse(i);
            p = obj.activePulses[i];
            p.progress = 0;
        }
        const x = p.start.x + (p.end.x - p.start.x) * p.progress;
        const y = p.start.y + (p.end.y - p.start.y) * p.progress;
        const z = p.start.z + (p.end.z - p.start.z) * p.progress;
        pulseAttr.setXYZ(i, x, y, z);
    }
    pulseAttr.needsUpdate = true;

    obj.lines.material.opacity = 0.05 + Math.abs(Math.sin(time * 0.4)) * 0.1;


    obj.rotation.y += 0.005; 
    obj.rotation.x += 0.002; 
    
    
    obj.rotation.x += Math.sin(time * 0.5) * 0.001; 
    obj.rotation.z += Math.cos(time * 0.3) * 0.001;

   
    if (this.handX && this.handY) {
        obj.rotation.y += (this.handX * 0.05);
        obj.rotation.x += (this.handY * 0.05);
    }
        }
        //blackHole
        else if (this.currentObject.isSingularity) {
    const time = Date.now() * 0.001;
    const obj = this.currentObject;

    
    obj.mainDisk.rotation.y += 0.055;
    obj.lensingDisk.rotation.z -= 0.04;

    const targetRotX = (this.handY || 0) * 0.5 + Math.sin(time * 0.2) * 0.1;
    const targetRotY = (this.handX || 0) * 0.5 + time * 0.1;

    obj.rotation.x = THREE.MathUtils.lerp(obj.rotation.x, targetRotX, 0.1);
    obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, targetRotY, 0.1);

   
    const glow = obj.children[1]; 
    glow.material.opacity = 0.1 + Math.abs(Math.sin(time*1.5)) * 0.15;
        }
        
        else if (this.currentObject.isTesseract) {
    const obj = this.currentObject;
    
   
    const speedFactor = 0.045 + (Math.abs(this.handX || 0) * 0.1);
    obj.angle += speedFactor;

    const projectedPoints = [];
    const vertices = [];

   
    obj.points4D.forEach((p, i) => {
        
        const cos = Math.cos(obj.angle);
        const sin = Math.sin(obj.angle);
        
        let x4 = p.x * cos - p.w * sin;
        let w4 = p.x * sin + p.w * cos;
        let y4 = p.y * cos - w4 * sin;
        w4 = p.y * sin + w4 * cos;
        let z4 = p.z * cos - w4 * sin;
        w4 = p.z * sin + w4 * cos;

       
        const distance = 2.5; 
        const wFactor = 1 / (distance - w4); 
        
        const x3 = x4 * wFactor * 3.0;
        const y3 = y4 * wFactor * 3.0;
        const z3 = z4 * wFactor * 3.0;

        const pos = new THREE.Vector3(x3, y3, z3);
        projectedPoints.push(pos);

       
        obj.nodes[i].position.copy(pos);
        obj.nodes[i].material.opacity = 0.4 + Math.random() * 0.6;
    });


    for (let i = 0; i < 16; i++) {
        for (let j = i + 1; j < 16; j++) {
            let diff = i ^ j;
          
            if (diff === 1 || diff === 2 || diff === 4 || diff === 8) {
                vertices.push(projectedPoints[i].x, projectedPoints[i].y, projectedPoints[i].z);
                vertices.push(projectedPoints[j].x, projectedPoints[j].y, projectedPoints[j].z);
            }
        }
    }


    obj.tesseractLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    obj.tesseractLines.geometry.attributes.position.needsUpdate = true;

   
    obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, (this.handX || 0) * 0.8, 0.1);
    obj.rotation.x = THREE.MathUtils.lerp(obj.rotation.x, (this.handY || 0) * 0.8, 0.1);
        }

        else if (this.currentObject && this.currentObject.isMolecule) {
    const time = Date.now() * 0.001;
    const obj = this.currentObject;

  
    obj.rotation.y += 0.01; 
    obj.rotation.x = Math.sin(time * 0.5) * 0.3; 
    obj.rotation.z = Math.cos(time * 0.3) * 0.2;

    
    const targetX = (this.handX || 0) * 15;
    const targetY = (this.handY || 0) * -15;

   
    obj.position.x += (targetX - obj.position.x) * 0.1;
    obj.position.y += (targetY - obj.position.y) * 0.1;
    obj.position.y += Math.sin(time * 2) * 0.1;

   
    if (obj.bondMat) {
        obj.bondMat.opacity = 0.4 + Math.abs(Math.sin(time * 3)) * 0.3;
    }
    
    
    if (this.pointLight) {
        this.pointLight.position.x = Math.sin(time) * 10;
    }
        }
        
        else if (this.currentObject.isMobius) {
    const time = Date.now() * 0.001;
    const obj = this.currentObject;

    // rotation
    obj.rotation.x += 0.005;
    obj.rotation.y += 0.015;

    if (obj.pulseMat) {
        obj.pulseMat.opacity = 0.4 + Math.abs(Math.sin(time * 2.0)) * 0.6;
    }
    if (obj.glowMat) {
        obj.glowMat.opacity = 0.05 + Math.abs(Math.cos(time * 1.2)) * 0.1;
    }
    if (obj.surfaceMat) {
        obj.surfaceMat.opacity = 0.2 + Math.abs(Math.sin(time * 0.5)) * 0.05;
    }
        }
       
        else if (this.currentObject.children[0]) {
            const core = this.currentObject.children[0];
            core.rotation.y += 0.02;
            if (this.orbitalPlanes) {
                this.orbitalPlanes.forEach(p => {
                    p.group.rotation.x += p.drift[0] * 3;
                    p.group.rotation.y += p.drift[1] * 3;
                    p.group.rotation.z += p.drift[2] * 3;
                    p.electrons.forEach(e => e.rotation.z += p.speed * 2);
                });
            }
        }


    }
    this.renderer.render(this.scene, this.camera);
},

    processHandData: function(landmarks) {
        if (!this.active || !landmarks) return;

        const thumb = landmarks[4];
        const index = landmarks[8];
        const palm = landmarks[0];

        const distance = Math.sqrt(
            Math.pow(thumb.x - index.x, 2) + 
            Math.pow(thumb.y - index.y, 2)
        );

        if (distance < 0.05) {
            if (this.grabStartTime === 0) this.grabStartTime = Date.now();
            if (Date.now() - this.grabStartTime > 500) {
                this.isGrabbing = true;
                this.handleMove(index);
            }
        } else {
            this.grabStartTime = 0;
            this.isGrabbing = false;
        }

   
        if (this.initialHandZ === null) this.initialHandZ = palm.z;
        const zDelta = (this.initialHandZ - palm.z) * 20; 
        if (Math.abs(zDelta) > 0.5) {
            this.camera.position.z = THREE.MathUtils.clamp(15 - zDelta, 5, 30);
        }

        const isFist = landmarks[12].y > landmarks[10].y && landmarks[16].y > landmarks[14].y;
        if (isFist && this.currentObject) {
            this.currentObject.rotation.y += (index.x - this.lastHandPos.x) * 5;
            this.currentObject.rotation.x += (index.y - this.lastHandPos.y) * 5;
        }

        this.lastHandPos = { x: index.x, y: index.y };
    },
    
    close: function() {
    this.active = false;
    document.getElementById('holodeck-window').style.display = 'none';
    
   
    while(this.scene.children.length > 0){ 
        this.scene.remove(this.scene.children[0]); 
    }
    
    console.log("Holodeck Deactivated. AETHER HUD Resumed.");
    },

    handleMove: function(pos) {
        if (this.currentObject && this.isGrabbing) {
            
            this.currentObject.position.x = (pos.x - 0.5) * 20;
            this.currentObject.position.y = (0.5 - pos.y) * 15;
        }
    },


};


Holodeck.orbitalPlanes = []; 
const ATOMIC_DATA = {
    "H": { name: "Hydrogen", protons: 1, neutrons: 0, shells: [1] },
    "HE": { name: "Helium", protons: 2, neutrons: 2, shells: [2] },
    "LI": { name: "Lithium", protons: 3, neutrons: 4, shells: [2, 1] },
    "BE": { name: "Beryllium", protons: 4, neutrons: 5, shells: [2, 2] },
    "B": { name: "Boron", protons: 5, neutrons: 6, shells: [2, 3] },
    "C": { name: "Carbon", protons: 6, neutrons: 6, shells: [2, 4] },
    "N": { name: "Nitrogen", protons: 7, neutrons: 7, shells: [2, 5] },
    "O": { name: "Oxygen", protons: 8, neutrons: 8, shells: [2, 6] },
    "F": { name: "Fluorine", protons: 9, neutrons: 10, shells: [2, 7] },
    "NE": { name: "Neon", protons: 10, neutrons: 10, shells: [2, 8] },
    "NA": { name: "Sodium", protons: 11, neutrons: 12, shells: [2, 8, 1] },
    "MG": { name: "Magnesium", protons: 12, neutrons: 12, shells: [2, 8, 2] },
    "AL": { name: "Aluminum", protons: 13, neutrons: 14, shells: [2, 8, 3] },
    "SI": { name: "Silicon", protons: 14, neutrons: 14, shells: [2, 8, 4] },
    "P": { name: "Phosphorus", protons: 15, neutrons: 16, shells: [2, 8, 5] },
    "S": { name: "Sulfur", protons: 16, neutrons: 16, shells: [2, 8, 6] },
    "CL": { name: "Chlorine", protons: 17, neutrons: 18, shells: [2, 8, 7] },
    "AR": { name: "Argon", protons: 18, neutrons: 22, shells: [2, 8, 8] },
    "K": { name: "Potassium", protons: 19, neutrons: 20, shells: [2, 8, 8, 1] },
    "CA": { name: "Calcium", protons: 20, neutrons: 20, shells: [2, 8, 8, 2] },
    "SC": { name: "Scandium", protons: 21, neutrons: 24, shells: [2, 8, 9, 2] },
    "TI": { name: "Titanium", protons: 22, neutrons: 26, shells: [2, 8, 10, 2] },
    "V": { name: "Vanadium", protons: 23, neutrons: 28, shells: [2, 8, 11, 2] },
    "CR": { name: "Chromium", protons: 24, neutrons: 28, shells: [2, 8, 13, 1] },
    "MN": { name: "Manganese", protons: 25, neutrons: 30, shells: [2, 8, 13, 2] },
    "FE": { name: "Iron", protons: 26, neutrons: 30, shells: [2, 8, 14, 2] },
    "CO": { name: "Cobalt", protons: 27, neutrons: 32, shells: [2, 8, 15, 2] },
    "NI": { name: "Nickel", protons: 28, neutrons: 31, shells: [2, 8, 16, 2] },
    "CU": { name: "Copper", protons: 29, neutrons: 35, shells: [2, 8, 18, 1] },
    "ZN": { name: "Zinc", protons: 30, neutrons: 35, shells: [2, 8, 18, 2] },
    "GA": { name: "Gallium", protons: 31, neutrons: 39, shells: [2, 8, 18, 3] },
    "GE": { name: "Germanium", protons: 32, neutrons: 41, shells: [2, 8, 18, 4] },
    "AS": { name: "Arsenic", protons: 33, neutrons: 42, shells: [2, 8, 18, 5] },
    "SE": { name: "Selenium", protons: 34, neutrons: 45, shells: [2, 8, 18, 6] },
    "BR": { name: "Bromine", protons: 35, neutrons: 45, shells: [2, 8, 18, 7] },
    "KR": { name: "Krypton", protons: 36, neutrons: 48, shells: [2, 8, 18, 8] },
    "RB": { name: "Rubidium", protons: 37, neutrons: 48, shells: [2, 8, 18, 8, 1] },
    "SR": { name: "Strontium", protons: 38, neutrons: 50, shells: [2, 8, 18, 8, 2] },
    "Y": { name: "Yttrium", protons: 39, neutrons: 50, shells: [2, 8, 18, 9, 2] },
    "ZR": { name: "Zirconium", protons: 40, neutrons: 51, shells: [2, 8, 18, 10, 2] },
    "NB": { name: "Niobium", protons: 41, neutrons: 52, shells: [2, 8, 18, 12, 1] },
    "MO": { name: "Molybdenum", protons: 42, neutrons: 54, shells: [2, 8, 18, 13, 1] },
    "TC": { name: "Technetium", protons: 43, neutrons: 55, shells: [2, 8, 18, 13, 2] },
    "RU": { name: "Ruthenium", protons: 44, neutrons: 57, shells: [2, 8, 18, 15, 1] },
    "RH": { name: "Rhodium", protons: 45, neutrons: 58, shells: [2, 8, 18, 16, 1] },
    "PD": { name: "Palladium", protons: 46, neutrons: 60, shells: [2, 8, 18, 18] },
    "AG": { name: "Silver", protons: 47, neutrons: 61, shells: [2, 8, 18, 18, 1] },
    "CD": { name: "Cadmium", protons: 48, neutrons: 64, shells: [2, 8, 18, 18, 2] },
    "IN": { name: "Indium", protons: 49, neutrons: 66, shells: [2, 8, 18, 18, 3] },
    "SN": { name: "Tin", protons: 50, neutrons: 69, shells: [2, 8, 18, 18, 4] },
    "SB": { name: "Antimony", protons: 51, neutrons: 71, shells: [2, 8, 18, 18, 5] },
    "TE": { name: "Tellurium", protons: 52, neutrons: 76, shells: [2, 8, 18, 18, 6] },
    "I": { name: "Iodine", protons: 53, neutrons: 74, shells: [2, 8, 18, 18, 7] },
    "XE": { name: "Xenon", protons: 54, neutrons: 77, shells: [2, 8, 18, 18, 8] },
    "CS": { name: "Cesium", protons: 55, neutrons: 78, shells: [2, 8, 18, 18, 8, 1] },
    "BA": { name: "Barium", protons: 56, neutrons: 81, shells: [2, 8, 18, 18, 8, 2] },
    "LA": { name: "Lanthanum", protons: 57, neutrons: 82, shells: [2, 8, 18, 18, 9, 2] },
    "CE": { name: "Cerium", protons: 58, neutrons: 82, shells: [2, 8, 18, 19, 9, 2] },
    "PR": { name: "Praseodymium", protons: 59, neutrons: 82, shells: [2, 8, 18, 21, 8, 2] },
    "ND": { name: "Neodymium", protons: 60, neutrons: 84, shells: [2, 8, 18, 22, 8, 2] },
    "PM": { name: "Promethium", protons: 61, neutrons: 84, shells: [2, 8, 18, 23, 8, 2] },
    "SM": { name: "Samarium", protons: 62, neutrons: 88, shells: [2, 8, 18, 24, 8, 2] },
    "EU": { name: "Europium", protons: 63, neutrons: 89, shells: [2, 8, 18, 25, 8, 2] },
    "GD": { name: "Gadolinium", protons: 64, neutrons: 93, shells: [2, 8, 18, 25, 9, 2] },
    "TB": { name: "Terbium", protons: 65, neutrons: 94, shells: [2, 8, 18, 27, 8, 2] },
    "DY": { name: "Dysprosium", protons: 66, neutrons: 97, shells: [2, 8, 18, 28, 8, 2] },
    "HO": { name: "Holmium", protons: 67, neutrons: 98, shells: [2, 8, 18, 29, 8, 2] },
    "ER": { name: "Erbium", protons: 68, neutrons: 99, shells: [2, 8, 18, 30, 8, 2] },
    "TM": { name: "Thulium", protons: 69, neutrons: 100, shells: [2, 8, 18, 31, 8, 2] },
    "YB": { name: "Ytterbium", protons: 70, neutrons: 103, shells: [2, 8, 18, 32, 8, 2] },
    "LU": { name: "Lutetium", protons: 71, neutrons: 104, shells: [2, 8, 18, 32, 9, 2] },
    "HF": { name: "Hafnium", protons: 72, neutrons: 106, shells: [2, 8, 18, 32, 10, 2] },
    "TA": { name: "Tantalum", protons: 73, neutrons: 108, shells: [2, 8, 18, 32, 11, 2] },
    "W": { name: "Tungsten", protons: 74, neutrons: 110, shells: [2, 8, 18, 32, 12, 2] },
    "RE": { name: "Rhenium", protons: 75, neutrons: 111, shells: [2, 8, 18, 32, 13, 2] },
    "OS": { name: "Osmium", protons: 76, neutrons: 114, shells: [2, 8, 18, 32, 14, 2] },
    "IR": { name: "Iridium", protons: 77, neutrons: 115, shells: [2, 8, 18, 32, 15, 2] },
    "PT": { name: "Platinum", protons: 78, neutrons: 117, shells: [2, 8, 18, 32, 17, 1] },
    "AU": { name: "Gold", protons: 79, neutrons: 118, shells: [2, 8, 18, 32, 18, 1] },
    "HG": { name: "Mercury", protons: 80, neutrons: 121, shells: [2, 8, 18, 32, 18, 2] },
    "TL": { name: "Thallium", protons: 81, neutrons: 123, shells: [2, 8, 18, 32, 18, 3] },
    "PB": { name: "Lead", protons: 82, neutrons: 125, shells: [2, 8, 18, 32, 18, 4] },
    "BI": { name: "Bismuth", protons: 83, neutrons: 126, shells: [2, 8, 18, 32, 18, 5] },
    "PO": { name: "Polonium", protons: 84, neutrons: 125, shells: [2, 8, 18, 32, 18, 6] },
    "AT": { name: "Astatine", protons: 85, neutrons: 125, shells: [2, 8, 18, 32, 18, 7] },
    "RN": { name: "Radon", protons: 86, neutrons: 136, shells: [2, 8, 18, 32, 18, 8] },
    "FR": { name: "Francium", protons: 87, neutrons: 136, shells: [2, 8, 18, 32, 18, 8, 1] },
    "RA": { name: "Radium", protons: 88, neutrons: 138, shells: [2, 8, 18, 32, 18, 8, 2] },
    "AC": { name: "Actinium", protons: 89, neutrons: 138, shells: [2, 8, 18, 32, 18, 9, 2] },
    "TH": { name: "Thorium", protons: 90, neutrons: 142, shells: [2, 8, 18, 32, 18, 10, 2] },
    "PA": { name: "Protactinium", protons: 91, neutrons: 140, shells: [2, 8, 18, 32, 20, 9, 2] },
    "U": { name: "Uranium", protons: 92, neutrons: 146, shells: [2, 8, 18, 32, 21, 9, 2] },
    "NP": { name: "Neptunium", protons: 93, neutrons: 144, shells: [2, 8, 18, 32, 22, 9, 2] },
    "PU": { name: "Plutonium", protons: 94, neutrons: 150, shells: [2, 8, 18, 32, 24, 8, 2] },
    "AM": { name: "Americium", protons: 95, neutrons: 148, shells: [2, 8, 18, 32, 25, 8, 2] },
    "CM": { name: "Curium", protons: 96, neutrons: 151, shells: [2, 8, 18, 32, 25, 9, 2] },
    "BK": { name: "Berkelium", protons: 97, neutrons: 150, shells: [2, 8, 18, 32, 27, 8, 2] },
    "CF": { name: "Californium", protons: 98, neutrons: 153, shells: [2, 8, 18, 32, 28, 8, 2] },
    "ES": { name: "Einsteinium", protons: 99, neutrons: 153, shells: [2, 8, 18, 32, 29, 8, 2] },
    "FM": { name: "Fermium", protons: 100, neutrons: 157, shells: [2, 8, 18, 32, 30, 8, 2] },
    "MD": { name: "Mendelevium", protons: 101, neutrons: 157, shells: [2, 8, 18, 32, 31, 8, 2] },
    "NO": { name: "Nobelium", protons: 102, neutrons: 157, shells: [2, 8, 18, 32, 32, 8, 2] },
    "LR": { name: "Lawrencium", protons: 103, neutrons: 159, shells: [2, 8, 18, 32, 32, 9, 2] },
    "RF": { name: "Rutherfordium", protons: 104, neutrons: 161, shells: [2, 8, 18, 32, 32, 10, 2] },
    "DB": { name: "Dubnium", protons: 105, neutrons: 163, shells: [2, 8, 18, 32, 32, 11, 2] },
    "SG": { name: "Seaborgium", protons: 106, neutrons: 165, shells: [2, 8, 18, 32, 32, 12, 2] },
    "BH": { name: "Bohrium", protons: 107, neutrons: 163, shells: [2, 8, 18, 32, 32, 13, 2] },
    "HS": { name: "Hassium", protons: 108, neutrons: 169, shells: [2, 8, 18, 32, 32, 14, 2] },
    "MT": { name: "Meitnerium", protons: 109, neutrons: 169, shells: [2, 8, 18, 32, 32, 15, 2] },
    "DS": { name: "Darmstadtium", protons: 110, neutrons: 171, shells: [2, 8, 18, 32, 32, 17, 1] },
    "RG": { name: "Roentgenium", protons: 111, neutrons: 171, shells: [2, 8, 18, 32, 32, 18, 1] },
    "CN": { name: "Copernicium", protons: 112, neutrons: 173, shells: [2, 8, 18, 32, 32, 18, 2] },
    "NH": { name: "Nihonium", protons: 113, neutrons: 173, shells: [2, 8, 18, 32, 32, 18, 3] },
    "FL": { name: "Flerovium", protons: 114, neutrons: 175, shells: [2, 8, 18, 32, 32, 18, 4] },
    "MC": { name: "Moscovium", protons: 115, neutrons: 175, shells: [2, 8, 18, 32, 32, 18, 5] },
    "LV": { name: "Livermorium", protons: 116, neutrons: 177, shells: [2, 8, 18, 32, 32, 18, 6] },
    "TS": { name: "Tennessine", protons: 117, neutrons: 177, shells: [2, 8, 18, 32, 32, 18, 7] },
    "OG": { name: "Oganesson", protons: 118, neutrons: 176, shells: [2, 8, 18, 32, 32, 18, 8] }
};
const PLANET_DATA = {
    "SUN": { name: "Sun", tilt: 7.25, period: 25.38, texture: "sunmap.jpg", info: "Type: G2V Star | Mass: 99.8% System" },
    "MERCURY": { name: "Mercury", tilt: 0.03, period: 58.6, texture: "mercurymap.jpg", info: "Dist: 57.9M km | Velocity: 47.4 km/s" },
    "VENUS": { name: "Venus", tilt: 177.4, period: -243, texture: "venusmap.jpg", info: "Dist: 108.2M km | Retrograde Rotation" },
    "EARTH": { name: "Earth", tilt: 23.44, period: 1, texture: "earthmap1k.jpg", info: "Dist: 149.6M km | Velocity: 29.8 km/s" },
    "MOON": { name: "Moon", tilt: 6.68, period: 27.3, texture: "moonmap1k.jpg", info: "Dist: 384k km | Tidal Locked" },
    "MARS": { name: "Mars", tilt: 25.19, period: 1.03, texture: "mars_1k_color.jpg", info: "Dist: 227.9M km | Velocity: 24.1 km/s" },
    "JUPITER": { name: "Jupiter", tilt: 3.13, period: 0.41, texture: "jupitermap.jpg", info: "Dist: 778.6M km | Gas Giant" },
    "SATURN": { name: "Saturn", tilt: 26.73, period: 0.45, texture: "saturnmap.jpg", info: "Dist: 1.4B km | Ring System" },
    "URANUS": { name: "Uranus", tilt: 97.77, period: -0.72, texture: "uranusmap.jpg", info: "Dist: 2.9B km | Ice Giant" },
    "NEPTUNE": { name: "Neptune", tilt: 28.32, period: 0.67, texture: "neptunemap.jpg", info: "Dist: 4.5B km | Velocity: 5.4 km/s" },
    "PLUTO": { name: "Pluto", tilt: 122.5, period: -6.39, texture: "plutomap1k.jpg", info: "Type: Dwarf Planet | Kuiper Belt" }
};

Holodeck.loadObject = function(input) {
    if (this.currentObject) this.scene.remove(this.currentObject);
    this.orbitalPlanes = []; 
    
    const query = input ? input.toUpperCase() : "C";
    const hudInput = document.getElementById('el-input');
    const hudData = document.getElementById('el-data');

    
    hudInput.style.display = "none";
    hudData.innerHTML = "";

    if (query === 'DNA') {
        hudData.innerHTML = "STATUS: BIO_MAPPING_ACTIVE<br>TYPE: DOUBLE_HELIX<br>SEQUENCE: AT-GC_STABLE";
        this.currentObject = this.generateDNA();
    } 
    else if (PLANET_DATA[query]) {
        this.currentObject = this.generatePlanet(PLANET_DATA[query]);
    }
    else if (query === 'MOBIUS') {
        this.currentObject = this.generateMobiusStrip();
    }
    else if (query === 'SINGULARITY' || query === 'BLACKHOLE') {
        this.currentObject = this.generateSingularity();
    }
    else if (query === 'TESSERACT' || query === 'HYPERCUBE') {
        this.currentObject = this.generateTesseract();
    }
    else if (query === 'MOLECULE') {
    this.currentObject = this.generateCaffeine();
    }
   
    else if (query === 'SYNAPSE' || query === 'NEURAL') {
    this.currentObject = this.generateNeuralSynapse();
    } 

    else {
        hudInput.style.display = "block";
        const data = ATOMIC_DATA[query] || ATOMIC_DATA["C"];
        this.currentObject = this.buildAtom(data);
        hudInput.focus();
    }

    this.scene.add(this.currentObject);
};


Holodeck.buildAtom = function(data) {
    const group = new THREE.Group();

    // nucleus
    const coreGroup = new THREE.Group();
    const totalNucleons = data.protons + data.neutrons;
    const sphereGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x00f7ff, wireframe: true, transparent: true, opacity: 0.8 });
    const nMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, wireframe: true, transparent: true, opacity: 0.4 });

    for (let i = 0; i < totalNucleons; i++) {
        const part = new THREE.Mesh(sphereGeo, i < data.protons ? pMat : nMat);
        const phi = Math.acos(-1 + (2 * i) / totalNucleons);
        const theta = Math.sqrt(totalNucleons * Math.PI) * phi;
        part.position.set(0.5 * Math.cos(theta) * Math.sin(phi), 0.5 * Math.sin(theta) * Math.sin(phi), 0.5 * Math.cos(phi));
        part.userData = { offset: Math.random() * Math.PI };
        coreGroup.add(part);
    }
    group.add(coreGroup);


    data.shells.forEach((count, idx) => {
        const radius = 2.5 + (idx * 1.5);
        const plane = new THREE.Group();
        
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.025, 16, 100),
            new THREE.LineBasicMaterial({ color: 0x00f7ff, transparent: true, opacity: 0.5 })
        );
        ring.rotation.x = Math.PI / 2;
        plane.add(ring);

        const eGroup = [];
        for(let i = 0; i < count; i++) {
            const pivot = new THREE.Group();
            pivot.rotation.x = Math.PI / 2;
            const eMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({color: 0xffffff}));
            eMesh.position.y = radius; 
            pivot.add(eMesh);
            pivot.rotation.z = (i / count) * Math.PI * 2;
            plane.add(pivot);
            eGroup.push(pivot);
        }
        plane.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        group.add(plane);
        this.orbitalPlanes.push({ group: plane, electrons: eGroup, speed: 0.05 / (idx + 1), drift: [Math.random()*0.01, Math.random()*0.01, Math.random()*0.01] });
    });

   
    const dataDisplay = document.getElementById('el-data');
    if (dataDisplay) {
        dataDisplay.innerHTML = `NAME: ${data.name.toUpperCase()}<br>NUCLEONS: ${totalNucleons}<br>ELECTRONS: ${data.protons}`;
    }

    group.scale.set(0.7, 0.7, 0.7);
    return group;
};


Holodeck.generateDNA = function() {
    const wrapper = new THREE.Group();
    const internalSpin = new THREE.Group();
    wrapper.add(internalSpin);
    wrapper.rotation.z = Math.PI / 2;

    const pointsCount = 40;
    const radius = 1.6;
    const heightStep = 0.45;
    const twistSpeed = 0.5;
    const colors = [0x00f7ff, 0xffaa00, 0xffffff, 0x0088ff];

    for (let i = 0; i < pointsCount; i++) {
        const y = (i - pointsCount / 2) * heightStep;
        const angle = i * twistSpeed;
        const isAT = i % 2 === 0;
        const c1 = isAT ? colors[0] : colors[2];
        const c2 = isAT ? colors[1] : colors[3];

        const node1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: c1 }));
        node1.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        
        const node2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: c2 }));
        node2.position.set(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([node1.position, node2.position]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));

        internalSpin.add(node1, node2, line);
    }

    wrapper.isDNA = true; 
    wrapper.internalSpin = internalSpin;
    return wrapper;
};

Holodeck.generatePlanet = function(data) {
    const wrapper = new THREE.Group();
    const meshGroup = new THREE.Group();
    wrapper.add(meshGroup);

   
    const light = new THREE.PointLight(0xffffff, 0.5, 100); 
    light.position.set(10, 10, 10);
    wrapper.add(light);
    wrapper.add(new THREE.AmbientLight(0xffffff, 0.05)); 

    const loader = new THREE.TextureLoader();
    const texture = loader.load(`textures/${data.texture}`);
    
  
    const geo = new THREE.SphereGeometry(2.5, 64, 64);
    
   
    const mat = (data.name === "Sun") 
        ? new THREE.MeshBasicMaterial({ map: texture }) 
        : new THREE.MeshPhongMaterial({ map: texture, shininess: 5 });
        
    const planetMesh = new THREE.Mesh(geo, mat);
    meshGroup.add(planetMesh);

   
    if (data.name === "Saturn" || data.name === "Uranus") {
        const ringTexName = data.name === "Saturn" ? "saturnringcolor.jpg" : "uranusringcolour.jpg";
        
        
        const ringTexture = loader.load(`textures/${ringTexName}`);
        
        
        ringTexture.wrapS = THREE.RepeatWrapping;
        ringTexture.wrapT = THREE.RepeatWrapping;

        
        ringTexture.repeat.set(80, 1);

        const ringGeo = new THREE.TorusGeometry(4, 0.75, 16, 100); 
        const ringMat = new THREE.MeshBasicMaterial({ 
            map: ringTexture, 
            transparent: true, 
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending 
        });
        
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2; 
        
       
        ringMesh.scale.z = 0.1; 
        
        meshGroup.add(ringMesh);
    }

   
    wrapper.rotation.z = (data.tilt * Math.PI) / 180;
    wrapper.isPlanet = true;
    
   
    const baseSpeed = 0.01; 
    wrapper.spinSpeed = (baseSpeed + (0.01 / Math.abs(data.period))) * (data.period < 0 ? -1 : 1);
    wrapper.spinSpeed *= 2; 
    
    wrapper.meshGroup = meshGroup;
    document.getElementById('el-data').innerHTML = `BODY: ${data.name.toUpperCase()}<br>TILT: ${data.tilt}°<br>${data.info}`;
    
    return wrapper;
};

Holodeck.generateMobiusStrip = function() {
    const group = new THREE.Group();
    const segmentsU = 150;
    const segmentsV = 40;

    
    const mobiusFunction = (u, v, target) => {
        u *= Math.PI * 2; 
        v = (v - 0.5) * 2; 
        const R = 8; 
        const w = 7; 
        const x = (R + (v * w / 2) * Math.cos(u / 2)) * Math.cos(u);
        const y = (R + (v * w / 2) * Math.cos(u / 2)) * Math.sin(u);
        const z = (v * w / 2) * Math.sin(u / 2);
        target.set(x, y, z);
    };

    const geometry = new THREE.ParametricBufferGeometry(mobiusFunction, segmentsU, segmentsV);

    
    const surfaceMat = new THREE.MeshPhongMaterial({
        color: 0x002222,
        emissive: 0x001111,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        shininess: 100
    });
    group.add(new THREE.Mesh(geometry, surfaceMat));


    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(geometry, glowMat);
    glowMesh.scale.set(0.99, 0.99, 0.99);
    group.add(glowMesh);

   
    const pulseMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
    });

   
    const spinePoints = [];
    for (let i = 0; i <= segmentsU; i++) {
        const p = new THREE.Vector3();
        mobiusFunction(i / segmentsU, 0.5, p);
        spinePoints.push(p);
    }
    const spineLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(spinePoints), pulseMat);
    group.add(spineLine);

    
    const zigZagPoints = [];
    for (let i = 0; i <= segmentsU; i++) {
        const p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
        const vBase = (i % 2 === 0) ? 0 : 1;
        mobiusFunction(i / segmentsU, vBase, p1);
        mobiusFunction((i + 1) / segmentsU, 1 - vBase, p2);
        zigZagPoints.push(p1, p2);
    }
    const zigZagLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(zigZagPoints), pulseMat);
    group.add(zigZagLines);
    group.scale.set(0.50, 0.50, 0.50);
   
    group.isMobius = true;
    group.pulseMat = pulseMat;
    group.glowMat = glowMat;
    group.surfaceMat = surfaceMat;

    document.getElementById('el-data').innerHTML = `STATUS: ANALYSIS COMPLETE<br>GEOMETRY_TYPE: PARAMETRIC_MOBIUS<br>EQ_X: (1 + v/2 * cos(u/2)) * cos(u)<br>
    EQ_Y: (1 + v/2 * cos(u/2)) * sin(u)<br>
    EQ_Z: v/2 * sin(u/2)`;
    
    return group;
};

Holodeck.generateNeuralSynapse = function() {
    const group = new THREE.Group();
    const nodeCount = 300;
    const maxDistance = 3.0;
    const pulseCount = 100;
    const nodeData = [];
    const validConnections = [];

    const nodePositions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
        const r = 5 * Math.pow(Math.random(), 0.6);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        nodePositions[i * 3] = x;
        nodePositions[i * 3 + 1] = y;
        nodePositions[i * 3 + 2] = z;
        nodeData.push(new THREE.Vector3(x, y, z));
    }

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodes = new THREE.Points(nodeGeo, new THREE.PointsMaterial({
        color: 0xffffff, 
        size: 0.07, 
        transparent: true, 
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    }));
    group.add(nodes);

   
    const lineCoords = [];
    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            const dist = nodeData[i].distanceTo(nodeData[j]);
            if (dist < maxDistance) {
                lineCoords.push(nodeData[i].x, nodeData[i].y, nodeData[i].z);
                lineCoords.push(nodeData[j].x, nodeData[j].y, nodeData[j].z);
                validConnections.push({ start: nodeData[i], end: nodeData[j] });
            }
        }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    
   
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
        color: 0x00f7ff, 
        transparent: true, 
        opacity: 0.05, 
        blending: THREE.AdditiveBlending
    }));
    group.add(lines);

  
    const pulseGeo = new THREE.BufferGeometry();
    const pulsePosAttr = new Float32Array(pulseCount * 3);
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePosAttr, 3));
    
  
    const pulses = new THREE.Points(pulseGeo, new THREE.PointsMaterial({
        color: 0x00f7ff, 
        size: 0.15, 
        transparent: true, 
        opacity: 1.0, 
        blending: THREE.AdditiveBlending
    }));
    group.add(pulses);

    const activePulses = [];
    const spawnPulse = (i) => {
        const conn = validConnections[Math.floor(Math.random() * validConnections.length)];
        activePulses[i] = {
            start: conn.start,
            end: conn.end,
            progress: Math.random(),
            speed: 0.008 + Math.random() * 0.015 
        };
    };

    for (let i = 0; i < pulseCount; i++) spawnPulse(i);

    group.isSynapse = true;
    group.activePulses = activePulses;
    group.spawnPulse = spawnPulse;
    group.lines = lines;
    group.pulses = pulses;

    document.getElementById('el-data').innerHTML = `
    NEURAL TOPOLOGY: MULTI-LAYER_PERCEPTRON<br>
    SYNAPTIC_WEIGHTS: OPTIMIZED<br>
    COGNITIVE_LOAD: ${Math.floor(Math.random() * 15 + 5)}%
`;

    return group;
};

Holodeck.generateSingularity = function() {
    const group = new THREE.Group();
    const particleCount = 12000;

  
    const voidGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(voidGeo, voidMat);
    group.add(blackHole);

   
    const photonGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const photonMat = new THREE.MeshBasicMaterial({ 
        color: 0xff7700, 
        transparent: true, 
        opacity: 0.2, 
        side: THREE.BackSide 
    });
    group.add(new THREE.Mesh(photonGeo, photonMat));

   
    const createDisk = (radius, thickness, color1, color2) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(particleCount * 3);
        const cols = new Float32Array(particleCount * 3);
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);

        for (let i = 0; i < particleCount; i++) {
            const r = 2.0 + Math.random() * radius; 
            const angle = Math.random() * Math.PI * 2;
            
            pos[i * 3] = Math.cos(angle) * r;
            pos[i * 3 + 1] = (Math.random() - 0.5) * thickness * (r * 0.5);
            pos[i * 3 + 2] = Math.sin(angle) * r;

            const mixed = c1.clone().lerp(c2, (r - 2) / radius);
            cols[i * 3] = mixed.r;
            cols[i * 3 + 1] = mixed.g;
            cols[i * 3 + 2] = mixed.b;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

        return new THREE.Points(geo, new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        }));
    };

  
    const mainDisk = createDisk(3.5, 0.1, 0xff3c00, 0x00f7ff);
    const lensingDisk = createDisk(3.2, 2.5, 0xff3c00, 0x00f7ff);
    lensingDisk.rotation.x = Math.PI / 2.2; 
    
    group.add(mainDisk);
    group.add(lensingDisk);

  
    const jetGeo = new THREE.CylinderGeometry(0.02, 0.4, 15, 16, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({ 
        color: 0x00f7ff, 
        transparent: true, 
        opacity: 0.1, 
        wireframe: true 
    });
    const jet = new THREE.Mesh(jetGeo, jetMat);
    group.add(jet);

   
    group.isSingularity = true;
    group.mainDisk = mainDisk;
    group.lensingDisk = lensingDisk;

    document.getElementById('el-data').innerHTML = `
        SCHWARZSCHILD_METRIC: STABLE<br>
        RADIUS: R_s = 2GM / c²<br>
        TEMP: T_h = ħc³ / 8πGMk_b<br>
        ENTROPY: S_bh = Ak_bc³ / 4Għ<br>
        LENSING_MODE: RELATIVISTIC_WARP
    `;

    return group;
};

Holodeck.generateTesseract = function() {
    const group = new THREE.Group();
    const points4D = [];

  
    for (let i = 0; i < 16; i++) {
        points4D.push({
            x: (i & 1) ? 1 : -1,
            y: (i & 2) ? 1 : -1,
            z: (i & 4) ? 1 : -1,
            w: (i & 8) ? 1 : -1
        });
    }

    
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ 
        color: 0x00f7ff, 
        transparent: true, 
        opacity: 0.4,
        blending: THREE.AdditiveBlending 
    });

    const tesseractLines = new THREE.LineSegments(geometry, material);
    group.add(tesseractLines);


    const nodeGeo = new THREE.IcosahedronGeometry(0.06, 1);
    const nodes = [];
    for(let i=0; i<16; i++) {
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00f7ff, transparent: true });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        group.add(node);
        nodes.push(node);
    }

    const coreGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x00f7ff, transparent: true, opacity: 0.1 })
    );
    group.add(coreGlow);

   
    group.isTesseract = true;
    group.points4D = points4D;
    group.nodes = nodes;
    group.tesseractLines = tesseractLines;
    group.angle = 0;

   
    document.getElementById('el-data').innerHTML = `
        DIMENSION: 4D_HYPERCUBE<br>
        ROT_XY: cos(θ) -sin(θ)<br>
        ROT_ZW: sin(θ)  cos(θ)<br>
        PROJECTION: PERSPECTIVE_W
    `;

    return group;
};

Holodeck.generateCaffeine = function() {
    const group = new THREE.Group();
    const hud = document.getElementById('el-data');

   
    const atomMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x002222,
        metalness: 0.9,       
        roughness: 0.1,       
        transparent: true,
        opacity: 0.8
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
    });

    const bondMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x008888,
        metalness: 0.5,
        transparent: true,
        opacity: 0.6
    });

    const atoms = [
        { x: 0,    y: 2.25,  z: 0, type: 'C' }, 
        { x: 1.95, y: 1.05,  z: 0, type: 'N' },
        { x: 1.95, y: -1.05, z: 0, type: 'C' }, 
        { x: 0,    y: -2.25, z: 0, type: 'N' },
        { x: -1.95,y: -1.05, z: 0, type: 'C' }, 
        { x: -1.95,y: 1.05,  z: 0, type: 'C' },
        { x: 3.75, y: 1.8,   z: 0, type: 'C' }, 
        { x: 0,    y: 4.5,   z: 0, type: 'O' },
        { x: -3.75,y: 1.95,  z: 0, type: 'N' }, 
        { x: -3.75,y: -1.95, z: 0, type: 'N' },
        { x: -5.25,y: 0,     z: 0, type: 'C' }
    ];

    const bonds = [
        [0,1], [1,2], [2,3], [3,4], [4,5], [5,0],
        [1,6], [0,7], [5,8], [4,9], [8,10], [9,10]
    ];

    atoms.forEach(a => {
        const radius = (a.type === 'O' ? 0.8 : 0.6);
        const geom = new THREE.SphereBufferGeometry(radius, 32, 32); 
        const atom = new THREE.Mesh(geom, atomMaterial);
        atom.position.set(a.x, a.y, a.z);

      
        const glow = new THREE.Mesh(geom, glowMaterial);
        glow.scale.set(1.2, 1.2, 1.2);
        atom.add(glow);

        group.add(atom);
    });

    bonds.forEach(b => {
        const start = new THREE.Vector3(atoms[b[0]].x, atoms[b[0]].y, atoms[b[0]].z);
        const end = new THREE.Vector3(atoms[b[1]].x, atoms[b[1]].y, atoms[b[1]].z);
        const dist = start.distanceTo(end);
        
        const geom = new THREE.CylinderBufferGeometry(0.12, 0.12, dist, 12);
        const bond = new THREE.Mesh(geom, bondMaterial);
        bond.position.copy(end.clone().add(start).divideScalar(2));
        bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
        group.add(bond);
    });

  
    group.isMolecule = true;
    group.bondMat = bondMaterial;
    group.atomMat = atomMaterial;
    
  
    group.scale.set(0.8, 0.8, 0.8);

    if(hud) {
        hud.innerHTML = `
            <span class="highlight">STRUCTURAL ANALYSIS COMPLETE</span><br>
            FORMULA: C8H10N4O2 (Caffeine)<br>
            ELEMENTS: 4 (C, H, N, O)<br>
            MASS: 194.19 g/mol<br>
            BONDS: 12 COVALENT
        `;
    }

    return group;
};