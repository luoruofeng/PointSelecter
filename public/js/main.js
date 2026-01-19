import { ImageEditor } from './ImageEditor.js';
import { CoordinateSystem } from './CoordinateSystem.js';

const editor = new ImageEditor('image-wrapper', 'target-image', 'points-layer');
const coordSys = new CoordinateSystem();

// UI Elements
const uploadSection = document.getElementById('upload-section');
const workspaceSection = document.getElementById('workspace-section');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const targetImage = document.getElementById('target-image');

const btnAddLocation = document.getElementById('btn-add-location');
const btnAddRecognition = document.getElementById('btn-add-recognition');
const btnAddLabel = document.getElementById('btn-add-label');
const btnSaveLabel = document.getElementById('btn-save-label');
const btnExportJson = document.getElementById('btn-export-json');
const btnExportXml = document.getElementById('btn-export-xml');

const locationList = document.getElementById('location-points-list');
const recognitionList = document.getElementById('recognition-points-list');
const selectAllCheckbox = document.getElementById('select-all-points');

// Modal
const labelModal = new bootstrap.Modal(document.getElementById('labelModal'));
const labelInput = document.getElementById('label-input');

// --- Upload Logic ---
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            targetImage.src = data.filePath;
            targetImage.onload = () => {
                uploadSection.classList.add('d-none');
                workspaceSection.classList.remove('d-none');
                editor.refreshPositions();
            };
        } else {
            alert('Upload failed');
        }
    } catch (error) {
        console.error('Error uploading:', error);
        alert('Error uploading file');
    }
});

// --- Mode Switching ---
btnAddLocation.addEventListener('click', () => {
    editor.setMode('location');
    btnAddLocation.classList.add('active');
    btnAddRecognition.classList.remove('active');
});

btnAddRecognition.addEventListener('click', () => {
    editor.setMode('recognition');
    btnAddRecognition.classList.add('active');
    btnAddLocation.classList.remove('active');
});

// --- Editor Callbacks ---
editor.onPointAdded = (type, point) => {
    if (type === 'location') {
        renderLocationList();
        validateCalibration();
    } else {
        // Calculate coords immediately if valid
        if (coordSys.isValid) {
            const coords = coordSys.transform(point.x, point.y);
            point.realX = coords.x;
            point.realY = coords.y;
        }
        renderRecognitionList();
    }
};

// --- Rendering Lists ---

function renderLocationList() {
    locationList.innerHTML = '';
    editor.locationPoints.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>Point ${index + 1}</strong>
                <button class="btn btn-sm btn-outline-danger btn-delete-loc" data-id="${p.id}">&times;</button>
            </div>
            <div class="row g-2">
                <div class="col">
                    <input type="number" class="form-control form-control-sm loc-input-x" 
                        placeholder="Real X" value="${p.realX}" data-id="${p.id}">
                </div>
                <div class="col">
                    <input type="number" class="form-control form-control-sm loc-input-y" 
                        placeholder="Real Y" value="${p.realY}" data-id="${p.id}">
                </div>
            </div>
        `;
        locationList.appendChild(item);
    });

    // Attach listeners
    document.querySelectorAll('.btn-delete-loc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            editor.removeLocationPoint(id);
            renderLocationList();
            validateCalibration();
        });
    });

    document.querySelectorAll('.loc-input-x, .loc-input-y').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const val = parseFloat(e.target.value) || 0;
            const isX = e.target.classList.contains('loc-input-x');
            
            const p = editor.locationPoints.find(pt => pt.id === id);
            if (p) {
                if (isX) p.realX = val;
                else p.realY = val;
            }
            validateCalibration();
        });
    });
}

function renderRecognitionList() {
    recognitionList.innerHTML = '';
    editor.recognitionPoints.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="recog-select" data-id="${p.id}" ${p.selected ? 'checked' : ''}></td>
            <td>${p.id}</td>
            <td>(${p.realX.toFixed(2)}, ${p.realY.toFixed(2)})</td>
            <td><span class="badge bg-secondary">${p.label || '-'}</span></td>
            <td><button class="btn btn-sm btn-danger btn-delete-recog" data-id="${p.id}">&times;</button></td>
        `;
        recognitionList.appendChild(tr);
    });

    // Attach listeners
    document.querySelectorAll('.btn-delete-recog').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            editor.removeRecognitionPoint(id);
            renderRecognitionList();
        });
    });

    document.querySelectorAll('.recog-select').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            const p = editor.recognitionPoints.find(pt => pt.id === id);
            if (p) {
                p.selected = e.target.checked;
                editor.renderPoints(); // Re-render to show selection highlight
            }
        });
    });
}

