"use strict";

var container, camera, scene, renderer, controls;

var Util = {
    "lonlat2xyz": function(lon, lat, radius) {
        var phi = THREE.Math.degToRad(90 - lat);
        var theta = THREE.Math.degToRad(lon);
        return {
            "x": radius * Math.sin(phi) * Math.cos(theta),
            "y": radius * Math.cos(phi),
            "z": radius * Math.sin(phi) * Math.sin(theta)
        };
    }
};

var Config = function() {
    var _this = this;
    this.n = 5;
    this.radius = 500;

    this.wireframe = false;
    this.onWireframeChange = function() {
        if (triMesh !== undefined && triMesh.group.children.length > 0) {
            triMesh.group.children[0].material.wireframe = _this.wireframe;
        }
    };

    this.point = new THREE.SphereGeometry( 10, 64, 32 );
    this.smallPonit = new THREE.SphereGeometry(  5, 64, 32 );
    this.aMat = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.DoubleSide } );
    this.bMat = new THREE.MeshBasicMaterial( { color: 0x00ff00, side: THREE.DoubleSide } );
    this.cMat = new THREE.MeshBasicMaterial( { color: 0x0000ff, side: THREE.DoubleSide } );
    this.xMat = new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide } );

    this.A = {
        lon: 0,
        lat: 40,
        mesh: new THREE.Mesh(_this.point, _this.aMat)
    };
    this.B = {
        lon: -25,
        lat: 0,
        mesh: new THREE.Mesh(_this.point, _this.bMat)
    };
    this.C = {
        lon: 25,
        lat: -10,
        mesh: new THREE.Mesh(_this.point, _this.cMat)
    };
    this.onChangeN = function() {
        triMesh.n = _this.n;
        _this.init();
    };
    this.apply = function (){
        _this.A.mesh.position.copy(Util.lonlat2xyz(_this.A.lon, _this.A.lat, _this.radius));
        _this.B.mesh.position.copy(Util.lonlat2xyz(_this.B.lon, _this.B.lat, _this.radius));
        _this.C.mesh.position.copy(Util.lonlat2xyz(_this.C.lon, _this.C.lat, _this.radius));
        if (triMesh !== undefined && triMesh.update !== undefined) {
            triMesh.update(_this.A.mesh.position, _this.B.mesh.position, _this.C.mesh.position);
        }
    };
    this.apply();
    this.init = function() {
        triMesh.init(
            _this.A.mesh.position,
            _this.B.mesh.position,
            _this.C.mesh.position,
            { x: 0.5054, y: 0.5947 },
            { x: 0.4795, y: 0.3896 },
            { x: 0.5752, y: 0.3852 }
        );
    };
};
var config = new Config();

