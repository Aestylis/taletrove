// grid.js - A custom Leaflet grid layer using HTML5 Canvas

L.CustomGrid = L.Layer.extend({
    initialize: function (options) {
        L.setOptions(this, options);
    },

    onAdd: function (map) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'leaflet-grid-layer');

        const pane = map.getPane('overlayPane');
        pane.appendChild(this._canvas);

        map.on('viewreset move imagerotate', this._reset, this);

        this._reset();
    },

    onRemove: function (map) {
        L.DomUtil.remove(this._canvas);
        map.off('viewreset move imagerotate', this._reset, this);
    },

    updateOptions: function (newOptions) {
        L.setOptions(this, newOptions);
        this._reset();
    },

    _reset: function () {
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);

        const size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;

        this._redraw();
    },

    _redraw: function () {
        const size = this._map.getSize();
        const sizeX = this.options.sizeX || this.options.size || 50;
        const sizeY = this.options.sizeY || this.options.size || 50;
        const userOffX = this.options.offsetX || 0;
        const userOffY = this.options.offsetY || 0;
        const ctx = this._canvas.getContext('2d');

        // Clear entire canvas
        ctx.clearRect(0, 0, size.x, size.y);

        // Get the active map object for dimensions
        if (typeof state === 'undefined' || !state.activeMapId) return;
        const mapObj = state.maps.find(m => m.id === state.activeMapId);
        if (!mapObj) return;

        // Calculate map image bounds in screen (container) pixels
        const tl = this._map.latLngToContainerPoint([mapObj.height, 0]);
        const br = this._map.latLngToContainerPoint([0, mapObj.width]);

        // Only draw if the map is within or partially within the viewport
        const viewRect = { left: 0, top: 0, right: size.x, bottom: size.y };
        const mapRect = { left: tl.x, top: tl.y, right: br.x, bottom: br.y };

        if (mapRect.right < viewRect.left || mapRect.left > viewRect.right ||
            mapRect.bottom < viewRect.top || mapRect.top > viewRect.bottom) {
            return;
        }

        // Set line styles from options
        ctx.strokeStyle = this.options.color || '#ffffff';
        ctx.globalAlpha = this.options.opacity ?? 0.5;
        ctx.lineWidth = this.options.width || 1;

        ctx.save();

        const rotDeg = window.getMapImageRotationDeg?.() ?? 0;
        const rad = rotDeg * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const cx = size.x / 2;
        const cy = size.y / 2;

        // Clip to the image's actual screen-space boundary BEFORE rotating the context.
        // Clipping after rotation fails because rect(tl,br) in a rotated context produces
        // a rotated polygon whose corners extend outside the canvas; the canvas clips that
        // polygon to its own bounds, yielding the full viewport as the effective clip region.
        // Instead, rotate the 4 image corners into screen space and clip to that polygon.
        // CW rotation in screen-space (y-down): x' = ox·cos + oy·sin, y' = -ox·sin + oy·cos
        const imgCorners = [
            [tl.x, tl.y], [br.x, tl.y], [br.x, br.y], [tl.x, br.y],
        ];
        const sc = imgCorners.map(([px, py]) => {
            const ox = px - cx, oy = py - cy;
            return [cx + ox * cosA + oy * sinA, cy - ox * sinA + oy * cosA];
        });
        ctx.beginPath();
        ctx.moveTo(sc[0][0], sc[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(sc[i][0], sc[i][1]);
        ctx.closePath();
        ctx.clip();

        // Rotate the drawing context so grid lines align with the rotated image
        if (rotDeg !== 0) {
            ctx.translate(cx, cy);
            ctx.rotate(rad);
            ctx.translate(-cx, -cy);
        }

        // Get the top-left coordinate of the map layer in pixels to align grid
        const origin = this._map.getPixelOrigin();

        // Calculate the offset of the grid from the top-left of the viewport,
        // incorporating the user-defined origin offset (guaranteed positive modulo)
        const offsetX = ((origin.x - userOffX) % sizeX + sizeX) % sizeX;
        const offsetY = ((origin.y - userOffY) % sizeY + sizeY) % sizeY;

        ctx.beginPath();

        // Draw vertical lines (within viewport bounds, but clipped to map bounds)
        for (let x = -offsetX; x < size.x; x += sizeX) {
            ctx.moveTo(x, tl.y);
            ctx.lineTo(x, br.y);
        }

        // Draw horizontal lines (within viewport bounds, but clipped to map bounds)
        for (let y = -offsetY; y < size.y; y += sizeY) {
            ctx.moveTo(tl.x, y);
            ctx.lineTo(br.x, y);
        }

        ctx.stroke();
        ctx.restore();
    }
});