// side‑only Cone (open base) — base radius 0.5, height 1 (apex y=+0.5, base y=-0.5)

export class Cone {
    constructor(gl, segments = 32, options = {}) {
        this.gl = gl;
        this.segments = segments;

        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        const r = 0.5, apexY = 0.5, baseY = -0.5;
        const angleStep = 2 * Math.PI / segments;
        const col = options.color || [0.8, 0.8, 0.8, 1];

        const pos = [], nor = [], colArr = [], uv = [], idx = [];

        // build each side triangle independently (flat shading friendly)
        for (let i = 0; i < segments; ++i) {
            const a0 = i * angleStep, a1 = (i + 1) * angleStep;

            // positions CCW (outside view)
            const ax = 0, ay = apexY, az = 0;
            const bx = r * Math.cos(a1), by = baseY, bz = r * Math.sin(a1);
            const cx = r * Math.cos(a0), cy = baseY, cz = r * Math.sin(a0);

            pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);

            // smooth normals (unit outward normals for a right circular cone)
            // For a side vertex at (x,y,z) with radius r and height h,
            // the normal direction is (x/r, r/h, z/r)
            const h = apexY - baseY;                // cone height (1.0)
            const nA = [0, 1, 0];                   // apex normal (axis direction)
            const nB = normalize([bx / r, r / h, bz / r]);
            const nC = normalize([cx / r, r / h, cz / r]);
            nor.push(...nA, ...nB, ...nC);

            // colours
            colArr.push(...col, ...col, ...col);

            // textured u by angle, v by y
            const u0 = i / segments, u1 = (i + 1) / segments;
            uv.push((u0 + u1) * 0.5, 1, u1, 0, u0, 0);

            const base = i * 3;
            idx.push(base, base + 1, base + 2);
        }

        this.vertices = new Float32Array(pos);
        this.smoothNormals = new Float32Array(nor);
        this.colors = new Float32Array(colArr);
        this.texCoords = new Float32Array(uv);
        this.indices = new Uint16Array(idx);

        // flat normals
        this.faceNormals = new Float32Array(nor.length);
        for (let i = 0; i < idx.length; i += 3) {
            const ia = idx[i] * 3, ib = idx[i + 1] * 3, ic = idx[i + 2] * 3;
            const A = pos.slice(ia, ia + 3), B = pos.slice(ib, ib + 3), C = pos.slice(ic, ic + 3);
            const n = normalize(cross(sub(B, A), sub(C, A)));
            [ia, ib, ic].forEach(k => {
                this.faceNormals[k] = n[0]; this.faceNormals[k + 1] = n[1]; this.faceNormals[k + 2] = n[2];
            });
        }

        this.normals = new Float32Array(this.smoothNormals); // active buffer
        this.initBuffers();
    }

    /* ---------- public: keyboard hooks ---------- */
    copyVertexNormalsToNormals() { this.normals.set(this.smoothNormals); this.updateNormals(); }
    copyFaceNormalsToNormals() { this.normals.set(this.faceNormals); this.updateNormals(); }

    updateNormals() {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        const vSize = this.vertices.byteLength;
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bindVertexArray(null);
    }

    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo); gl.deleteBuffer(this.ebo); gl.deleteVertexArray(this.vao);
    }

    initBuffers() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength, nSize = this.normals.byteLength,
            cSize = this.colors.byteLength, tSize = this.texCoords.byteLength,
            total = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, total, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
        gl.bindVertexArray(null);
    }
}

/* ---- tiny vec helpers ---- */
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(u, v) { return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; }
function normalize(v) { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }