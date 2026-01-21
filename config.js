/* Academic Wheel of Privilege Visualisation Configuration */
/* Licence: CC-BY-NC-4.0 per FORRT AWOP license */

// Configuration constants
const CFG = {
    // Animation
    LERP: 0.1,
    FLOAT_SPEED: 0.0004,
    FLOAT_AMPLITUDE: 0.05,

    // Scales
    DEFAULT_SCALE: 1,
    SELECTED_SCALE: 1.3,
    DRAG_SCALE: 1.3,
    DESELECTED_SCALE: 0.5,

    // Opacity
    SELECTED_OPACITY: 1.0,
    ACTIVE_OPACITY: 0.9,
    DESELECTED_OPACITY: 0.3,

    // Labels / canvas
    LABEL_CANVAS_W: 512,
    LABEL_CANVAS_H: 80,
    STATUS_CANVAS_H: 64,
    LABEL_FONT_SIZE: 32,
    NAME_LABEL_OFFSET_Y: -0.1,
    STATUS_LABEL_OFFSET_Y: 0.75,
    NAME_LABEL_SCALE: { x: 5, y: 0.8 },
    STATUS_LABEL_SCALE: { x: 4, y: 0.5 },

    // Camera
    CAMERA_Z_SMALL: 28,
    CAMERA_Z_MEDIUM: 24,
    CAMERA_Z_LARGE: 18,
    CAMERA_Z_MIN: 8,
    CAMERA_Z_MAX: 30,

    // Visuals
    GLOW_OPACITY: 0.2,
    GLOW_HIGHLIGHT_OPACITY: 0.4,

    // Geometry and interaction defaults
    RING_TUBE: 0.05,
    RING_RADIAL_SEGMENTS: 16,
    RING_TUBULAR_SEGMENTS: 100,
    BUBBLE_RADIUS: 0.45,
    BUBBLE_SEGMENTS: { width: 32, height: 32 },
    GLOW_RADIUS: 0.5,
    GLOW_SEGMENTS: { width: 32, height: 32 },
    RING_PADDING: 1,

    // Interaction tuning
    ROTATION_DAMPING: 0.95,
    ROTATION_SENSITIVITY: 0.005,
    ZOOM_SENSITIVITY: 0.01,
    HOVER_SCALE: 1.2,

    // Camera params
    CAMERA_FOV: 60,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
    INIT_ROT_X: Math.PI - Math.PI / 8,

    // Auto-rotation thresholds
    AUTO_ROTATE_THRESHOLD: 0.001,
    AUTO_ROTATE_AMOUNT: 0.0005,

    // Projection Z used when converting mouse to world coordinates
    PROJECTION_Z: 0.5,

    // Mobile-specific settings
    MOBILE_PANEL_OFFSET_Y: 5,  // How much to move wheel up when panel opens
    TOUCH_ZOOM_SENSITIVITY: 0.03,
    TOUCH_ROTATION_SENSITIVITY: 0.008,

    // Touch gesture thresholds
    TOUCH_THRESHOLDS: {
        TAP_MAX_DISTANCE: 10,
        SWIPE_MIN_DISTANCE: 50,
        SWIPE_ASPECT_RATIO: 1.5
    },

    // Mobile layout constants
    MOBILE_LAYOUT: {
        CATEGORY_BAR_HEIGHT: 68,
        GRAB_BAR_TOUCH_TOLERANCE: 10
    }
};