var TriMesh = function(seg) {
    var _this = this;
    this.n = seg || 5;
    this.group = new THREE.Group();
    this.radius = 500;

    this.index = function(i,j) {
        return parseInt(i*(i+1)/2+j);
    };
    this.bary = function(i,j) {
        var n = _this.n;
        return {
            x: (n-1-i)/(n-1),
            y: (i-j)/(n-1),
            z: j/(n-1)
        };
    };
    this.traverse = function(cb) {
        var cb = cb || function(){};
        var n = _this.n;
        for (var i = 0; i <= n-1; ++i) {
            for (var j = 0; j <= i; ++j) {
                cb(i,j);
            }
        }
    };
    this.a = new THREE.Vector3();
    this.b = new THREE.Vector3();
    this.c = new THREE.Vector3();
    this.uv1 = new THREE.Vector2();
    this.uv2 = new THREE.Vector2();
    this.uv3 = new THREE.Vector2();
    this.position = function(i,j) {
        var v = new THREE.Vector3();
        var b = _this.bary(i,j);
        v.x = b.x*_this.a.x + b.y*_this.b.x + b.z*_this.c.x;
        v.y = b.x*_this.a.y + b.y*_this.b.y + b.z*_this.c.y;
        v.z = b.x*_this.a.z + b.y*_this.b.z + b.z*_this.c.z;
        return v;
    };
    this.uv = function(i,j) {
        var v = new THREE.Vector2();
        var b = _this.bary(i,j);
        v.x = b.x*_this.uv1.x + b.y*_this.uv2.x + b.z*_this.uv3.x;
        v.y = b.x*_this.uv1.y + b.y*_this.uv2.y + b.z*_this.uv3.y;
        return v;
    };
    this.update = function(a,b,c) {
        var n = _this.n;
        if (a !== undefined) { _this.a.copy(a); }
        if (b !== undefined) { _this.b.copy(b); }
        if (c !== undefined) { _this.c.copy(c); }
        if (triMesh.group.children.length > 0) {
            var mesh = triMesh.group.children[0];
            _this.traverse(function(i,j){
                var index = _this.index(i,j);
                mesh.geometry.vertices[index].copy(_this.position(i,j).setLength(_this.radius));
                mesh.geometry.vertexNormals[index].copy(mesh.geometry.vertices[index].clone().negate().normalize());
            });
            mesh.geometry.verticesNeedUpdate = true;
            mesh.geometry.normalsNeedUpdate = true;
        }
    };
    this.init = function(a,b,c, uv1, uv2, uv3) {
        var n = _this.n;
        if (a !== undefined) { _this.a.copy(a); }
        if (b !== undefined) { _this.b.copy(b); }
        if (c !== undefined) { _this.c.copy(c); }
        if (uv1 !== undefined) { _this.uv1.copy(uv1); }
        if (uv2 !== undefined) { _this.uv2.copy(uv2); }
        if (uv3 !== undefined) { _this.uv3.copy(uv3); }
        _this.group.children = [];
        var geometry = new THREE.Geometry();
        geometry.vertexNormals = [];
        _this.traverse(function(i,j){
            var v = _this.position(i,j);
            geometry.vertices.push(v.setLength(_this.radius));
            geometry.vertexNormals.push(v.clone().negate().normalize());
        });
        geometry.verticesNeedUpdate = true;
        geometry.normalsNeedUpdate = true;
        geometry.faceVertexUvs[0] = [];
        for (var i = 1; i <= n-1; ++i) {
            for (var j = 0; j < i; ++j) {
                //             A(i-1,j)
                //
                //               /\
                //              /__\
                //
                //         B(i,j)   C(i,j+1)
                var ix = _this.index(i-1,j);
                var iy = _this.index(i,j);
                var iz = _this.index(i,j+1);
                geometry.faces.push( new THREE.Face3(ix,iy,iz) );
                geometry.faceVertexUvs[0].push([
                    _this.uv(i-1,j),
                    _this.uv(i,j),
                    _this.uv(i,j+1)
                ]);
            }
        }
        for (var i = 1; i <= n-2; ++i) {
            for (var j = 0; j < i; ++j) {
                //        B(i,j)   A(i,j+1)
                //              ____
                //              \  /
                //               \/
                //
                //           C(i+1,j+1)
                var ix = _this.index(i,j+1);
                var iy = _this.index(i,j);
                var iz = _this.index(i+1,j+1);
                geometry.faces.push( new THREE.Face3(ix,iy,iz) );
                geometry.faceVertexUvs[0].push([
                    _this.uv(i,j+1),
                    _this.uv(i,j),
                    _this.uv(i+1,j+1)
                ]);
            }
        }

        var material = config.material;

        var mesh = new THREE.Mesh(geometry,material);
        config.mesh = mesh;
        _this.group.add(mesh);
    };
};
var triMesh = new TriMesh(5);

var gui = new dat.GUI();

