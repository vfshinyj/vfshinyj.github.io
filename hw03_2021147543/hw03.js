/*-------------------------------------------------------------------------
07_LineSegments.js

left mouse button을 click하면 선분을 그리기 시작하고, 
button up을 하지 않은 상태로 마우스를 움직이면 임시 선분을 그리고, 
button up을 하면 최종 선분을 저장하고 임시 선분을 삭제함.

임시 선분의 color는 회색이고, 최종 선분의 color는 빨간색임.

이 과정을 반복하여 여러 개의 선분 (line segment)을 그릴 수 있음. 
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
let isInitialized = false; // global variable로 event listener가 등록되었는지 확인
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let positionBuffer;
let isDrawing = false;
let startPoint = null;
let tempEndPoint = null;
let lines = [];
let center = null;
let radius;
let textOverlay;
let textOverlay2;
let textOverlay3;
let axes = new Axes(gl, 0.85);
let intersections = [];

// DOMContentLoaded event
// 1) 모든 HTML 문서가 완전히 load되고 parsing된 후 발생
// 2) 모든 resource (images, css, js 등) 가 완전히 load된 후 발생
// 3) 모든 DOM 요소가 생성된 후 발생
// DOM: Document Object Model로 HTML의 tree 구조로 표현되는 object model 
// 모든 code를 이 listener 안에 넣는 것은 mouse click event를 원활하게 처리하기 위해서임
// mouse input을 사용할 때 이와 같이 main을 call 한다. 

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) { // true인 경우는 main이 이미 실행되었다는 뜻이므로 다시 실행하지 않음
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
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
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
// 캔버스 좌표: 캔버스 좌측 상단이 (0, 0), 우측 하단이 (canvas.width, canvas.height)
// WebGL 좌표 (NDC): 캔버스 좌측 하단이 (-1, -1), 우측 상단이 (1, 1)
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

/* 
    browser window
    +----------------------------------------+
    | toolbar, address bar, etc.             |
    +----------------------------------------+
    | browser viewport (컨텐츠 표시 영역)       | 
    | +------------------------------------+ |
    | |                                    | |
    | |    canvas                          | |
    | |    +----------------+              | |
    | |    |                |              | |
    | |    |      *         |              | |
    | |    |                |              | |
    | |    +----------------+              | |
    | |                                    | |
    | +------------------------------------+ |
    +----------------------------------------+

    *: mouse click position

    event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
    event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
    rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
    rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

    x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
    y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소로 전파되지 않도록 방지

        if (center !== null && lines.length > 0) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (!isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중이 아닌 경우
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true; // 이제 mouse button을 놓을 때까지 계속 true로 둠. 
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY];
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {

            // lines.push([...startPoint, ...tempEndPoint])
            //   : startPoint와 tempEndPoint를 펼쳐서 하나의 array로 합친 후 lines에 추가
            // ex) lines = [] 이고 startPoint = [1, 2], tempEndPoint = [3, 4] 이면,
            //     lines = [[1, 2, 3, 4]] 이 됨
            // ex) lines = [[1, 2, 3, 4]] 이고 startPoint = [5, 6], tempEndPoint = [7, 8] 이면,
            //     lines = [[1, 2, 3, 4], [5, 6, 7, 8]] 이 됨
            if (center == null){
                center = startPoint;
                radius = Math.sqrt((tempEndPoint[0]-center[0])**2 + (tempEndPoint[1]-center[1])**2);
                updateText(textOverlay, "Circle: center (" + center[0].toFixed(2) + ", " + center[1].toFixed(2) + 
                    ")" + " radius = " + radius.toFixed(2));
            }
            else{
                lines.push([...startPoint, ...tempEndPoint]); 

            if (lines.length == 1) {
                updateText(textOverlay2, "Line segment: (" + lines[0][0].toFixed(2) + ", " + lines[0][1].toFixed(2) + 
                    ") ~ (" + lines[0][2].toFixed(2) + ", " + lines[0][3].toFixed(2) + ")");
                findintersection();
            }
            }

            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

function findintersection() {
    const cx = center[0], cy = center[1];
    const x1 = lines[0][0], y1 = lines[0][1];
    const x2 = lines[0][2], y2 = lines[0][3];

    const dx = x2 - x1;
    const dy = y2 - y1;

    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (x1 - cx) + dy * (y1 - cy));
    const c = (x1 - cx) ** 2 + (y1 - cy) ** 2 - radius * radius;

    const discriminant = b * b - 4 * a * c;

    if (Math.abs(discriminant) < 1e-6) {
        const t = -b / (2 * a);
        if (0 <= t && t <= 1 && -1 <= x1 + t * dx && x1 + t * dx <= 1 && -1 <= y1 + t * dy && y1 + t * dy <= 1) {
            intersections.push([x1 + t * dx, y1 + t * dy]);
        }
        updateText(textOverlay3, "Intersection Points: " + lines[0][0].toFixed(2) + ", ");
    }
    else if(discriminant > 0){
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b + sqrtDisc) / (2 * a);
        const t2 = (-b - sqrtDisc) / (2 * a);
        if (0 <= t1 && t1 <= 1 && -1 <= x1 + t1 * dx && x1 + t1 * dx <= 1 && -1 <= y1 + t1 * dy && y1 + t1 * dy <= 1) {
            intersections.push([x1 + t1 * dx, y1 + t1 * dy]);
        }
        if (0 <= t2 && t2 <= 1 && -1 <= x1 + t2 * dx && x1 + t2 * dx <= 1 && -1 <= y1 + t2 * dy && y1 + t2 * dy <= 1) {
            intersections.push([x1 + t2 * dx, y1 + t2 * dy]);
        }
    }
    if(intersections.length == 0){
        updateText(textOverlay3, "No intersection");
    }
    else if(intersections.length == 1){
        updateText(textOverlay3, "Intersection Points: " + intersections.length + " Point 1 (" + intersections[0][0].toFixed(2) + "," + intersections[0][1].toFixed(2) + ")");
    }
    else if(intersections.length == 2){
        updateText(textOverlay3, "Intersection Points: " + intersections.length + " Point 1 (" + intersections[0][0].toFixed(2) + "," + intersections[0][1].toFixed(2) + ") Point 2 ("
        + intersections[1][0].toFixed(2) + "," + intersections[1][1].toFixed(2) + ")");
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.use();

    const numSegments = 120;
    if (center === null && isDrawing && startPoint && tempEndPoint) {
        // 임시 원의 반지름을 startPoint와 tempEndPoint 사이의 거리로 계산
        const tempRadius = Math.sqrt(
            (tempEndPoint[0] - startPoint[0]) ** 2 +
            (tempEndPoint[1] - startPoint[1]) ** 2
        );
        let tempCircleVertices = [];
        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * 2 * Math.PI;
            const x = startPoint[0] + tempRadius * Math.cos(angle);
            const y = startPoint[1] + tempRadius * Math.sin(angle);
            tempCircleVertices.push(x, y);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tempCircleVertices), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
        gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
    }


    // 원그리기
    if (center && radius) {
        let circleVertices = [];
        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * 2 * Math.PI;
            const x = center[0] + radius * Math.cos(angle);
            const y = center[1] + radius * Math.sin(angle);
            circleVertices.push(x, y);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        // 보라색: [1.0, 0.0, 1.0, 1.0]
        shader.setVec4("u_color", [1.0, 0.0, 1.0, 1.0]);
        gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
    }

    // 원그린후 선분
    if (center) {
        let num = 0;
        for (let line of lines) {
            if (num === 0) {
                shader.setVec4("u_color", [0.0, 0.0, 1.0, 1.0]); // 첫 번째 선분은 노란색
            }
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
            num++;
        }
    }

    // 선분 임시 그리기: 선분 그리기 모드에서 마우스가 눌려있는 동안
    if (center && isDrawing && startPoint && tempEndPoint) {
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
    }
    
    //교점 나타내기기
    if (intersections.length > 0) {
        // intersections 배열을 평탄화: [x1, y1, x2, y2, ...]
        const flatIntersections = intersections.reduce((acc, pt) => acc.concat(pt), []);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatIntersections), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);  // 예: 노란색으로 교점 표시
        // 점을 그릴 개수는 intersections 배열의 길이와 같음
        gl.drawArrays(gl.POINTS, 0, intersections.length);
    }

    // axes 그리기
    axes.draw(mat4.create(), mat4.create());
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
            return false; 
        }

        // 셰이더 초기화
        await initShader();
        
        // 나머지 초기화
        setupBuffers();
        shader.use();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);
        
        // 마우스 이벤트 설정
        setupMouseEvents();
        
        // 초기 렌더링
        render();

        return true;
        
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
