    "use strict";

    const image_drop_area = document.querySelector("#image_drop_area");
    var uploaded_image;

    function main() {
       // getImage();
        var image = new Image();
        image.src = "sunset.jpg";  // MUST BE SAME DOMAIN!!!
        image.onload = function() {
            render(image);
        }
    }

    function render(image) {
        var canvas = document.querySelector("#c");
        var gl = canvas.getContext("webgl2");
        console.log("Hello");
        var vertex_shader_src = document.getElementById("vertex-shader-2d");
        var fragment_shader_src = document.getElementById("fragment-shader-2d");

        //create shaders
        var vertex_shader = createShader(gl, gl.VERTEX_SHADER, vertex_shader_src);
        var fragment_shader = createShader(gl, gl.FRAGMENT_SHADER, fragment_shader_src);

        //create the program
        var program = createProgram(gl, vertex_shader, fragment_shader);

        //data
        var a_position_loc = gl.getAttribLocation(program,"a_position");
        var position_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,position_buffer);
        var positions = [
            350, 350,
            700,350,
            350, 700,
            350,700,
            700,350,
            700,700,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions),gl.STATIC_DRAW);

        //tell attribute how to take data out
        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.enableVertexAttribArray(a_position_loc); //enable
        //how to take it out
        var size=2; //2 components per iteration
        var type = gl.FLOAT; //i.e. data is 32 bit float
        var normalize = false;  //dont normalize the data
        var stride = 0;
        var offset = 0; //offset from start of buffer
        gl.vertexAttribPointer(a_position_loc, size, type, normalize, stride, offset);

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);


        //image and kernel related stuff
        var texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
        var imageLocation = gl.getUniformLocation(program, "u_image");
        var kernelLocation = gl.getUniformLocation(program, "u_kernel[0]");
        var kernelWeightLocation = gl.getUniformLocation(program, "u_kernelWeight");
        var kernelSizeLocation = gl.getUniformLocation(program,"u_kernelSize");
        var kernelSelfLocation = gl.getUniformLocation(program,"u_kernelSelf");
        var typeLoc = gl.getUniformLocation(program,"type");

        var widthValue = gl.getUniformLocation(program,"u_width");
        var xValue = gl.getUniformLocation(program,"u_xorigin");
        var yValue = gl.getUniformLocation(program,"u_yorigin");


        // provide texture coordinates for the rectangle.
        var texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0,  0.0,
            1.0,  0.0,
            0.0,  1.0,
            0.0,  1.0,
            1.0,  0.0,
            1.0,  1.0]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(texCoordAttributeLocation);
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            texCoordAttributeLocation, size, type, normalize, stride, offset)

        // Create a texture.
        var texture = gl.createTexture();

        // make unit 0 the active texture unit
        // (i.e, the unit all other texture commands will affect.)
        gl.activeTexture(gl.TEXTURE0 + 0);

        // Bind texture to 'texture unit '0' 2D bind point
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set the parameters so we don't need mips and so we're not filtering
        // and we don't repeat
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Upload the image into the texture.
        var mipLevel = 0;               // the largest mip
        var internalFormat = gl.RGBA;   // format we want in the texture
        var srcFormat = gl.RGBA;        // format of data we are supplying
        var srcType = gl.UNSIGNED_BYTE  // type of data we are supplying
        gl.texImage2D(gl.TEXTURE_2D,
                mipLevel,
                internalFormat,
                image.width,
                image.height,
                0,
                srcFormat,
                srcType,
                image);

        //use our shader program
        gl.useProgram(program);
        gl.bindVertexArray(vao);

        var resolution_loc = gl.getUniformLocation(program,"u_resolution");
        gl.uniform2f(resolution_loc, gl.canvas.width, gl.canvas.height);
        console.log(gl.canvas.width+" "+gl.canvas.height);


        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(imageLocation, 0);


        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);

        // Set a rectangle equal to size you want it displayed on the canvas.
        setRectangle(gl, 0, 0, 600, 600*image.height/image.width);

        gl.uniform1f(kernelWeightLocation, 1);
        gl.uniform1i(kernelSizeLocation, 1);
        gl.uniform1i(kernelSelfLocation,0);

        var kernelType = 0;

        var kernelSizeSlider = document.querySelector('#kernelSlider');
        kernelSizeSlider.addEventListener('input',() => change_mode(-1), false);
        var widthSlider = document.querySelector('#widthSlider');
        widthSlider.addEventListener('input',() => change_mode(-1), false);
        var xSlider = document.querySelector('#xSlider');
        xSlider.addEventListener('input',() => change_mode(-1), false);
        var ySlider = document.querySelector('#ySlider');
        ySlider.addEventListener('input',() => change_mode(-1), false);

        var radios = document.querySelectorAll('input[type=radio][name="hist_rb"]');
        //based on what radio button is selected, change the histogram mode to be applied to the image
        //so everytime you make change to the radio button, an event will be generatd which will call
        //the change_mode function
        radios.forEach(radio => radio.addEventListener('change', () => change_mode(radio.value)));


        function change_mode(n) {
            if (n==-1)
                n = kernelType;
            else
                kernelType = n;
            gl.uniform1i(kernelSelfLocation,0);

            var p = widthSlider.value / 800.0;
            var x = xSlider.value / 100.0;
            var y = ySlider.value / 100.0;
            gl.uniform1f(widthValue, p);
            gl.uniform1f(xValue, x);
            gl.uniform1f(yValue, y);

            var s = kernelSizeSlider.value;
            var tmp_kernel = [];
            for(var i=0; i<s*s; i++) {
                tmp_kernel.push(1.0/(s*s));
            }
            gl.uniform1fv(kernelLocation, tmp_kernel);
            gl.uniform1f(kernelWeightLocation, 1.0);
            gl.uniform1i(kernelSizeLocation, s);

            if (n==0)
            {
                gl.uniform1i(typeLoc,0);
            }
            else if (n==1)
            {
                gl.uniform1i(typeLoc,1);
            }
            else if (n==2)
            {
                gl.uniform1i(typeLoc,2);
            }
            else if (n == 3)
            {
                gl.uniform1i(typeLoc,3);
            }
            else if (n == 4)
            {
                gl.uniform1i(typeLoc,4);
            }
            else if (n == 5)
            {
                gl.uniform1i(typeLoc,5);
            }
            else
            {
                gl.uniform1i(typeLoc,6);
            }
            webglUtils.resizeCanvasToDisplaySize(gl.canvas);

            // Clear the canvas
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);


            gl.drawArrays(primitiveType, offset, count);

        }

        // Event listener for dragging the image over the div
        image_drop_area.addEventListener('dragover', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Style the drag-and-drop as a "copy file" operation.
            event.dataTransfer.dropEffect = 'copy';
        });

        // Event listener for dropping the image inside the div
        image_drop_area.addEventListener('drop', (event) => {
            event.stopPropagation();
            event.preventDefault();
            FileList = event.dataTransfer.files;
            readImage(FileList[0]);
            // render(FileList[0].image);

        });

        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        change_mode(0);
        gl.drawArrays(primitiveType, offset, count);

    }


    //if you want to change the scale of your image, change width, height being passed to this function
    function setRectangle(gl, x, y, width, height) {
        var x1 = 225;  //x1 -> x of pixel location of top right corner
        var x2 = x1 + width;
        var y1 = 75;  //y1 -> y of pixel location of top right corner
        var y2 = y1 + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2,
        ]), gl.STATIC_DRAW);
    }

    function createShader(gl, type, source1) {
        var shader = gl.createShader(type);
        var source = source1.text;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }
        else
            console.log("NOPE");
        gl.deleteShader(shader);
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }

        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    function readImage(file){
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            uploaded_image = new Image();
            uploaded_image.src = event.target.result;
            uploaded_image.onload = function() {
                render(uploaded_image);
            }
            document.querySelector("#image_drop_area").style.backgroundImage = `url(${uploaded_image.src})`;
        });
        reader.readAsDataURL(file);
    }




    main();