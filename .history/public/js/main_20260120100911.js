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
const btnColorRecognition = document.getElementById('btn-color-recognition');
const btnAddLabel = document.getElementById('btn-add-label');
const btnSaveLabel = document.getElementById('btn-save-label');
const btnExportJson = document.getElementById('btn-export-json');
const btnExportXml = document.getElementById('btn-export-xml');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnDeleteSelected = document.getElementById('btn-delete-selected');

const locationList = document.getElementById('location-points-list');
const recognitionList = document.getElementById('recognition-points-list');
const selectAllCheckbox = document.getElementById('select-all-points');

// Modal
const labelModal = new bootstrap.Modal(document.getElementById('labelModal'));
const labelInput = document.getElementById('label-input');
const colorModal = new bootstrap.Modal(document.getElementById('colorModal'));
const colorsList = document.getElementById('colors-list');
const densityRange = document.getElementById('density-range');
const densityValue = document.getElementById('density-value');
const btnApplyColors = document.getElementById('btn-apply-colors');

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

// Color recognition modal open
btnColorRecognition.addEventListener('click', async () => {
    await prepareColorModal();
    colorModal.show();
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

editor.onPointSelected = () => {
    renderRecognitionList();
    updateSelectAllCheckbox();
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
    updateSelectAllCheckbox();
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
        btnColorRecognition.disabled = false;
        btnColorRecognition.classList.remove('btn-outline-secondary');
        btnColorRecognition.classList.add('btn-secondary');
    } else {
        btnAddRecognition.disabled = true;
        btnAddRecognition.classList.add('btn-outline-primary');
        btnAddRecognition.classList.remove('btn-primary');
        btnColorRecognition.disabled = true;
        btnColorRecognition.classList.add('btn-outline-secondary');
        btnColorRecognition.classList.remove('btn-secondary');
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

btnDeleteSelected.addEventListener('click', () => {
    deleteSelected();
});

function deleteSelected() {
    const hasSelection = editor.recognitionPoints.some(p => p.selected);
    if (!hasSelection) return;
    editor.removeSelectedRecognitionPoints();
    renderRecognitionList();
    updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
    if (!editor.recognitionPoints.length) {
        selectAllCheckbox.checked = false;
        return;
    }
    const allSelected = editor.recognitionPoints.every(p => p.selected);
    selectAllCheckbox.checked = allSelected;
}

btnAddLabel.addEventListener('click', () => {
    // Check if any selected
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

// --- Color Recognition ---
densityRange.addEventListener('input', () => {
    densityValue.innerText = densityRange.value;
});

async function prepareColorModal() {
    const palette = await computePaletteFromImage(10, 4);
    renderColorsList(palette);
    densityValue.innerText = densityRange.value;
}

function renderColorsList(palette) {
    colorsList.innerHTML = '';
    palette.forEach((c, idx) => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4';
        const colorStr = `rgb(${c.r}, ${c.g}, ${c.b})`;
        col.innerHTML = `
            <div class="form-check d-flex align-items-center gap-2">
                <input class="form-check-input color-choice" type="checkbox" id="color-${idx}"
                    data-r="${c.r}" data-g="${c.g}" data-b="${c.b}">
                <label class="form-check-label" for="color-${idx}">
                    <span class="d-inline-block" style="width:20px;height:20px;border:1px solid #ddd;border-radius:4px;background:${colorStr};vertical-align:middle;"></span>
                    <span class="ms-2 small text-muted">${colorStr}</span>
                </label>
            </div>
        `;
        colorsList.appendChild(col);
    });
}

btnApplyColors.addEventListener('click', async () => {
    const selected = Array.from(document.querySelectorAll('.color-choice'))
        .filter(inp => inp.checked)
        .map(inp => ({
            r: parseInt(inp.getAttribute('data-r'), 10),
            g: parseInt(inp.getAttribute('data-g'), 10),
            b: parseInt(inp.getAttribute('data-b'), 10)
        }));
    if (!selected.length) {
        alert('请至少勾选一个颜色。');
        return;
    }
    const density = parseInt(densityRange.value, 10);
    await addPointsForColors(selected, density);
    renderRecognitionList();
    colorModal.hide();
});

async function computePaletteFromImage(maxColors = 8, sampleStride = 4) {
    // Draw image to canvas at natural size
    const img = targetImage;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return [];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const counts = new Map();
    for (let y = 0; y < h; y += sampleStride) {
        for (let x = 0; x < w; x += sampleStride) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Quantize to 4 bits per channel
            const rq = r >> 4, gq = g >> 4, bq = b >> 4;
            const key = (rq << 8) | (gq << 4) | bq;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    // Sort bins by frequency
    const bins = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const palette = [];
    const distinctThreshold = 40; // distance threshold to keep colors distinct
    for (const [key] of bins) {
        const rq = (key >> 8) & 0xF;
        const gq = (key >> 4) & 0xF;
        const bq = key & 0xF;
        const c = {
            r: rq * 16 + 8,
            g: gq * 16 + 8,
            b: bq * 16 + 8
        };
        if (palette.every(pc => colorDistance(pc, c) >= distinctThreshold)) {
            palette.push(c);
            if (palette.length >= maxColors) break;
        }
    }
    return palette;
}

function colorDistance(c1, c2) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function addPointsForColors(colors, density = 5) {
    const img = targetImage;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const step = Math.max(2, 22 - density * 2); // 1..10 -> 20..2
    const tolerance = 40; // fixed RGB distance tolerance
    const maxPoints = 4000;
    let added = 0;

    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const match = colors.some(c => {
                const d = Math.sqrt((r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2);
                return d <= tolerance;
            });
            if (match) {
                editor.addRecognitionPoint(x, y);
                added++;
                if (added >= maxPoints) return;
            }
        }
    }
}

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
btnExportCsv.addEventListener('click', () => {
    const header = 'id,label,x,y\r\n';
    let rows = '';
    editor.recognitionPoints.forEach(p => {
        const id = String(p.id);
        const label = (p.label || '').replace(/"/g, '""');
        const x = String(p.realX);
        const y = String(p.realY);
        rows += `"${id}","${label}","${x}","${y}"\r\n`;
    });
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'points.csv');
});

btnExportExcel.addEventListener('click', () => {
    let html = '<html><head><meta charset="UTF-8"></head><body>';
    html += '<table border="1"><thead><tr><th>id</th><th>label</th><th>x</th><th>y</th></tr></thead><tbody>';
    editor.recognitionPoints.forEach(p => {
        const id = String(p.id);
        const label = (p.label || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const x = String(p.realX);
        const y = String(p.realY);
        html += `<tr><td>${id}</td><td>${label}</td><td>${x}</td><td>${y}</td></tr>`;
    });
    html += '</tbody></table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    downloadBlob(blob, 'points.xls');
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

document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const key = e.key.toLowerCase();
    if (key === 'p') {
        if (!btnAddRecognition.disabled) btnAddRecognition.click();
    } else if (key === 'd') {
        deleteSelected();
    } else if (key === 'a') {
        btnAddLabel.click();
    } else if (key === 'c') {
        editor.isMultiSelectActive = true;
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'c') {
        editor.isMultiSelectActive = false;
    }
});
