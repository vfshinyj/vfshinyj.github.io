/*-------------------------------------------------------------------------
06_FlipTriangle.js

1) Change the color of the triangle by keyboard input
   : 'r' for red, 'g' for green, 'b' for blue
2) Flip the triangle vertically by keyboard input 'f' 
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;   // shader program
let vao;      // vertex array object
let colorTag = "red"; // triangle 초기 color는 red
let vertexright = 0.0;
let vertexup = 0.0;

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    // Initialize WebGL settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

const keys = {};
function setupKeyboardEvents() {
    window.addEventListener('keydown', (event) => { 
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||  
            event.key === 'ArrowLeft' || event.key === 'ArrowRight') { 
            keys[event.key] = true;
        } 
    }); 
    window.addEventListener('keyup', (event) => { 
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||  
            event.key === 'ArrowLeft' || event.key === 'ArrowRight') { 
            keys[event.key] = false; 
        } 
    });
}

function updatePosition() {
    if (keys["ArrowLeft"])  vertexright -= 0.01;
    if (keys["ArrowRight"]) vertexright += 0.01;
    if (keys["ArrowUp"])    vertexup += 0.01;
    if (keys["ArrowDown"])  vertexup -= 0.01;

    vertexright = Math.max(-0.9, Math.min(vertexright, 0.9));
    vertexup = Math.max(-0.9, Math.min(vertexup, 0.9));
}

function setupBuffers() {
    // Rectangle vertices
const vertices = new Float32Array([
    -0.1, -0.1, 0.0,  // Bottom left
     0.1, -0.1, 0.0,  // Bottom right
     0.1,  0.1, 0.0,  // Top right
    -0.1,  0.1, 0.0   // Top left
]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let color;
    if (colorTag == "red") {
        color = [1.0, 0.0, 0.0, 1.0];
    }
    
    updatePosition()

    shader.setVec4("uColor", color);
    shader.setFloat("vertexright", vertexright);
    shader.setFloat("vertexup", vertexup);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(() => render());
}

async function main() {
    try {

        // WebGL 초기화
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        // 셰이더 초기화
        await initShader();

        // setup text overlay (see util.js)
        setupText(canvas, "Use arrow keys to move the rectangle", 1);

        // 키보드 이벤트 설정
        setupKeyboardEvents();
        
        // 나머지 초기화
        setupBuffers(shader);
        shader.use();
        
        // 렌더링 시작
        render();

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// call main function
main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});
