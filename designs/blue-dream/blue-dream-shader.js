// Minimal WebGL shader runtime for a stylized 'ray-trace-like' background
// Usage: include <canvas id="bd-shader"></canvas> and call initBlueDreamShader(canvas)
(function (global) {
  const vertexSrc = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main(){ v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position,0.,1.); }
  `;

  const fragmentSrc = `#version 300 es
  precision highp float;
  uniform vec2 u_res;
  uniform float u_time;
  out vec4 outColor;
  in vec2 v_uv;

  // helpers
  float hash(float n){ return fract(sin(n)*43758.5453); }
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }

  float noise(vec2 p){
    vec2 i=floor(p); vec2 f=fract(p);
    float a=hash(i+vec2(0.0,0.0));
    float b=hash(i+vec2(1.0,0.0));
    float c=hash(i+vec2(0.0,1.0));
    float d=hash(i+vec2(1.0,1.0));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }

  // star field by random points + twinkle
  float star(vec2 uv, float seed, float size){
    vec2 gv = fract(uv*vec2(100.0,100.0));
    vec2 id = floor(uv*vec2(100.0,100.0));
    float r = hash(id.x*17.0 + id.y*13.0 + seed);
    float sr = size * (0.5 + r);
    vec2 p = gv - vec2(0.5);
    float d = length(p);
    float glow = exp(-d*d*40.0/sr);
    // twinkle driven by global time and seed
    float t = fract(u_time*0.2 + r*5.0);
    float tw = smoothstep(0.0,0.5,abs(sin(t*6.2831)));
    return glow * (0.6 + 0.6*tw);
  }

  // fractal nebula via fbm-like sum of noise
  float fbm(vec2 p){ float s=0.0; float a=0.6; for(int i=0;i<5;i++){ s += a*noise(p); p*=2.0; a *= 0.5; } return s; }

  void main(){
    vec2 uv = v_uv;
    vec2 p = (uv - 0.5) * vec2(u_res.x/u_res.y,1.0);

    // nebula base colors
    vec3 nebA = vec3(0.14,0.18,0.38);
    vec3 nebB = vec3(0.38,0.56,1.0);
    float n = fbm(p*1.2 - u_time*0.02);
    float n2 = fbm(p*3.5 + u_time*0.03);
    float neb = smoothstep(-0.2, 0.6, n*0.9 + n2*0.6);
    vec3 nebCol = mix(nebA, nebB, neb);

    // star-dense core overlay
    float core = exp(-pow(length(p-vec2(-0.2,0.1))*1.8,2.0));
    nebCol += core*0.9*vec3(0.9,0.95,1.0);

    // many tiny stars
    float s1 = star(uv*1.0, 1.0, 0.8);
    float s2 = star(uv*1.3 + vec2(0.2,0.1), 2.0, 0.6);
    float s3 = star(uv*0.7 + vec2(0.3,0.5), 3.0, 1.2);
    float stars = clamp(s1 + s2*0.8 + s3*0.6, 0.0, 2.0);

    // bright twinkles (bigger)
    float tpos = smoothstep(0.7,0.0, length( (uv-vec2(0.68,0.26))*vec2(1.2,0.8) ));
    float bigTwinkle = exp(-pow(length(uv-vec2(0.68,0.26))*40.0,2.0)) * (0.8 + 0.6*abs(sin(u_time*1.9)));
    float bigTwinkle2 = exp(-pow(length(uv-vec2(0.15,0.75))*30.0,2.0)) * (0.6 + 0.4*abs(cos(u_time*1.5)));

    vec3 skyBase = mix(vec3(0.02,0.03,0.06), vec3(0.05,0.12,0.28), uv.y);
    vec3 final = skyBase * (1.0 - 0.6*neb) + nebCol*1.2;

    // add stars and glints
    final += vec3(1.0,0.98,0.95) * (stars*0.9 + bigTwinkle*2.4 + bigTwinkle2*1.6);

    // color grading and vignette
    float d = length((uv-0.5));
    final *= smoothstep(1.0, 0.5, d);
    final = pow(final, vec3(0.9));

    outColor = vec4(final, 1.0);
  }
  `;

  function createShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }
  function createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  function initBlueDreamShader(canvas) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) {
      console.warn("WebGL2 not available");
      return null;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    const program = createProgram(gl, vs, fs);

    const posLoc = gl.getAttribLocation(program, "a_position");
    const resLoc = gl.getUniformLocation(program, "u_res");
    const timeLoc = gl.getUniformLocation(program, "u_time");

    const q = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, q);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    let start = performance.now();
    function render() {
      resize();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, q);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
    return { gl, canvas };
  }

  global.initBlueDreamShader = initBlueDreamShader;
})(this);
