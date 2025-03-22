#version 300 es

layout (location = 0) in vec3 aPos;

uniform float vertexright;
uniform float vertexup;

void main() {
    gl_Position = vec4(aPos[0] + vertexright, aPos[1] + vertexup, aPos[2], 1.0);
} 