// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context
gl.enable(gl.SCISSOR_TEST);

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// Set canvas size: 현재 window 전체를 canvas로 사용
canvas.width = 500;
canvas.height = 500;

// Initialize WebGL settings: viewport and clear color
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.1, 0.2, 0.3, 1.0);

// Start rendering
render();

// Render loop
function render() {
    
    // Draw something here

    const halfwidth = canvas.width / 2;
    const halfheight = canvas.height / 2;

    gl.viewport(0, halfheight, halfwidth, halfheight);
    gl.scissor(0, halfheight, halfwidth, halfheight);
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(halfwidth, halfheight, halfwidth, halfheight);
    gl.scissor(halfwidth, halfheight, halfwidth, halfheight);
    gl.clearColor(0, 1, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, halfwidth, halfheight);
    gl.scissor(0, 0, halfwidth, halfheight);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(halfwidth, 0, halfwidth, halfheight);
    gl.scissor(halfwidth, 0, halfwidth, halfheight);
    gl.clearColor(1, 1, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Resize viewport when window size changes
window.addEventListener('resize', () => {
    var min;
    if (window.innerWidth > window.innerHeight){
        min = window.innerHeight;
    }
    else{
        min = window.innerWidth;
    }
    canvas.width = min;
    canvas.height = min;
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();
});

