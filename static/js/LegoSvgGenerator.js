/**
 * LEGO SVG Generator - Creates SVG representations of LEGO bricks
 */
export class LegoSvgGenerator {
    /**
     * Generate SVG string for a LEGO brick in 3D perspective
     * @param {number} width - Width in studs
     * @param {number} height - Height in studs  
     * @param {string} color - CSS color value
     * @param {number} scale - Scale factor for sizing
     * @returns {string} SVG string
     */
    static generateBrick(width, height, color = '#ffff00', scale = 1) {
        const unitSize = 20 * scale;  // Size per stud unit
        const brickHeight = 12 * scale;  // Brick thickness
        const studRadius = 4 * scale;   // Stud radius
        const depthOffset = 8 * scale;  // 3D depth offset
        const heightOffset = 6 * scale; // 3D height offset
        
        // Calculate total dimensions
        const totalWidth = width * unitSize + depthOffset;
        const totalHeight = height * unitSize + heightOffset + brickHeight;
        
        // Calculate canvas size with padding
        const padding = 4 * scale;
        const canvasWidth = totalWidth + (padding * 2);
        const canvasHeight = totalHeight + (padding * 2);
        
        let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`;
        
        // Define colors for different faces
        const baseColor = color;
        const darkerColor = this.darkenColor(color, 0.3);
        const lighterColor = this.lightenColor(color, 0.2);
        
        // Starting position - brick bottom front corner
        const startX = padding;
        const startY = padding + heightOffset + brickHeight;
        
        // Front face
        svg += `<rect x="${startX}" y="${startY - brickHeight}" width="${width * unitSize}" height="${brickHeight}" fill="${baseColor}" stroke="#333" stroke-width="${scale}"/>`;
        
        // Right face (depth face)
        const rightPoints = [
            [startX + width * unitSize, startY - brickHeight],
            [startX + width * unitSize + depthOffset, startY - brickHeight - heightOffset],
            [startX + width * unitSize + depthOffset, startY - heightOffset],
            [startX + width * unitSize, startY]
        ];
        svg += `<polygon points="${rightPoints.map(p => p.join(',')).join(' ')}" fill="${darkerColor}" stroke="#333" stroke-width="${scale}"/>`;
        
        // Top face (parallelogram) - this is where studs go
        const topPoints = [
            [startX, startY - brickHeight],
            [startX + width * unitSize, startY - brickHeight],
            [startX + width * unitSize + depthOffset, startY - brickHeight - heightOffset],
            [startX + depthOffset, startY - brickHeight - heightOffset]
        ];
        svg += `<polygon points="${topPoints.map(p => p.join(',')).join(' ')}" fill="${lighterColor}" stroke="#333" stroke-width="${scale}"/>`;
        
        // Generate studs on top face
        for (let w = 0; w < width; w++) {
            for (let h = 0; h < height; h++) {
                // Position studs on the top face parallelogram
                const studBaseX = startX + (w + 0.5) * unitSize + (h + 0.5) * (depthOffset / height);
                const studBaseY = startY - brickHeight - (h + 0.5) * (heightOffset / height);
                
                // Stud cylinder (ellipse for 3D effect)
                svg += `<ellipse cx="${studBaseX}" cy="${studBaseY}" rx="${studRadius}" ry="${studRadius * 0.6}" fill="${lighterColor}" stroke="#333" stroke-width="${scale * 0.8}"/>`;
                
                // Stud top (smaller ellipse)
                svg += `<ellipse cx="${studBaseX}" cy="${studBaseY - studRadius * 0.4}" rx="${studRadius * 0.8}" ry="${studRadius * 0.4}" fill="${this.lightenColor(color, 0.4)}" stroke="#333" stroke-width="${scale * 0.5}"/>`;
            }
        }
        
        svg += `</svg>`;
        return svg;
    }
    
    /**
     * Darken a color by a percentage
     * @param {string} color - CSS color string
     * @param {number} percent - Percentage to darken (0-1)
     * @returns {string} Darkened color
     */
    static darkenColor(color, percent) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0,2), 16) * (1 - percent));
        const g = Math.max(0, parseInt(hex.substr(2,2), 16) * (1 - percent));
        const b = Math.max(0, parseInt(hex.substr(4,2), 16) * (1 - percent));
        return `#${Math.round(r).toString(16).padStart(2,'0')}${Math.round(g).toString(16).padStart(2,'0')}${Math.round(b).toString(16).padStart(2,'0')}`;
    }
    
    /**
     * Lighten a color by a percentage
     * @param {string} color - CSS color string
     * @param {number} percent - Percentage to lighten (0-1)
     * @returns {string} Lightened color
     */
    static lightenColor(color, percent) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0,2), 16) + (255 - parseInt(hex.substr(0,2), 16)) * percent);
        const g = Math.min(255, parseInt(hex.substr(2,2), 16) + (255 - parseInt(hex.substr(2,2), 16)) * percent);
        const b = Math.min(255, parseInt(hex.substr(4,2), 16) + (255 - parseInt(hex.substr(4,2), 16)) * percent);
        return `#${Math.round(r).toString(16).padStart(2,'0')}${Math.round(g).toString(16).padStart(2,'0')}${Math.round(b).toString(16).padStart(2,'0')}`;
    }

    /**
     * Generate data URL for a LEGO brick SVG
     * @param {number} width - Width in studs
     * @param {number} height - Height in studs
     * @param {string} color - CSS color value
     * @param {number} scale - Scale factor for sizing
     * @returns {string} Data URL
     */
    static generateBrickDataUrl(width, height, color = '#ffff00', scale = 1) {
        const svg = this.generateBrick(width, height, color, scale);
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    /**
     * Convert hex color number to CSS color string
     * @param {number} hexColor - Hex color number (e.g., 0xffff00)
     * @returns {string} CSS color string (e.g., "#ffff00")
     */
    static hexToCSS(hexColor) {
        return `#${hexColor.toString(16).padStart(6, '0')}`;
    }
}