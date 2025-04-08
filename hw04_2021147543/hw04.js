/*-------------------------------------------------------------------------
08_Transformation.js

canvas의 중심에 한 edge의 길이가 0.3인 정사각형을 그리고, 
이를 크기 변환 (scaling), 회전 (rotation), 이동 (translation) 하는 예제임.
    T는 x, y 방향 모두 +0.5 만큼 translation
    R은 원점을 중심으로 2초당 1회전의 속도로 rotate
    S는 x, y 방향 모두 0.3배로 scale
이라 할 때, 
    keyboard 1은 TRS 순서로 적용
    keyboard 2는 TSR 순서로 적용
    keyboard 3은 RTS 순서로 적용
    keyboard 4는 RST 순서로 적용
    keyboard 5는 STR 순서로 적용
    keyboard 6은 SRT 순서로 적용
    keyboard 7은 원래 위치로 돌아옴
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let axes;
let Sun = mat4.create();
let Earth = mat4.create();
let Moon = mat4.create();
let rotationAngle = 0;
let currentTransformType = null;
let isAnimating = false;
let lastTime = 0;
let textOverlay; 

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    return true;
}

function setupBuffers() {
    const cubeVertices = new Float32Array([
        -0.5,  0.5, 0.0, // 좌상단
        -0.5, -0.5, 0.0, // 좌하단
         0.5, -0.5, 0.0, // 우하단
         0.5,  0.5, 0.0,// 우상단
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0, 2, 3     // 두 번째 삼각형
    ]);


    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // VBO for position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 3, gl.FLOAT, false, 0, 0);

    // EBO
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}


function SunMatrices() {
    mat4.identity(Sun);
    mat4.rotate(Sun, Sun, rotationAngle/4, [0, 0, 1]); //자전
    mat4.scale(Sun, Sun, [0.2, 0.2, 1]); 
}

function EarthMatrices() {
    mat4.identity(Earth);
    mat4.rotate(Earth, Earth, rotationAngle/6, [0, 0, 1]); //공전
    mat4.translate(Earth, Earth, [0.7, 0.0, 0]);
    mat4.rotate(Earth, Earth, rotationAngle, [0, 0, 1]); //자전
    mat4.scale(Earth, Earth, [0.1, 0.1, 1]); 
}

function MoonMatrices() {
    mat4.identity(Moon);
    mat4.rotate(Moon, Moon, rotationAngle/6, [0, 0, 1]); //지구공전
    mat4.translate(Moon, Moon, [0.7, 0.0, 0]);
    mat4.rotate(Moon, Moon, rotationAngle*2, [0, 0, 1]); //달공전
    mat4.translate(Moon, Moon, [0.2, 0.0, 0]);
    mat4.rotate(Moon, Moon, rotationAngle, [0, 0, 1]); //자전
    mat4.scale(Moon, Moon, [0.05, 0.05, 1]); 
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // draw axes
    axes.draw(mat4.create(), mat4.create()); 

    // draw cube
    shader.use();
    gl.bindVertexArray(vao);
    // gl.drawElements(mode, index_count, type, byte_offset);
    SunMatrices()
    shader.setMat4("u_model", Sun);
    shader.setVec4("u_color", 1.0, 0.0, 0.0, 1.0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


    EarthMatrices()
    shader.setMat4("u_model", Earth);
    shader.setVec4("u_color", 0.0, 1.0, 1.0, 1.0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


    MoonMatrices()
    shader.setMat4("u_model", Moon);
    shader.setVec4("u_color", 1.0, 1.0, 0.0, 1.0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function animate(currentTime) {

    if (!lastTime) lastTime = currentTime; // if lastTime == 0
    // deltaTime: 이전 frame에서부터의 elapsed time (in seconds)
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    
    // 2초당 1회전, 즉, 1초당 180도 회전
    rotationAngle += Math.PI * deltaTime;
    
    render();

    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        
        await initShader();

        setupBuffers();
        axes = new Axes(gl, 1.0); 

        


        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
