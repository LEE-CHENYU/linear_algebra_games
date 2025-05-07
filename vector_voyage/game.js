// Vector Voyage - 3D Linear Algebra Game using Three.js
document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let level = 1;
    let score = 0;
    let isAnimating = false;
    
    // Scene elements
    let scene, camera, renderer, controls;
    let ship, target, vectorArrow;
    let grid, axes;
    let vectorTrails = [];
    let maxTrails = 5;
    let showGrid = true;
    let showCoordinates = true;
    let showVectorTrails = true;
    
    // Vector state
    let shipPosition = new THREE.Vector3(0, 0, 0);
    let currentVector = new THREE.Vector3(0, 0, 0);
    
    // Mission data
    const missions = [
        { 
            description: "Navigate to the checkpoint using vector addition.",
            target: new THREE.Vector3(5, 3, 0),
            startPos: new THREE.Vector3(0, 0, 0)
        },
        { 
            description: "Use vector subtraction to reach the target.",
            target: new THREE.Vector3(-3, 4, 2),
            startPos: new THREE.Vector3(2, 1, 0)
        },
        { 
            description: "Apply scalar multiplication to reach the distant target.",
            target: new THREE.Vector3(8, -6, 4),
            startPos: new THREE.Vector3(2, -1, 1)
        },
        { 
            description: "Use the cross product to navigate perpendicular to your current direction.",
            target: new THREE.Vector3(-4, 5, -3),
            startPos: new THREE.Vector3(2, 2, 2)
        },
        { 
            description: "Master 3D vector operations to reach the final checkpoint.",
            target: new THREE.Vector3(7, 7, 7),
            startPos: new THREE.Vector3(-3, -3, -3)
        }
    ];
    
    // Initialize the game
    init();
    setupEventListeners();
    loadMission(0);
    animate();
    
    // Initialize Three.js scene and components
    function init() {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a1a);
        scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(
            60, 
            getContainerAspect(), 
            0.1, 
            1000
        );
        camera.position.set(15, 15, 15);
        camera.lookAt(0, 0, 0);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(
            document.getElementById('scene-container').clientWidth,
            document.getElementById('scene-container').clientHeight
        );
        renderer.shadowMap.enabled = true;
        
        // Add renderer to DOM
        document.getElementById('scene-container').appendChild(renderer.domElement);
        
        // Add orbit controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.7;
        
        // Add lighting
        setupLighting();
        
        // Create coordinate grid
        createGrid();
        
        // Create coordinate axes
        createAxes();
        
        // Create spaceship
        createShip();
        
        // Create target
        createTarget();
        
        // Create vector arrow
        createVectorArrow();
        
        // Add stars background
        createStarfield();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
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
    }
    
    function setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 15);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Point lights for visual interest
        const pointLight1 = new THREE.PointLight(0x3060ff, 1, 20);
        pointLight1.position.set(5, -5, 5);
        scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff6030, 1, 20);
        pointLight2.position.set(-5, 5, -5);
        scene.add(pointLight2);
    }
    
    function createGrid() {
        // Remove existing grid if any
        if (grid) scene.remove(grid);
        
        // Create grid helper
        grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        grid.material.opacity = 0.5;
        grid.material.transparent = true;
        grid.visible = showGrid;
        scene.add(grid);
        
        // Add coordinate labels if enabled
        if (showCoordinates) {
            createCoordinateLabels();
        }
    }
    
    function createCoordinateLabels() {
        // This would be implemented with HTML elements or THREE.Sprite
        // For simplicity, we'll skip the actual implementation
    }
    
    function createAxes() {
        // Remove existing axes if any
        if (axes) scene.remove(axes);
        
        // Create axes helper
        axes = new THREE.AxesHelper(10);
        scene.add(axes);
        
        // X axis - red
        const xMaterial = axes.material.clone();
        xMaterial.vertexColors = false;
        xMaterial.color.set(0xff0000);
        
        // Y axis - green
        const yMaterial = axes.material.clone();
        yMaterial.vertexColors = false;
        yMaterial.color.set(0x00ff00);
        
        // Z axis - blue
        const zMaterial = axes.material.clone();
        zMaterial.vertexColors = false;
        zMaterial.color.set(0x0000ff);
        
        // Apply materials to axes
        axes.material = [xMaterial, yMaterial, zMaterial];
    }
    
    function createShip() {
        // Remove existing ship if any
        if (ship) scene.remove(ship);
        
        // Create ship geometry
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        geometry.rotateX(Math.PI / 2);
        
        // Create ship material with glow effect
        const material = new THREE.MeshPhongMaterial({
            color: 0x3498db,
            emissive: 0x1a4c72,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        // Create ship mesh
        ship = new THREE.Mesh(geometry, material);
        ship.castShadow = true;
        ship.receiveShadow = true;
        ship.position.copy(shipPosition);
        scene.add(ship);
        
        // Add engine glow effect
        const engineGlow = new THREE.PointLight(0x3498db, 1, 2);
        engineGlow.position.set(0, 0, -0.8);
        ship.add(engineGlow);
        
        // Add particle system for engine thrust
        createEngineParticles();
    }
    
    function createEngineParticles() {
        // This would create a particle system for the ship's engine
        // For simplicity, we'll skip the actual implementation
    }
    
    function createTarget() {
        // Remove existing target if any
        if (target) scene.remove(target);
        
        // Create target group
        target = new THREE.Group();
        
        // Create outer sphere
        const outerGeometry = new THREE.SphereGeometry(1, 16, 16);
        const outerMaterial = new THREE.MeshPhongMaterial({
            color: 0xe74c3c,
            transparent: true,
            opacity: 0.3
        });
        const outerSphere = new THREE.Mesh(outerGeometry, outerMaterial);
        target.add(outerSphere);
        
        // Create inner sphere
        const innerGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const innerMaterial = new THREE.MeshPhongMaterial({
            color: 0xe74c3c,
            emissive: 0xc0392b,
            emissiveIntensity: 0.5
        });
        const innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
        target.add(innerSphere);
        
        // Add pulsing light
        const targetLight = new THREE.PointLight(0xe74c3c, 1, 5);
        targetLight.position.set(0, 0, 0);
        target.add(targetLight);
        
        // Position target
        target.position.copy(missions[level - 1].target);
        scene.add(target);
    }
    
    function createVectorArrow() {
        // Remove existing arrow if any
        if (vectorArrow) scene.remove(vectorArrow);
        
        // Create arrow helper
        const origin = shipPosition.clone();
        const direction = currentVector.clone().normalize();
        const length = currentVector.length();
        const color = 0xffff00;
        
        vectorArrow = new THREE.ArrowHelper(direction, origin, length, color, 0.2, 0.1);
        scene.add(vectorArrow);
        
        // Update UI
        updateVectorInputs();
    }
    
    function createStarfield() {
        // Create a particle system for stars
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            map: createStarTexture(),
            blending: THREE.AdditiveBlending
        });
        
        // Generate random star positions
        const starsCount = 2000;
        const positions = new Float32Array(starsCount * 3);
        
        for (let i = 0; i < starsCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100;
            positions[i + 1] = (Math.random() - 0.5) * 100;
            positions[i + 2] = (Math.random() - 0.5) * 100;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);
    }
    
    function createStarTexture() {
        // Create a canvas for the star texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(240, 240, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(220, 220, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    function loadMission(missionIndex) {
        if (missionIndex >= missions.length) {
            // Game completed
            showAchievement('Game Completed!', 'Congratulations! You\'ve mastered vector operations in 3D space!');
            missionIndex = 0; // Restart from the beginning
        }
        
        // Set level
        level = missionIndex + 1;
        
        // Get mission data
        const mission = missions[missionIndex];
        
        // Reset ship position
        shipPosition.copy(mission.startPos);
        ship.position.copy(shipPosition);
        
        // Reset target position
        target.position.copy(mission.target);
        
        // Reset vector
        currentVector.set(0, 0, 0);
        
        // Clear vector trails
        clearVectorTrails();
        
        // Update vector arrow
        updateVectorArrow();
        
        // Update mission description
        document.getElementById('missionDescription').textContent = mission.description;
        document.getElementById('targetX').textContent = mission.target.x;
        document.getElementById('targetY').textContent = mission.target.y;
        document.getElementById('targetZ').textContent = mission.target.z;
        
        // Update UI
        updateUI();
    }
    
    function updateUI() {
        // Update level and score display
        document.getElementById('level').textContent = level;
        document.getElementById('score').textContent = score;
        
        // Update vector inputs
        updateVectorInputs();
    }
    
    function updateVectorInputs() {
        document.getElementById('vectorX').value = currentVector.x;
        document.getElementById('vectorY').value = currentVector.y;
        document.getElementById('vectorZ').value = currentVector.z;
    }
    
    function updateVectorArrow() {
        // Remove existing arrow
        if (vectorArrow) scene.remove(vectorArrow);
        
        // Only create arrow if vector has magnitude
        if (currentVector.length() > 0) {
            const origin = shipPosition.clone();
            const direction = currentVector.clone().normalize();
            const length = currentVector.length();
            const color = 0xffff00;
            
            vectorArrow = new THREE.ArrowHelper(direction, origin, length, color, 0.2, 0.1);
            scene.add(vectorArrow);
        }
    }
    
    function addVectorTrail() {
        if (!showVectorTrails) return;
        
        // Create line for vector trail
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        
        const geometry = new THREE.BufferGeometry();
        const points = [
            shipPosition.clone(),
            shipPosition.clone().add(currentVector)
        ];
        geometry.setFromPoints(points);
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        vectorTrails.push(line);
        
        // Limit number of trails
        if (vectorTrails.length > maxTrails) {
            const oldestTrail = vectorTrails.shift();
            scene.remove(oldestTrail);
        }
    }
    
    function clearVectorTrails() {
        // Remove all vector trails
        vectorTrails.forEach(trail => scene.remove(trail));
        vectorTrails = [];
    }
    
    function applyVector() {
        if (isAnimating) return;
        
        // Record vector trail
        addVectorTrail();
        
        // Animate ship movement
        animateShipMovement();
    }
    
    function animateShipMovement() {
        // Set animating flag
        isAnimating = true;
        
        // Store start and end positions
        const startPos = shipPosition.clone();
        const endPos = startPos.clone().add(currentVector);
        
        // Animation parameters
        const duration = 1000; // ms
        const startTime = Date.now();
        
        // Animation function
        function animate() {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Use easing function for smooth movement
            const easedProgress = easeInOutCubic(progress);
            
            // Interpolate position
            const newPos = new THREE.Vector3().lerpVectors(startPos, endPos, easedProgress);
            shipPosition.copy(newPos);
            ship.position.copy(newPos);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                isAnimating = false;
                shipPosition.copy(endPos);
                ship.position.copy(endPos);
                
                // Check if target reached
                checkTargetReached();
            }
        }
        
        // Start animation
        animate();
    }
    
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    function checkTargetReached() {
        // Calculate distance to target
        const distance = shipPosition.distanceTo(target.position);
        
        // Check if close enough to target
        if (distance < 0.5) {
            // Calculate score based on moves
            const moveScore = Math.max(100 - vectorTrails.length * 10, 10);
            score += moveScore;
            
            // Show achievement
            showAchievement('Target Reached!', `+${moveScore} points. Moving to level ${level + 1}.`);
            
            // Move to next level after a delay
            setTimeout(() => {
                loadMission(level);
            }, 2000);
        }
    }
    
    function showAchievement(title, message) {
        // Check if achievement element exists
        let achievementEl = document.querySelector('.achievement');
        
        // Create achievement element if it doesn't exist
        if (!achievementEl) {
            achievementEl = document.createElement('div');
            achievementEl.className = 'achievement';
            document.body.appendChild(achievementEl);
            
            const titleEl = document.createElement('div');
            titleEl.className = 'achievement-title';
            achievementEl.appendChild(titleEl);
            
            const messageEl = document.createElement('div');
            messageEl.className = 'achievement-message';
            achievementEl.appendChild(messageEl);
        }
        
        // Update achievement content
        achievementEl.querySelector('.achievement-title').textContent = title;
        achievementEl.querySelector('.achievement-message').textContent = message;
        
        // Show achievement
        achievementEl.classList.add('show');
        
        // Hide achievement after delay
        setTimeout(() => {
            achievementEl.classList.remove('show');
        }, 3000);
    }
    
    function setupEventListeners() {
        // Apply vector button
        document.getElementById('applyVector').addEventListener('click', () => {
            // Get vector components from inputs
            const x = parseFloat(document.getElementById('vectorX').value) || 0;
            const y = parseFloat(document.getElementById('vectorY').value) || 0;
            const z = parseFloat(document.getElementById('vectorZ').value) || 0;
            
            // Set current vector
            currentVector.set(x, y, z);
            
            // Update vector arrow
            updateVectorArrow();
            
            // Apply vector
            applyVector();
        });
        
        // Add vector button
        document.getElementById('addVector').addEventListener('click', () => {
            // Get vector components from inputs
            const x = parseFloat(document.getElementById('vectorX').value) || 0;
            const y = parseFloat(document.getElementById('vectorY').value) || 0;
            const z = parseFloat(document.getElementById('vectorZ').value) || 0;
            
            // Add to current vector
            currentVector.add(new THREE.Vector3(x, y, z));
            
            // Update vector arrow
            updateVectorArrow();
            
            // Update UI
            updateVectorInputs();
        });
        
        // Subtract vector button
        document.getElementById('subtractVector').addEventListener('click', () => {
            // Get vector components from inputs
            const x = parseFloat(document.getElementById('vectorX').value) || 0;
            const y = parseFloat(document.getElementById('vectorY').value) || 0;
            const z = parseFloat(document.getElementById('vectorZ').value) || 0;
            
            // Subtract from current vector
            currentVector.sub(new THREE.Vector3(x, y, z));
            
            // Update vector arrow
            updateVectorArrow();
            
            // Update UI
            updateVectorInputs();
        });
        
        // Scalar multiply button
        document.getElementById('scalarMultiply').addEventListener('click', () => {
            // Get scalar value
            const scalar = parseFloat(document.getElementById('scalarValue').value) || 1;
            
            // Multiply current vector by scalar
            currentVector.multiplyScalar(scalar);
            
            // Update vector arrow
            updateVectorArrow();
            
            // Update UI
            updateVectorInputs();
        });
        
        // Cross product button
        document.getElementById('crossProduct').addEventListener('click', () => {
            // Get vector components from inputs
            const x = parseFloat(document.getElementById('vectorX').value) || 0;
            const y = parseFloat(document.getElementById('vectorY').value) || 0;
            const z = parseFloat(document.getElementById('vectorZ').value) || 0;
            
            // Calculate cross product
            const crossVector = new THREE.Vector3(x, y, z);
            currentVector.crossVectors(currentVector, crossVector);
            
            // Update vector arrow
            updateVectorArrow();
            
            // Update UI
            updateVectorInputs();
        });
        
        // Toggle grid button
        document.getElementById('toggleGrid').addEventListener('click', () => {
            showGrid = !showGrid;
            grid.visible = showGrid;
        });
        
        // Toggle vector trails button
        document.getElementById('toggleVectorTrails').addEventListener('click', () => {
            showVectorTrails = !showVectorTrails;
            
            if (!showVectorTrails) {
                clearVectorTrails();
            }
        });
        
        // Toggle coordinates button
        document.getElementById('toggleCoordinates').addEventListener('click', () => {
            showCoordinates = !showCoordinates;
            // Implementation would update coordinate labels visibility
        });
    }
    
    function animate() {
        requestAnimationFrame(animate);
        
        // Update controls
        controls.update();
        
        // Animate target (pulsing effect)
        animateTarget();
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    function animateTarget() {
        if (!target) return;
        
        // Pulse the target
        const time = Date.now() * 0.001;
        const scale = 1 + 0.1 * Math.sin(time * 2);
        
        // Apply scale to outer sphere only
        target.children[0].scale.set(scale, scale, scale);
    }
});
