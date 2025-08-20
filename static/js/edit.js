import { Brick } from './Brick.js';
import { BrickEditor } from './BrickEditor.js';
import { EditorConfig } from './EditorConfig.js';
import { CameraSystem } from './CameraSystem.js';
import { LightingSystem } from './LightingSystem.js';
import { InteractionSystem } from './InteractionSystem.js';
import { BrickManager } from './BrickManager.js';
import { UIController } from './UIController.js';


// Initialize the editor when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.brickEditor = new BrickEditor(mode);
    });
} else {
    window.brickEditor = new BrickEditor(mode);
}

// Re-export classes for testing
export { BrickEditor, EditorConfig, CameraSystem, LightingSystem, InteractionSystem, BrickManager, UIController };
