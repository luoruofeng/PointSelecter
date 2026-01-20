export class ImageEditor {
    constructor(containerId, imageId, pointsLayerId) {
        this.container = document.getElementById(containerId);
        this.image = document.getElementById(imageId);
        this.pointsLayer = document.getElementById(pointsLayerId);
        
        this.locationPoints = []; // { id, x, y, realX, realY }
        this.recognitionPoints = []; // { id, x, y, realX, realY, selected, label }
        
        this.mode = 'none'; // 'location', 'recognition', 'none'
        this.nextRecogId = 1;
        
        this.onPointAdded = null; // Callback
        this.onPointSelected = null; // Callback
        this.isMultiSelectActive = false;
        
        this.image.addEventListener('click', (e) => this.handleImageClick(e));
    }

    setMode(mode) {
        this.mode = mode;
        this.container.className = ''; // Reset
        if (mode === 'location') this.container.classList.add('mode-location');
        if (mode === 'recognition') this.container.classList.add('mode-recognition');
    }

    handleImageClick(e) {
        if (this.mode === 'none') return;

        const rect = this.image.getBoundingClientRect();
        // Calculate x, y relative to the image (not viewport)
        // Note: The image might be scaled. We need coordinates relative to the actual displayed size 
        // OR the natural size.
        // Usually, for display consistency, we store percentages or relative pixels.
        // Let's store pixels relative to the current displayed size for simplicity of rendering,
        // but for robustness we should probably store relative to natural size if we want to support zoom/resize later.
        // Given the requirement "displayed image", let's use the natural size to be safe against resizing.
        
        const scaleX = this.image.naturalWidth / rect.width;
        const scaleY = this.image.naturalHeight / rect.height;

        const x_display = e.clientX - rect.left;
        const y_display = e.clientY - rect.top;

        const x_natural = x_display * scaleX;
        const y_natural = y_display * scaleY;

        if (this.mode === 'location') {
            this.addLocationPoint(x_natural, y_natural);
        } else if (this.mode === 'recognition') {
            this.addRecognitionPoint(x_natural, y_natural);
        }
    }
    

    addLocationPoint(x, y) {
        const id = Date.now().toString(); // Simple ID
        const point = { id, x, y, realX: 0, realY: 0 };
        this.locationPoints.push(point);
        this.renderPoints();
        if (this.onPointAdded) this.onPointAdded('location', point);
    }

    addRecognitionPoint(x, y) {
        const id = this.nextRecogId++;
        const point = { id, x, y, realX: 0, realY: 0, selected: false, label: '' };
        this.recognitionPoints.push(point);
        this.renderPoints();
        if (this.onPointAdded) this.onPointAdded('recognition', point);
    }

    removeLocationPoint(id) {
        this.locationPoints = this.locationPoints.filter(p => p.id !== id);
        this.renderPoints();
    }

    removeRecognitionPoint(id) {
        this.recognitionPoints = this.recognitionPoints.filter(p => p.id !== id);
        this.renderPoints();
    }
    
    removeSelectedRecognitionPoints() {
        this.recognitionPoints = this.recognitionPoints.filter(p => !p.selected);
        this.renderPoints();
    }

    updateLocationPointRealCoords(id, realX, realY) {
        const p = this.locationPoints.find(p => p.id === id);
        if (p) {
            p.realX = parseFloat(realX);
            p.realY = parseFloat(realY);
        }
    }

    updateRecognitionPointsCoords(transformer) {
        this.recognitionPoints.forEach(p => {
            const coords = transformer.transform(p.x, p.y);
            p.realX = coords.x;
            p.realY = coords.y;
        });
        // No need to re-render DOM points as position didn't change, but external UI needs update
    }

    setLabelForSelected(label) {
        this.recognitionPoints.forEach(p => {
            if (p.selected) p.label = label;
        });
        this.renderPoints(); // To show label on map if we want
    }

    renderPoints() {
        this.pointsLayer.innerHTML = '';
        const rect = this.image.getBoundingClientRect();
        const scaleX = rect.width / this.image.naturalWidth;
        const scaleY = rect.height / this.image.naturalHeight;

        // Render Location Points
        this.locationPoints.forEach((p, index) => {
            const el = document.createElement('div');
            el.className = 'point point-location';
            el.style.left = (p.x * scaleX) + 'px';
            el.style.top = (p.y * scaleY) + 'px';
            el.title = `Ref Point ${index + 1}`;
            const lab = document.createElement('div');
            lab.className = 'point-ref-label';
            lab.innerText = `Point ${index + 1}`;
            el.appendChild(lab);
            this.pointsLayer.appendChild(el);
        });

        // Render Recognition Points
        this.recognitionPoints.forEach(p => {
            const el = document.createElement('div');
            el.className = 'point point-recognition';
            if (p.selected) el.style.boxShadow = '0 0 0 4px yellow';
            el.style.left = (p.x * scaleX) + 'px';
            el.style.top = (p.y * scaleY) + 'px';
            el.dataset.id = p.id;
            el.addEventListener('click', (ev) => {
                if (ev.ctrlKey || ev.metaKey || this.isMultiSelectActive) {
                    p.selected = !p.selected;
                } else {
                    this.recognitionPoints.forEach(tp => tp.selected = false);
                    p.selected = true;
                }
                this.renderPoints();
                if (this.onPointSelected) this.onPointSelected(p);
            });
            
            if (p.label) {
                const label = document.createElement('div');
                label.className = 'point-label';
                label.innerText = p.label;
                el.appendChild(label);
            }
            const idlab = document.createElement('div');
            idlab.className = 'point-id';
            idlab.innerText = String(p.id);
            el.appendChild(idlab);
            
            this.pointsLayer.appendChild(el);
        });
    }

    // Call this on window resize
    refreshPositions() {
        this.renderPoints();
    }
}
