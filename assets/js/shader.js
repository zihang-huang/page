(() => {
  const canvas = document.createElement("canvas");
  canvas.className = "shader-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
    stencil: false,
  });

  if (!gl) {
    canvas.remove();
    return;
  }

  const vertexSource = `
    attribute vec2 aPosition;

    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uTime;

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = uv - 0.5;
      p.x *= uResolution.x / uResolution.y;

      vec2 pointer = uPointer - 0.5;
      pointer.x *= uResolution.x / uResolution.y;

      float d = length(p - pointer);
      float ring = sin((d * 44.0) - (uTime * 2.0));
      float ink = step(0.965, ring);

      vec3 blue = vec3(0.0, 0.235, 1.0);
      vec3 white = vec3(1.0);
      vec3 color = ink > 0.5 ? white : blue;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    canvas.remove();
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    canvas.remove();
    return;
  }

  const positionLocation = gl.getAttribLocation(program, "aPosition");
  const resolutionLocation = gl.getUniformLocation(program, "uResolution");
  const pointerLocation = gl.getUniformLocation(program, "uPointer");
  const timeLocation = gl.getUniformLocation(program, "uTime");

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const pointer = { x: 0.18, y: 0.82 };
  const target = { x: pointer.x, y: pointer.y };
  let width = 0;
  let height = 0;
  let frame = 0;

  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    width = Math.floor(window.innerWidth * pixelRatio);
    height = Math.floor(window.innerHeight * pixelRatio);
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  };

  const updatePointer = (event) => {
    const touch = event.touches && event.touches[0];
    const x = touch ? touch.clientX : event.clientX;
    const y = touch ? touch.clientY : event.clientY;

    target.x = x / window.innerWidth;
    target.y = 1 - y / window.innerHeight;
  };

  const render = (time) => {
    pointer.x += (target.x - pointer.x) * 0.08;
    pointer.y += (target.y - pointer.y) * 0.08;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolutionLocation, width, height);
    gl.uniform2f(pointerLocation, pointer.x, pointer.y);
    gl.uniform1f(timeLocation, time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    frame = window.requestAnimationFrame(render);
  };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("touchmove", updatePointer, { passive: true });

  resize();
  frame = window.requestAnimationFrame(render);

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(frame);
  });
})();