// --- Calibration Validation ---
function validateCalibration() {
    const points = editor.locationPoints;
    
    // Requirement: At least 3 points
    // One (0,0), One (X,0), One (0,Y)
    // Actually, the prompt says: "In the validation... (One is 0,0, one is x axis vertex..., one is y axis vertex...)".
    // It says "User needs to determine at least 3 points... After determining... (check format)... Add Recognition button becomes clickable".
    
    if (points.length < 3) {
        setCalibrationStatus(false);
        return;
    }

    // Check for Origin (0,0)
    const hasOrigin = points.some(p => p.realX === 0 && p.realY === 0);
    // Check for X-Axis (x!=0, y=0)
    const hasXAxis = points.some(p => p.realX !== 0 && p.realY === 0);
    // Check for Y-Axis (x=0, y!=0)
    const hasYAxis = points.some(p => p.realX === 0 && p.realY !== 0);

    const validFormat = hasOrigin && hasXAxis && hasYAxis;

    if (validFormat) {
        // Perform Calibration
        // We need to map the img points to the real points
        // Filter to find the 3 required points to ensure order/count matches what we expect
        const origin = points.find(p => p.realX === 0 && p.realY === 0);
        const xAxis = points.find(p => p.realX !== 0 && p.realY === 0);
        const yAxis = points.find(p => p.realX === 0 && p.realY !== 0);
        
        const calibrationPoints = [origin, xAxis, yAxis];

        const imgPoints = calibrationPoints.map(p => ({x: p.x, y: p.y}));
        const realPoints = calibrationPoints.map(p => ({x: p.realX, y: p.realY}));
        
        const success = coordSys.calibrate(imgPoints, realPoints);
        setCalibrationStatus(success);
        
        if (success) {
            // Update any existing recognition points
            editor.updateRecognitionPointsCoords(coordSys);
            renderRecognitionList();
        }
    } else {
        setCalibrationStatus(false);
    }
}

function setCalibrationStatus(isValid) {
    if (isValid) {
        btnAddRecognition.disabled = false;
        btnAddRecognition.classList.remove('btn-outline-primary');
        btnAddRecognition.classList.add('btn-primary');
    } else {
        btnAddRecognition.disabled = true;
        btnAddRecognition.classList.add('btn-outline-primary');
        btnAddRecognition.classList.remove('btn-primary');
        if (editor.mode === 'recognition') {
            editor.setMode('none'); // Exit mode if calibration lost
        }
    }
}

// --- Labeling ---
selectAllCheckbox.addEventListener('change', (e) => {
    const checked = e.target.checked;
    editor.recognitionPoints.forEach(p => p.selected = checked);
    renderRecognitionList();
    editor.renderPoints();
});

btnAddLabel.addEventListener('click', () => {
    // Check if any selected
    const hasSelection = editor.recognitionPoints.some(p => p.selected);
    if (!hasSelection) {
        alert('Please select at least one point to label.');
        return;
    }
    labelInput.value = '';
    labelModal.show();
});

btnSaveLabel.addEventListener('click', () => {
    const label = labelInput.value.trim();
    if (!label) return;
    
    editor.setLabelForSelected(label);
    renderRecognitionList();
    labelModal.hide();
});

// --- Export ---
btnExportJson.addEventListener('click', () => {
    const data = {};
    // Group by label
    editor.recognitionPoints.forEach(p => {
        const lbl = p.label || 'Unlabeled';
        if (!data[lbl]) data[lbl] = [];
        data[lbl].push({ id: p.id, x: p.realX, y: p.realY });
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'points.json');
});

btnExportXml.addEventListener('click', () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<points>\n';
    
    // Group by label
    const groups = {};
    editor.recognitionPoints.forEach(p => {
        const lbl = p.label || 'Unlabeled';
        if (!groups[lbl]) groups[lbl] = [];
        groups[lbl].push(p);
    });
    
    for (const [label, points] of Object.entries(groups)) {
        xml += `  <group label="${label}">\n`;
        points.forEach(p => {
            xml += `    <point id="${p.id}" x="${p.realX}" y="${p.realY}" />\n`;
        });
        xml += `  </group>\n`;
    }
    xml += '</points>';
    
    const blob = new Blob([xml], { type: 'application/xml' });
    downloadBlob(blob, 'points.xml');
});

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Resize listener
window.addEventListener('resize', () => {
    editor.refreshPositions();
});