gui.add(config, 'n').min(2).max(20).step(1).onChange(config.onChangeN);
gui.add(config.A, 'lon').min(-45).max(45).step(0.1).listen().name("A.lon").onChange(config.apply);
gui.add(config.A, 'lat').min(-45).max(45).step(0.1).listen().name("A.lat").onChange(config.apply);
gui.add(config.B, 'lon').min(-45).max(45).step(0.1).listen().name("B.lon").onChange(config.apply);
gui.add(config.B, 'lat').min(-45).max(45).step(0.1).listen().name("B.lat").onChange(config.apply);
gui.add(config.C, 'lon').min(-45).max(45).step(0.1).listen().name("C.lon").onChange(config.apply);
gui.add(config.C, 'lat').min(-45).max(45).step(0.1).listen().name("C.lat").onChange(config.apply);
// gui.add(config, 'init').name("初始化");
gui.add(config, 'wireframe').listen().onChange(config.onWireframeChange);

var newTriangleWithNormal = function(a,b,c) { // a,b,c
    var geometry = new THREE.Geometry();
    geometry.vertices.push(a.clone());
    geometry.vertices.push(b.clone());
    geometry.vertices.push(c.clone());
    geometry.faces.push( new THREE.Face3(0,1,2) );
    return geometry;
    /*
    var geometry = new THREE.BufferGeometry();
     var positions = [ a.x,a.y,a.z, b.x,b.y,b.z, c.x,c.y,c.z ];
     var an = a.clone().negate().normalize(),
     bn = b.clone().negate().normalize(),
     cn = c.clone().negate().normalize();
     var normals = [ an.x,an.y,an.z, bn.x, bn.y, bn.z, cn.x, cn.y, cn.z ];
     geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
     geometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
    */
    // geometry.vertexNormals = [ a.clone().negate().normalize(), b.clone().negate().normalize(), c.clone().negate().normalize() ];
};

window.addEventListener('load', function() {
    var animate = function(){
        window.requestAnimationFrame( animate );
        controls.update();
        renderer.render(scene, camera);
    };

    scene = new THREE.Scene();

    scene.add(triMesh.group);

    scene.add(config.A.mesh);
    scene.add(config.B.mesh);
    scene.add(config.C.mesh);

    container = document.getElementById( 'container' );
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100000);
    camera.position.set(0,100,700);
    camera.lookAt(scene.position);

    var light = new THREE.AmbientLight(0xffffff);
    light.position.set(0,0,0);
    scene.add(light);

    (config.ghXZ = new THREE.GridHelper(300, 10, 0x00ff00, 0x00ff00));
    (config.ghYZ = new THREE.GridHelper(300, 10, 0xff0000, 0xff0000)).rotateZ(-Math.PI/2);
    (config.ghXY = new THREE.GridHelper(300, 10, 0x0000ff, 0x0000ff)).rotateX(Math.PI/2).rotateY(-Math.PI/2);
    scene.add(config.ghXZ).add(config.ghYZ).add(config.ghXY);
    scene.add(config.axisHelper = new THREE.AxisHelper(500));

    var geometry = newTriangleWithNormal(
            new THREE.Vector3(30,0,100),
            new THREE.Vector3(-30,0,100),
            new THREE.Vector3(0,40,100)
    );
    var material = new THREE.MeshBasicMaterial( {
        side: THREE.DoubleSide,
        map: new THREE.TextureLoader().load("texture.jpg"),
    });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    var geometry = new THREE.SphereGeometry( config.radius*2, 64, 32 ); geometry.scale( - 1, 1, 1 );
    // var material = new THREE.MeshBasicMaterial( { color: 0xffff00, side: THREE.DoubleSide, wireframe: true } );
    var material = new THREE.MeshBasicMaterial( {
        map: new THREE.TextureLoader().load( 'pano.jpg' ),
        side: THREE.DoubleSide
    } );
    var mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    config.material = material.clone();
    config.material.transparent = true;
    // config.material.opacity = 0.5;
    config.sphere = mesh;

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls( camera, renderer.domElement );

    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }, false);

    config.init();
    animate();

}, false);