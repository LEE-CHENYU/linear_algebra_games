// Eigenvalue Escape Room - 3D Linear Algebra Game using Three.js
document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let currentRoom = 1;
    let totalRooms = 5;
    let startTime = Date.now();
    let timerInterval;
    let isAnimating = false;
    let doorUnlocked = false;
    let eigenvectorsFound = false;
    let hintsUsed = 0;
    
    // Scene elements
    let scene, camera, renderer, controls, composer;
    let room, door, keypad, eigenvectorVisual;
    let lights = [];
    let matrixObjects = [];
    let bloomPass;
    
    // Room data - each room has a matrix, eigenvalues, and eigenvectors
    const rooms = [
        {
            description: "Find the eigenvalues of the matrix to unlock the door.",
            matrix: [
                [3, 1],
                [1, 3]
            ],
            eigenvalues: [2, 4],
            eigenvectors: [
                [-0.7071, 0.7071], // for eigenvalue 2
                [0.7071, 0.7071]   // for eigenvalue 4
            ],
            hint1: "The characteristic polynomial is det(A - λI).",
            hint2: "For a 2×2 matrix, the characteristic polynomial is λ² - (trace)λ + det.",
            hint3: "The trace is 6 and the determinant is 8, so the polynomial is λ² - 6λ + 8."
        },
        {
            description: "This room requires finding eigenvalues with complex numbers.",
            matrix: [
                [3, -2],
                [2, -1]
            ],
            eigenvalues: [1, 1],
            eigenvectors: [
                [1, 1], // for eigenvalue 1
                [2, 2]  // also for eigenvalue 1 (repeated eigenvalue)
            ],
            hint1: "This matrix has a repeated eigenvalue.",
            hint2: "The characteristic polynomial is λ² - 2λ + 1 = (λ - 1)².",
            hint3: "The eigenvalue 1 has algebraic multiplicity 2."
        },
        {
            description: "Find the eigenvalues of this 3×3 matrix to continue.",
            matrix: [
                [4, 0, 1],
                [0, 5, 0],
                [1, 0, 4]
            ],
            eigenvalues: [3, 5, 5],
            eigenvectors: [
                [-0.7071, 0, 0.7071], // for eigenvalue 3
                [0, 1, 0],            // for eigenvalue 5
                [0.7071, 0, 0.7071]   // for eigenvalue 5
            ],
            hint1: "One eigenvalue is 5, and it's repeated.",
            hint2: "The other eigenvalue is 3.",
            hint3: "The matrix is nearly diagonal, which makes finding eigenvalues easier."
        },
        {
            description: "This room has a diagonalizable matrix with distinct eigenvalues.",
            matrix: [
                [2, 1, 0],
                [0, 2, 0],
                [0, 0, 3]
            ],
            eigenvalues: [2, 2, 3],
            eigenvectors: [
                [1, 0, 0],  // for eigenvalue 2
                [0, 1, 0],  // for eigenvalue 2
                [0, 0, 1]   // for eigenvalue 3
            ],
            hint1: "This is an upper triangular matrix.",
            hint2: "For triangular matrices, the eigenvalues are the diagonal entries.",
            hint3: "The eigenvalues are 2 (repeated) and 3."
        },
        {
            description: "Final challenge: Find the eigenvalues of this matrix to escape!",
            matrix: [
                [6, -1, 0],
                [2, 3, 0],
                [0, 0, 5]
            ],
            eigenvalues: [5, 5, 4],
            eigenvectors: [
                [0, 0, 1],       // for eigenvalue 5
                [1, 1, 0],       // for eigenvalue 5
                [-1, 2, 0]       // for eigenvalue 4
            ],
            hint1: "One eigenvalue is clearly visible in the matrix.",
            hint2: "For the 2×2 submatrix in the upper left, find its eigenvalues.",
            hint3: "The eigenvalues are 5 (repeated) and 4."
        }
    ];
    
    // Initialize the game
    init();
    setupEventListeners();
    startTimer();
    
    // Create a basic test scene immediately to verify rendering works
    console.log("Creating test scene");
    createTestScene();
    
    // Start animation loop
    animate();
    
    // Create actual room after a short delay to ensure Three.js is fully loaded
    setTimeout(() => {
        try {
            loadRoom(0);
            console.log("Room loaded successfully");
        } catch (e) {
            console.error("Error loading room:", e);
        }
    }, 500);
    
    // Initialize Three.js scene and components
    function init() {
        console.log("Initializing Three.js scene");
        
        try {
            // Create scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x050510);
            
            // Create camera
            camera = new THREE.PerspectiveCamera(
                60, 
                getContainerAspect(), 
                0.1, 
                1000
            );
            camera.position.set(0, 1.6, 5);
            camera.lookAt(0, 1.6, 0);
            
            // Create renderer
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(
                document.getElementById('scene-container').clientWidth,
                document.getElementById('scene-container').clientHeight
            );
            renderer.shadowMap.enabled = true;
            
            // Add renderer to DOM
            const container = document.getElementById('scene-container');
            container.innerHTML = ''; // Clear any existing content
            container.appendChild(renderer.domElement);
            
            // Basic scene setup first without post-processing
            // Add orbit controls
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.rotateSpeed = 0.7;
            controls.maxPolarAngle = Math.PI / 1.5;
            controls.minDistance = 2;
            controls.maxDistance = 10;
            controls.target.set(0, 1.6, 0);
            
            // Add lighting
            setupLighting();
            
            // Handle window resize
            window.addEventListener('resize', onWindowResize);
            
            // Test render a simple scene to make sure everything works
            const testGeometry = new THREE.BoxGeometry(1, 1, 1);
            const testMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const testCube = new THREE.Mesh(testGeometry, testMaterial);
            scene.add(testCube);
            
            // Render test scene
            renderer.render(scene, camera);
            
            console.log("Basic Three.js scene initialized successfully");
            
        } catch (e) {
            console.error("Error initializing Three.js scene:", e);
        }
    }
    
    function setupPostprocessing() {
        try {
            // Create effect composer
            composer = new THREE.EffectComposer(renderer);
            
            // Add render pass
            const renderPass = new THREE.RenderPass(scene, camera);
            composer.addPass(renderPass);
            
            // Add bloom pass for glow effects
            bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(
                    document.getElementById('scene-container').clientWidth,
                    document.getElementById('scene-container').clientHeight
                ),
                0.5,  // strength
                0.4,  // radius
                0.85  // threshold
            );
            composer.addPass(bloomPass);
            console.log("Post-processing initialized successfully");
        } catch (e) {
            console.error("Error setting up post-processing:", e);
            composer = null; // Fallback to standard rendering
        }
    }
    
    function getContainerAspect() {
        const container = document.getElementById('scene-container');
        return container.clientWidth / container.clientHeight;
    }
    
    function onWindowResize() {
        const container = document.getElementById('scene-container');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        composer.setSize(container.clientWidth, container.clientHeight);
    }
    
    function setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x202040, 0.5);
        scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        scene.add(directionalLight);
        
        // Add colored point lights for atmosphere
        addPointLight(0x3060ff, 1, 10, 2, 1.5, 2);
        addPointLight(0xff6030, 1, 10, -2, 1.5, -2);
        addPointLight(0x50ff50, 0.7, 8, -1.5, 1, 1.5);
    }
    
    function addPointLight(color, intensity, distance, x, y, z) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.set(x, y, z);
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        scene.add(light);
        lights.push(light);
    }
    
    // Create escape room with walls, floor, ceiling, and door
    function createRoom() {
        // Remove existing room if any
        if (room) scene.remove(room);
        
        // Create room group
        room = new THREE.Group();
        
        // Colors and materials
        const wallColor = 0x1a1a3a;
        const floorColor = 0x101025;
        const accentColor = 0x4060ff;
        
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(10, 10);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: floorColor,
            metalness: 0.3,
            roughness: 0.7,
            emissive: 0x101020,
            emissiveIntensity: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        room.add(floor);
        
        // Add grid lines to floor
        const gridHelper = new THREE.GridHelper(10, 20, 0x0000ff, 0x000066);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        room.add(gridHelper);
        
        // Create ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(10, 10);
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: wallColor,
            metalness: 0.3,
            roughness: 0.8,
            emissive: 0x101020,
            emissiveIntensity: 0.1
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 3;
        ceiling.receiveShadow = true;
        room.add(ceiling);
        
        // Create walls
        createWall(10, 3, 0, 1.5, -5, 0, 0); // Back wall
        createWall(10, 3, 0, 1.5, 5, Math.PI, 0); // Front wall with door
        createWall(10, 3, -5, 1.5, 0, Math.PI / 2, 0); // Left wall
        createWall(10, 3, 5, 1.5, 0, -Math.PI / 2, 0); // Right wall
        
        // Add glowing trim lights to the room edges
        addGlowingTrim();
        
        // Create door in the front wall
        createDoor();
        
        // Create keypad for eigenvalue entry
        createKeypad();
        
        // Create holographic matrix display
        createMatrixDisplay();
        
        // Add room to scene
        scene.add(room);
    }
    
    // Create a single wall with given dimensions and position
    function createWall(width, height, x, y, z, rotationY, rotationX) {
        const wallGeometry = new THREE.PlaneGeometry(width, height);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a3a,
            metalness: 0.4,
            roughness: 0.7,
            emissive: 0x101020,
            emissiveIntensity: 0.1
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, y, z);
        wall.rotation.y = rotationY;
        if (rotationX) wall.rotation.x = rotationX;
        wall.receiveShadow = true;
        
        // Add some panel details to the wall
        addWallPanels(wall, width, height);
        
        room.add(wall);
        return wall;
    }
    
    // Add decorative panels to wall
    function addWallPanels(wall, width, height) {
        const panelGeometry = new THREE.PlaneGeometry(width * 0.8, height * 0.5);
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x232350,
            metalness: 0.6,
            roughness: 0.4,
            emissive: 0x101030,
            emissiveIntensity: 0.2
        });
        
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.z = 0.01; // Slightly in front of wall
        wall.add(panel);
        
        // Add glowing lines to panel
        const lineGeometry = new THREE.BoxGeometry(width * 0.7, 0.02, 0.01);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x4060ff });
        
        // Add multiple horizontal lines
        for (let i = 0; i < 3; i++) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.y = height * 0.15 - i * 0.2;
            line.position.z = 0.02;
            panel.add(line);
        }
    }
    
    // Add glowing trim to room edges
    function addGlowingTrim() {
        const trimGeometry = new THREE.BoxGeometry(10, 0.05, 0.05);
        const trimMaterial = new THREE.MeshBasicMaterial({ color: 0x4060ff });
        
        // Floor trim
        const floorTrim1 = new THREE.Mesh(trimGeometry, trimMaterial);
        floorTrim1.position.set(0, 0.025, -5);
        room.add(floorTrim1);
        
        const floorTrim2 = new THREE.Mesh(trimGeometry, trimMaterial);
        floorTrim2.position.set(0, 0.025, 5);
        room.add(floorTrim2);
        
        const floorTrim3 = new THREE.Mesh(trimGeometry, trimMaterial.clone());
        floorTrim3.rotation.y = Math.PI / 2;
        floorTrim3.position.set(-5, 0.025, 0);
        room.add(floorTrim3);
        
        const floorTrim4 = new THREE.Mesh(trimGeometry, trimMaterial.clone());
        floorTrim4.rotation.y = Math.PI / 2;
        floorTrim4.position.set(5, 0.025, 0);
        room.add(floorTrim4);
        
        // Ceiling trim
        const ceilingTrim1 = new THREE.Mesh(trimGeometry, trimMaterial.clone());
        ceilingTrim1.position.set(0, 2.975, -5);
        room.add(ceilingTrim1);
        
        const ceilingTrim2 = new THREE.Mesh(trimGeometry, trimMaterial.clone());
        ceilingTrim2.position.set(0, 2.975, 5);
        room.add(ceilingTrim2);
        
        const ceilingTrim3 = new THREE.Mesh(trimGeometry, trimMaterial.clone());
        ceilingTrim3.rotation.y = Math.PI / 2;
        ceilingTrim3.position.set(-5, 2.975, 0);
        room.add(ceilingTrim3);
        
        const ceilingTrim4 = new THREE.Mesh(trimGeometry, trimMaterial.clone());
        ceilingTrim4.rotation.y = Math.PI / 2;
        ceilingTrim4.position.set(5, 2.975, 0);
        room.add(ceilingTrim4);
        
        // Vertical trim
        const verticalTrimGeometry = new THREE.BoxGeometry(0.05, 3, 0.05);
        
        const cornerPositions = [
            [-5, 1.5, -5],
            [5, 1.5, -5],
            [-5, 1.5, 5],
            [5, 1.5, 5]
        ];
        
        cornerPositions.forEach(pos => {
            const verticalTrim = new THREE.Mesh(
                verticalTrimGeometry, 
                trimMaterial.clone()
            );
            verticalTrim.position.set(...pos);
            room.add(verticalTrim);
        });
    }
    
    // Create door in the front wall
    function createDoor() {
        // Door frame
        const frameGeometry = new THREE.BoxGeometry(2.2, 2.7, 0.2);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x303060,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const doorFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        doorFrame.position.set(0, 1.35, 4.9);
        room.add(doorFrame);
        
        // Door
        const doorGeometry = new THREE.BoxGeometry(2, 2.5, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x4050a0,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x1020a0,
            emissiveIntensity: 0.2
        });
        
        door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.25, 4.8);
        room.add(door);
        
        // Door details - glowing lines
        const detailGeometry = new THREE.BoxGeometry(1.8, 0.03, 0.02);
        const detailMaterial = new THREE.MeshBasicMaterial({ color: 0x4060ff });
        
        for (let i = 0; i < 5; i++) {
            const detail = new THREE.Mesh(detailGeometry, detailMaterial);
            detail.position.z = 0.06;
            detail.position.y = -0.9 + i * 0.45;
            door.add(detail);
        }
        
        // Door lock light
        const lockLightGeometry = new THREE.CircleGeometry(0.1, 16);
        const lockLightMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3030,
            side: THREE.DoubleSide
        });
        
        const lockLight = new THREE.Mesh(lockLightGeometry, lockLightMaterial);
        lockLight.position.set(0.7, 0, 0.06);
        door.add(lockLight);
    }
    
    // Create keypad for eigenvalue entry
    function createKeypad() {
        // Keypad base
        const keypadGeometry = new THREE.BoxGeometry(1, 1.2, 0.1);
        const keypadMaterial = new THREE.MeshStandardMaterial({
            color: 0x202040,
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0x101020,
            emissiveIntensity: 0.2
        });
        
        keypad = new THREE.Mesh(keypadGeometry, keypadMaterial);
        keypad.position.set(-3, 1.5, -4.9);
        keypad.rotation.y = Math.PI;
        room.add(keypad);
        
        // Screen
        const screenGeometry = new THREE.PlaneGeometry(0.8, 0.3);
        const screenMaterial = new THREE.MeshBasicMaterial({
            color: 0x5080ff,
            opacity: 0.9,
            transparent: true
        });
        
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.z = 0.06;
        screen.position.y = 0.4;
        keypad.add(screen);
        
        // Create buttons
        const buttonSize = 0.15;
        const buttonGeometry = new THREE.BoxGeometry(buttonSize, buttonSize, 0.03);
        const buttonMaterial = new THREE.MeshStandardMaterial({
            color: 0x303060,
            metalness: 0.5,
            roughness: 0.5,
            emissive: 0x202040,
            emissiveIntensity: 0.3
        });
        
        // Create grid of buttons
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const button = new THREE.Mesh(buttonGeometry, buttonMaterial.clone());
                button.position.set(
                    -0.3 + col * (buttonSize + 0.1),
                    0.1 - row * (buttonSize + 0.1),
                    0.06
                );
                keypad.add(button);
            }
        }
        
        // Submit button
        const submitButton = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.15, 0.03),
            new THREE.MeshStandardMaterial({
                color: 0x4060d0,
                metalness: 0.6,
                roughness: 0.4,
                emissive: 0x2040a0,
                emissiveIntensity: 0.3
            })
        );
        submitButton.position.set(0, -0.4, 0.06);
        keypad.add(submitButton);
        
        // Add a light above keypad
        const keypadLight = new THREE.PointLight(0x5080ff, 0.8, 3);
        keypadLight.position.set(-3, 2.2, -4.7);
        room.add(keypadLight);
    }
    
    // Create holographic matrix display
    function createMatrixDisplay() {
        // Platform for matrix display
        const platformGeometry = new THREE.CylinderGeometry(1, 1.2, 0.2, 16);
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x202040,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(3, 0.1, -3);
        room.add(platform);
        
        // Add glowing ring
        const ringGeometry = new THREE.TorusGeometry(1, 0.05, 16, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x5080ff });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(3, 0.2, -3);
        ring.rotation.x = Math.PI / 2;
        room.add(ring);
        
        // Add light for the display
        const displayLight = new THREE.PointLight(0x5080ff, 1, 5);
        displayLight.position.set(3, 1.5, -3);
        room.add(displayLight);
        
        updateMatrixDisplay();
    }
    
    // Update matrix display based on current room
    function updateMatrixDisplay() {
        // Clear existing matrix objects
        matrixObjects.forEach(obj => {
            if (obj && obj.parent) obj.parent.remove(obj);
        });
        matrixObjects = [];
        
        const matrix = rooms[currentRoom - 1].matrix;
        const size = matrix.length; // Matrix size (2x2 or 3x3)
        
        // Create matrix elements as floating cubes
        const spacing = 0.4;
        const startX = (size === 2) ? -0.2 : -0.4;
        const startY = (size === 2) ? 1.5 : 1.6;
        
        // Material for matrix elements
        const elementMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x5080ff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Create text for each number
                const value = matrix[i][j];
                
                // Create cube for each element
                const elementGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
                const element = new THREE.Mesh(elementGeometry, elementMaterial.clone());
                element.position.set(
                    3 + startX + j * spacing,
                    startY - i * spacing,
                    -3
                );
                
                // Add animation
                element.rotation.y = Math.random() * Math.PI;
                element.rotation.x = Math.random() * Math.PI / 4;
                
                // Store reference for animation
                matrixObjects.push(element);
                
                // Add to scene
                room.add(element);
                
                // Add floating number above each cube
                createFloatingNumber(value, element.position.x, element.position.y, element.position.z);
            }
        }
    }
    
    // Create floating number for matrix display
    function createFloatingNumber(value, x, y, z) {
        // This would create a floating number in 3D space
        // For simplicity in this implementation, we'll just use geometry
        
        const textMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        // This is a simplified representation - in a complete implementation
        // you would use TextGeometry from the TextBufferGeometry extension
        const textGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(x, y + 0.25, z);
        room.add(textMesh);
        matrixObjects.push(textMesh);
    }
    
    // Create eigenvector visualization
    function createEigenvectorVisual() {
        if (eigenvectorVisual) scene.remove(eigenvectorVisual);
        
        eigenvectorVisual = new THREE.Group();
        
        // Create eigenvector arrow
        const arrowOrigin = new THREE.Vector3(3, 1, -3);
        const arrowDirection = new THREE.Vector3(1, 0, 0);
        const arrowLength = 0;
        const arrowColor = 0x00ff00;
        
        const arrow = new THREE.ArrowHelper(
            arrowDirection, 
            arrowOrigin, 
            arrowLength, 
            arrowColor, 
            0.2, 
            0.1
        );
        eigenvectorVisual.add(arrow);
        
        // Add to scene
        scene.add(eigenvectorVisual);
        return arrow;
    }
    
    // Update eigenvector visualization
    function updateEigenvectorVisual(eigenvector, eigenvalue) {
        if (!eigenvectorVisual) {
            const arrow = createEigenvectorVisual();
            animateEigenvectorAppear(arrow, eigenvector, eigenvalue);
        } else {
            const arrow = eigenvectorVisual.children[0];
            animateEigenvectorChange(arrow, eigenvector, eigenvalue);
        }
    }
    
    // Animate eigenvector appearing
    function animateEigenvectorAppear(arrow, eigenvector, eigenvalue) {
        const vector = new THREE.Vector3(...eigenvector);
        vector.normalize();
        
        // Set direction
        arrow.setDirection(vector);
        
        // Animate length growth
        const startTime = Date.now();
        const duration = 1000;
        const maxLength = eigenvalue * 0.5; // Scale eigenvalue for visualization
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuad(progress);
            
            // Set arrow length
            const currentLength = maxLength * easedProgress;
            arrow.setLength(currentLength, 0.2, 0.1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    }
    
    // Animate eigenvector changing
    function animateEigenvectorChange(arrow, eigenvector, eigenvalue) {
        const vector = new THREE.Vector3(...eigenvector);
        vector.normalize();
        
        // Set direction
        arrow.setDirection(vector);
        
        // Animate length change
        const startTime = Date.now();
        const duration = 800;
        const startLength = arrow.scale.z; // Current length
        const endLength = eigenvalue * 0.5; // Scale eigenvalue for visualization
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutQuad(progress);
            
            // Set arrow length
            const currentLength = startLength + (endLength - startLength) * easedProgress;
            arrow.setLength(currentLength, 0.2, 0.1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    }
    
    // Easing functions
    function easeOutQuad(t) {
        return t * (2 - t);
    }
    
    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    // Create a simple test scene to verify rendering works
    function createTestScene() {
        // Create a simple cube
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Add direct light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);
        
        // Force render
        renderer.render(scene, camera);
        console.log("Test scene created");
    }
    
    // Load room data
    function loadRoom(roomIndex) {
        if (roomIndex >= rooms.length) {
            // Game completed
            showModal('Congratulations!', 'You have mastered eigenvalues and eigenvectors!', () => {
                // Restart game
                roomIndex = 0;
                currentRoom = 1;
                score = 0;
                updateUI();
                loadRoom(roomIndex);
            });
            return;
        }
        
        // Set current room
        currentRoom = roomIndex + 1;
        
        // Reset game state
        doorUnlocked = false;
        eigenvectorsFound = false;
        
        // Create/update 3D room
        createRoom();
        
        // Update UI elements
        document.getElementById('room').textContent = currentRoom;
        document.getElementById('roomDescription').textContent = rooms[roomIndex].description;
        
        // Update matrix display in HTML
        displayMatrixInHTML(rooms[roomIndex].matrix);
        
        // Hide eigenvalue 3 input for 2x2 matrices
        const ev3Container = document.getElementById('eigenvalue3Container');
        const vectorZContainer = document.getElementById('eigenvectorZContainer');
        
        if (rooms[roomIndex].matrix.length === 2) {
            ev3Container.style.display = 'none';
            vectorZContainer.style.display = 'none';
        } else {
            ev3Container.style.display = 'flex';
            vectorZContainer.style.display = 'flex';
        }
        
        // Reset input fields
        document.getElementById('eigenvalue1').value = '';
        document.getElementById('eigenvalue2').value = '';
        document.getElementById('eigenvalue3').value = '';
        document.getElementById('eigenvectorX').value = '';
        document.getElementById('eigenvectorY').value = '';
        document.getElementById('eigenvectorZ').value = '';
        
        // Reset hint text
        document.getElementById('hintText').textContent = 'Try finding the characteristic polynomial first.';
        hintsUsed = 0;
    }
    
    // Display matrix in HTML
    function displayMatrixInHTML(matrix) {
        const matrixDiv = document.getElementById('matrixDisplay');
        matrixDiv.innerHTML = '';
        matrixDiv.classList.add('matrix-animate');
        
        // Create HTML representation of matrix
        let html = '[';
        
        for (let i = 0; i < matrix.length; i++) {
            if (i > 0) html += '<br>';
            html += '[';
            
            for (let j = 0; j < matrix[i].length; j++) {
                html += matrix[i][j];
                if (j < matrix[i].length - 1) html += ', ';
            }
            
            html += ']';
        }
        
        html += ']';
        matrixDiv.innerHTML = html;
        
        // Remove animation class after animation completes
        setTimeout(() => {
            matrixDiv.classList.remove('matrix-animate');
        }, 500);
    }
    
    // Check submitted eigenvalues
    function checkEigenvalues() {
        // Get input values
        const ev1 = parseFloat(document.getElementById('eigenvalue1').value);
        const ev2 = parseFloat(document.getElementById('eigenvalue2').value);
        let ev3 = parseFloat(document.getElementById('eigenvalue3').value);
        
        // Get correct eigenvalues
        const correctEVs = rooms[currentRoom - 1].eigenvalues.slice();
        
        // For 2x2 matrices, ignore third eigenvalue
        if (correctEVs.length === 2) {
            ev3 = null;
        }
        
        // Check if inputs are valid numbers
        if (isNaN(ev1) || isNaN(ev2) || (correctEVs.length === 3 && isNaN(ev3))) {
            showModal('Invalid Input', 'Please enter valid numbers for all eigenvalues.', null);
            return false;
        }
        
        // Create arrays of submitted and correct eigenvalues
        const submittedEVs = (correctEVs.length === 2) 
            ? [ev1, ev2] 
            : [ev1, ev2, ev3];
        
        // Sort both arrays for comparison
        const sortedSubmitted = submittedEVs.slice().sort((a, b) => a - b);
        const sortedCorrect = correctEVs.slice().sort((a, b) => a - b);
        
        // Check if all eigenvalues match (with tolerance for floating point comparison)
        const tolerance = 0.1;
        const allMatch = sortedSubmitted.every((value, index) => 
            Math.abs(value - sortedCorrect[index]) < tolerance
        );
        
        if (allMatch) {
            // Eigenvalues correct!
            doorUnlocked = true;
            
            // Change door lock light to green
            changeDoorLockLight(0x00ff00);
            
            // Show success message
            showModal('Correct Eigenvalues!', 'The door is unlocked. Now find an eigenvector to reveal the path.', null);
            
            // Update UI to show eigenvector input
            document.getElementById('selectedEigenvalue').textContent = ev1.toFixed(1);
            
            // Animate door unlock
            animateDoorUnlock();
            
            return true;
        } else {
            // Incorrect eigenvalues
            showModal('Incorrect', 'Those are not the correct eigenvalues. Try again.', null);
            return false;
        }
    }
    
    // Check submitted eigenvector
    function checkEigenvector() {
        if (!doorUnlocked) {
            showModal('Door Locked', 'You need to find the correct eigenvalues first.', null);
            return false;
        }
        
        // Get input values
        const x = parseFloat(document.getElementById('eigenvectorX').value);
        const y = parseFloat(document.getElementById('eigenvectorY').value);
        let z = parseFloat(document.getElementById('eigenvectorZ').value);
        
        // Get selected eigenvalue
        const selectedEV = parseFloat(document.getElementById('selectedEigenvalue').textContent);
        
        // Check if inputs are valid numbers
        const is3D = rooms[currentRoom - 1].matrix.length === 3;
        if (isNaN(x) || isNaN(y) || (is3D && isNaN(z))) {
            showModal('Invalid Input', 'Please enter valid numbers for the eigenvector components.', null);
            return false;
        }
        
        // Create eigenvector
        const eigenvector = is3D ? [x, y, z] : [x, y];
        
        // Check if it's a zero vector
        const isZeroVector = eigenvector.every(v => Math.abs(v) < 0.0001);
        if (isZeroVector) {
            showModal('Invalid Eigenvector', 'The zero vector is not a valid eigenvector.', null);
            return false;
        }
        
        // Get correct eigenvalues and corresponding eigenvectors
        const correctEVs = rooms[currentRoom - 1].eigenvalues;
        const correctEigenvectors = rooms[currentRoom - 1].eigenvectors;
        
        // Find the index of the selected eigenvalue in the correct eigenvalues
        const tolerance = 0.1;
        const eigenvalueIndex = correctEVs.findIndex(ev => 
            Math.abs(ev - selectedEV) < tolerance
        );
        
        if (eigenvalueIndex === -1) {
            showModal('Error', 'Selected eigenvalue not found. Please try again.', null);
            return false;
        }
        
        // Get the correct eigenvector for this eigenvalue
        const correctEigenvector = correctEigenvectors[eigenvalueIndex];
        
        // Normalize both eigenvectors for comparison
        const normalizedInput = normalizeVector(eigenvector);
        const normalizedCorrect = normalizeVector(correctEigenvector);
        
        // Check if vectors are parallel (dot product should be close to 1 or -1)
        const dotProduct = Math.abs(dot(normalizedInput, normalizedCorrect));
        const isParallel = Math.abs(dotProduct - 1) < 0.2; // Allow some tolerance
        
        if (isParallel) {
            // Eigenvector correct!
            eigenvectorsFound = true;
            
            // Show success message
            showModal('Correct Eigenvector!', 'You can now proceed to the next room.', () => {
                // Move to next room
                loadRoom(currentRoom);
            });
            
            // Update 3D visual
            if (is3D) {
                updateEigenvectorVisual([x, y, z], selectedEV);
            } else {
                // For 2D matrices, add a 0 z-component for visualization
                updateEigenvectorVisual([x, y, 0], selectedEV);
            }
            
            // Fully open the door
            animateDoorOpen();
            
            return true;
        } else {
            // Incorrect eigenvector
            showModal('Incorrect', 'That is not an eigenvector for the selected eigenvalue.', null);
            return false;
        }
    }
    
    // Vector math helper functions
    function normalizeVector(vector) {
        const length = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        return vector.map(v => v / length);
    }
    
    function dot(v1, v2) {
        return v1.reduce((sum, v, i) => sum + v * v2[i], 0);
    }
    
    // Animate door unlock
    function animateDoorUnlock() {
        // Change door color
        door.material.emissive.setHex(0x2040c0);
        door.material.emissiveIntensity = 0.4;
        
        // Slight door movement
        const startPosition = door.position.z;
        const endPosition = startPosition - 0.1;
        
        const startTime = Date.now();
        const duration = 600;
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuad(progress);
            
            door.position.z = startPosition + (endPosition - startPosition) * easedProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    }
    
    // Animate door fully opening
    function animateDoorOpen() {
        const startPosition = door.position.z;
        const endPosition = startPosition - 1.5;
        
        const startTime = Date.now();
        const duration = 1500;
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutQuad(progress);
            
            door.position.z = startPosition + (endPosition - startPosition) * easedProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    }
    
    // Change door lock light color
    function changeDoorLockLight(color) {
        // Find the lock light (last child of the door)
        const lockLight = door.children[door.children.length - 1];
        lockLight.material.color.setHex(color);
    }
    
    // Show modal with message
    function showModal(title, message, onClose) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalClose = document.getElementById('modalClose');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        modal.classList.add('show');
        
        modalClose.onclick = () => {
            modal.classList.remove('show');
            if (onClose) onClose();
        };
    }
    
    // Start timer
    function startTimer() {
        startTime = Date.now();
        
        timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    // Get hint
    function getHint() {
        const room = rooms[currentRoom - 1];
        let hintText = '';
        
        if (hintsUsed === 0) {
            hintText = room.hint1;
        } else if (hintsUsed === 1) {
            hintText = room.hint2;
        } else {
            hintText = room.hint3;
        }
        
        document.getElementById('hintText').textContent = hintText;
        hintsUsed++;
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Submit eigenvalues button
        document.getElementById('submitEigenvalues').addEventListener('click', checkEigenvalues);
        
        // Submit eigenvector button
        document.getElementById('submitEigenvector').addEventListener('click', checkEigenvector);
        
        // Get hint button
        document.getElementById('getHint').addEventListener('click', getHint);
        
        // Modal close button
        document.getElementById('modalClose').addEventListener('click', () => {
            document.getElementById('modal').classList.remove('show');
        });
    }
    
    // Animation function for game loop
    function animate() {
        requestAnimationFrame(animate);
        
        try {
            // Update controls if they exist
            if (controls) controls.update();
            
            // Animate matrix elements if they exist
            if (matrixObjects.length > 0) {
                animateMatrixElements();
            }
            
            // Simple direct rendering - no post-processing for now
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        } catch (e) {
            console.error("Animation error:", e);
        }
    }
    
    // Animate matrix elements (rotating cubes)
    function animateMatrixElements() {
        if (matrixObjects.length > 0) {
            matrixObjects.forEach((obj, index) => {
                if (obj.geometry && obj.geometry.type === 'BoxGeometry') {
                    // Rotate floating cubes
                    obj.rotation.x += 0.005;
                    obj.rotation.y += 0.007;
                    
                    // Add subtle floating motion
                    const time = Date.now() * 0.001;
                    const offset = index * 0.5;
                    obj.position.y += Math.sin(time + offset) * 0.0015;
                }
            });
        }
    }
});
