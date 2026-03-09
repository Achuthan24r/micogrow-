// app.js - Bluetooth connection and real-time UI updates for Mushroom Farm Automation

// HC-05 uses Bluetooth Classic's Serial Port Profile (SPP), which Web Bluetooth does not support.
// Instead, we use the Web Serial API (navigator.serial) to talk to the HC-05.
// Note: You must pair the HC-05 with your Windows/Android device in Settings BEFORE clicking Connect.

let serialPort = null;
let serialReader = null;
let serialWriter = null;
let readInterval = null;

// ==== UI Elements ==== //
const connectBtn = document.getElementById('connectBtn');
const tempValue = document.getElementById('tempValue');
const humValue = document.getElementById('humValue');
const sprayStatus = document.getElementById('sprayStatus');
const motorStatus = document.getElementById('motorStatus');
const fanStatus = document.getElementById('fanStatus');
const colorText = document.getElementById('colorText');
const colorSwatch = document.getElementById('colorSwatch');
const diseaseStatus = document.getElementById('diseaseStatus');
const sprayToggle = document.getElementById('sprayToggle');
const motorToggle = document.getElementById('motorToggle');
const fanToggle = document.getElementById('fanToggle');

// ==== Helper Functions ==== //
function log(msg) {
    console.log('[MushroomFarm] ' + msg);
}

function parseSensorData(dataStr) {
    // Expected format: TEMP:25,HUM:80,SPRAY:ON,MOTOR:OFF,FAN:ON,COLOR:WHITE
    const parts = dataStr.trim().split(',');
    const result = {};
    parts.forEach(p => {
        const [key, value] = p.split(':');
        if (key && value !== undefined) {
            result[key.trim().toUpperCase()] = value.trim();
        }
    });
    return result;
}

function updateUI(data) {
    if (data.TEMP !== undefined) {
        const temp = Number(data.TEMP);
        tempValue.textContent = `${temp} °C`;
        // Alert if out of safe range
        if (temp < SAFE_TEMP_MIN || temp > SAFE_TEMP_MAX) {
            showAlert(`⚠️ Temperature ${temp}°C is outside safe range!`);
        }
    }
    if (data.HUM !== undefined) {
        humValue.textContent = `${data.HUM} %`;
    }
    if (data.SPRAY !== undefined) {
        sprayStatus.textContent = data.SPRAY;
        sprayToggle.textContent = data.SPRAY === 'ON' ? 'Turn OFF' : 'Turn ON';
    }
    if (data.MOTOR !== undefined) {
        motorStatus.textContent = data.MOTOR;
        motorToggle.textContent = data.MOTOR === 'ON' ? 'Turn OFF' : 'Turn ON';
    }
    if (data.FAN !== undefined) {
        fanStatus.textContent = data.FAN;
        fanToggle.textContent = data.FAN === 'ON' ? 'Turn OFF' : 'Turn ON';
    }
    if (data.COLOR !== undefined) {
        const colorStr = data.COLOR.toLowerCase();
        colorText.textContent = data.COLOR;

        // Basic color mapping for disease risk
        if (colorStr.includes('white')) {
            colorSwatch.style.background = '#ffffff';
            diseaseStatus.textContent = 'Status: Healthy Mushroom';
            diseaseStatus.style.color = 'var(--primary)';
        } else if (colorStr.includes('green') || colorStr.includes('mold')) {
            colorSwatch.style.background = '#28a745';
            diseaseStatus.textContent = 'Status: Risk (Trichoderma / Green Mold)';
            diseaseStatus.style.color = '#ff4d4d'; // Red alert
            showAlert('🚨 Warning: Green mold detected!');
        } else if (colorStr.includes('brown') || colorStr.includes('yellow')) {
            colorSwatch.style.background = '#d97706';
            diseaseStatus.textContent = 'Status: Risk (Bacterial Blotch)';
            diseaseStatus.style.color = '#ffaa00'; // Orange alert
        } else {
            colorSwatch.style.background = colorStr;
            diseaseStatus.textContent = 'Status: Analyzing...';
            diseaseStatus.style.color = 'var(--text-secondary)';
        }
    }
}

function showAlert(message) {
    // Simple toast style alert
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(255,0,0,0.85)';
    toast.style.color = '#fff';
    toast.style.padding = '0.8rem 1.2rem';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    toast.style.zIndex = 1000;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

async function connectBluetooth() {
    try {
        log('Requesting Bluetooth Serial Port (select your HC-05)...');
        // Request a serial port (works for paired HC-05 modules over SPP)
        serialPort = await navigator.serial.requestPort();

        // Open the serial port at the HC-05's default baud rate (usually 9600)
        await serialPort.open({ baudRate: 9600 });

        log('Bluetooth Serial connected');
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connected';

        // Start reading data continuously
        readLoop();
    } catch (error) {
        console.error('Connection failed', error);
        alert('Failed to connect: ' + error.message);
    }
}

async function readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
    serialReader = textDecoder.readable.getReader();

    let incomingString = '';

    try {
        while (true) {
            const { value, done } = await serialReader.read();
            if (done) {
                break; // Reader has been canceled
            }

            incomingString += value;

            // If we hit a newline (Arduino did Serial.println)
            if (incomingString.includes('\n')) {
                const lines = incomingString.split('\n');
                // The last element might be an incomplete line, keep it in the buffer
                incomingString = lines.pop(); // .pop() removes and returns the last item

                // Process all complete lines
                for (const line of lines) {
                    if (line.trim().length > 0) {
                        log('Received: ' + line.trim());
                        const parsed = parseSensorData(line);
                        updateUI(parsed);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Read loop error:', error);
    } finally {
        serialReader.releaseLock();
        log('Bluetooth Serial device disconnected');
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect HC-05';
    }
}

function onDisconnected() {
    log('Bluetooth device disconnected');
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect HC-05';
}

function handleCharacteristicValueChanged(event) {
    // Deprecated for Web Serial. 
}

async function sendCommand(commandStr) {
    if (!serialPort || !serialPort.writable) {
        alert('Not connected to HC-05');
        return;
    }

    // We create a temporary writer to send the command
    const textEncoder = new TextEncoderStream();
    const writableStreamClosed = textEncoder.readable.pipeTo(serialPort.writable);
    serialWriter = textEncoder.writable.getWriter();

    try {
        // Send the command and end with a newline so Arduino can read it
        await serialWriter.write(commandStr + '\n');
        log('Sent command: ' + commandStr);
    } catch (err) {
        console.error('Write failed', err);
        alert('Failed to send command');
    } finally {
        serialWriter.releaseLock();
    }
}

// ==== Event Listeners ==== //
connectBtn.addEventListener('click', async () => {
    if (!navigator.serial) {
        alert('Web Serial API is not supported in this browser. Please use Chrome on desktop.');
        return;
    }
    connectBluetooth();
});

sprayToggle.addEventListener('click', () => {
    const newState = sprayStatus.textContent === 'ON' ? 'OFF' : 'ON';
    sendCommand(`SPRAY:${newState}`);
});

motorToggle.addEventListener('click', () => {
    const newState = motorStatus.textContent === 'ON' ? 'OFF' : 'ON';
    sendCommand(`MOTOR:${newState}`);
});

fanToggle.addEventListener('click', () => {
    const newState = fanStatus.textContent === 'ON' ? 'OFF' : 'ON';
    sendCommand(`FAN:${newState}`);
});

// Periodic check removed: Web Serial API pushes data via streams constantly.

// ==== Initialization ==== //
log('App initialized');
