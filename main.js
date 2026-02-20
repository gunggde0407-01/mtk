// VRM VIEWER - FIXED VIEW WITH EYE BLINKING AND CONTROLLABLE POSE
document.addEventListener('DOMContentLoaded', function () {
   
    // Elements (sama persis)
    const canvas = document.getElementById('canvas');
    const loadingScreen = document.getElementById('loading');
    const statusText = document.getElementById('progress-text');
    const errorDiv = document.getElementById('error');
   
    function updateStatus(msg) {
        console.log(msg);
        if (statusText) statusText.textContent = msg;
    }
   
    function showError(msg) {
        console.error(msg);
        if (errorDiv) {
            errorDiv.textContent = "ERROR: " + msg;
            errorDiv.classList.remove('hidden');
        }
        if (loadingScreen) loadingScreen.classList.add('hidden');
    }
   
    /* =======================
       SCENE & CAMERA - FIXED
    ======================= */
    updateStatus("Setting up scene...");
   
    const scene = new THREE.Scene();
    scene.background = null;
   
    const camera = new THREE.PerspectiveCamera(
        38,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
   
    camera.position.set(0, 1.3, 1.8);
    camera.lookAt(0, 1.9, 0);
   
    /* =======================
       RENDERER - MODIFIED FOR TRANSPARENCY
    ======================= */
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
   
    /* =======================
       LIGHTING
    ======================= */
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(2, 8, 4);
    scene.add(mainLight);
   
    const faceLight = new THREE.DirectionalLight(0xffffff, 0.5);
    faceLight.position.set(0, 5, 3);
    scene.add(faceLight);
   
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
   
    const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);
   
    /* =======================
       ANIMATION VARIABLES
    ======================= */
    let model = null;
    let eyeBones = { left: null, right: null };
    let blinkState = 0;
    let blinkTimer = 0;
    let breathingTimer = 0;
    let clock = new THREE.Clock();
   
    // === Bagian senyum ===
    const faceMeshes = [];
    let currentSmileValue = 0;
    const smileTarget = 0.85;
   
    const SMILE_BLEND_NAMES = [
        'Joy', 'joy', 'JOY',
        'Fun', 'fun', 'FUN',
        'Happy', 'happy',
        'Smile', 'smile',
        'mouthSmile', 'mouth_smile',
        'mouthSmileLeft', 'mouthSmileRight',
        'mouthSmile_L', 'mouthSmile_R',
        'mouthSmileLeft_L', 'mouthSmileRight_R',
        'MTH_Fun', 'Fcl_MTH_Fun', 'M_F00_000_00_Fcl_MTH_Fun',
        'MTH_Joy', 'Fcl_MTH_Joy', 'M_F00_000_00_Fcl_MTH_Joy',
        'smile', 'Smile_L', 'Smile_R',
        'mouthOpenSmile', 'mouth_smile_open',
        'vrc.smile', 'vrc.joy', 'vrc.fun',
        'A', 'a', 'E', 'e'
    ];
   
    // === Blendshape untuk mata tertutup bahagia ===
    let currentJoyEyeValue = 0;
    const joyEyeTargetWhenSmiling = 1.3;
   
    const JOY_EYE_BLEND_NAMES = [
        'Joy', 'joy', 'JOY',
        'Fcl_EYE_Joy', 'EYE_Joy', 'eyeJoy',
        'eyeJoy_L', 'eyeJoy_R', 'EYE_Joy_L', 'EYE_Joy_R',
        'eyeSquint', 'eye_squint',
        'eyeSquintLeft', 'eyeSquintRight',
        'eyeSquint_L', 'eyeSquint_R',
        'Fcl_EYE_Squint', 'squint', 'Squint',
        'EyeJoy', 'Eye_Squint', 'vrc.eye_squint'
    ];
   
    // === Blendshape untuk animasi mulut bicara intens ===
    const TALK_BLEND_NAMES = [
        'A', 'a', 'I', 'i', 'U', 'u', 'E', 'e', 'O', 'o',
        'Fcl_MTH_A', 'Fcl_MTH_I', 'Fcl_MTH_U', 'Fcl_MTH_E', 'Fcl_MTH_O',
        'MTH_A', 'MTH_I', 'MTH_U', 'MTH_E', 'MTH_O',
        'mouthOpen', 'mouth_open', 'MouthOpen', 'mouthO', 'mouth_A',
        'aa', 'ih', 'ou', 'oh', 'EE', 'OO',
        'Fcl_MTH_Open', 'M_F00_000_00_Fcl_MTH_A', 'M_F00_000_00_Fcl_MTH_I',
        'M_F00_000_00_Fcl_MTH_U', 'M_F00_000_00_Fcl_MTH_E', 'M_F00_000_00_Fcl_MTH_O'
    ];
   
    let mouthValue = 0;
    let talkPhase = 0;
    let isUserTyping = false; // Flag: true saat user sedang mengetik
   
    // Pose settings (sama persis)
    const POSE_SETTINGS = {
        upperArm: {
            downAngle: THREE.MathUtils.degToRad(120),
            forwardAngle: THREE.MathUtils.degToRad(77)
        },
        lowerArm: {
            left: { x: 0, y: 0, z: 0 },
            right: { x: 0, y: 0, z: 0 }
        },
        hands: {
            left: { x: 0, y: 0, z: THREE.MathUtils.degToRad(180) },
            right: { x: 0, y: 0, z: THREE.MathUtils.degToRad(-180) }
        },
        spine: {
            forwardAngle: THREE.MathUtils.degToRad(0)
        }
    };
   
    let boneRefs = {
        leftUpperArm: null, rightUpperArm: null,
        leftLowerArm: null, rightLowerArm: null,
        leftHand: null, rightHand: null,
        spine: null, chest: null,
        neck: null, head: null
    };
   
    /* =======================
       LOAD VRM
    ======================= */
    updateStatus("Loading saka.vrm...");
   
    const loader = new THREE.GLTFLoader();
   
    loader.load(
        'saka.vrm',
        function (gltf) {
            updateStatus("Setting up pose system...");
           
            model = gltf.scene;
            scene.add(model);
           
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
           
            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -size.y * 0.46;
            model.scale.setScalar(1.6);
            model.rotation.set(0, 0, 0);
           
            let foundEyes = 0;
           
            model.traverse(function(child) {
                if (child.isBone) {
                    const name = child.name.toLowerCase();
                   
                    if (name.includes('eye')) {
                        if (name.includes('left') || name.includes('l_') || name.includes('_l')) {
                            eyeBones.left = child;
                            foundEyes++;
                            console.log("✅ Found left eye bone:", child.name);
                            child.userData.originalScaleY = child.scale.y;
                        } else if (name.includes('right') || name.includes('r_') || name.includes('_r')) {
                            eyeBones.right = child;
                            foundEyes++;
                            console.log("✅ Found right eye bone:", child.name);
                            child.userData.originalScaleY = child.scale.y;
                        } else if (!eyeBones.left && foundEyes === 0) {
                            eyeBones.left = child;
                            child.userData.originalScaleY = child.scale.y;
                        } else if (!eyeBones.right && foundEyes === 1) {
                            eyeBones.right = child;
                            child.userData.originalScaleY = child.scale.y;
                        }
                    }
                   
                    if (name.includes('upperarm') || name.includes('upper_arm') || name.includes('shoulder')) {
                        if (name.includes('left') || name.includes('l_') || name.includes('_l')) {
                            boneRefs.leftUpperArm = child;
                            console.log("✅ Stored left upper arm bone:", child.name);
                        } else if (name.includes('right') || name.includes('r_') || name.includes('_r')) {
                            boneRefs.rightUpperArm = child;
                            console.log("✅ Stored right upper arm bone:", child.name);
                        }
                    }
                    else if (name.includes('lowerarm') || name.includes('lower_arm') || name.includes('forearm')) {
                        if (name.includes('left') || name.includes('l_') || name.includes('_l')) {
                            boneRefs.leftLowerArm = child;
                            console.log("✅ Stored left lower arm bone:", child.name);
                        } else if (name.includes('right') || name.includes('r_') || name.includes('_r')) {
                            boneRefs.rightLowerArm = child;
                            console.log("✅ Stored right lower arm bone:", child.name);
                        }
                    }
                    else if (name.includes('hand')) {
                        if (name.includes('left') || name.includes('l_') || name.includes('_l')) {
                            boneRefs.leftHand = child;
                            console.log("✅ Stored left hand bone:", child.name);
                        } else if (name.includes('right') || name.includes('r_') || name.includes('_r')) {
                            boneRefs.rightHand = child;
                            console.log("✅ Stored right hand bone:", child.name);
                        }
                    }
                    else if (name.includes('spine') || name.includes('chest')) {
                        if (!boneRefs.spine && name.includes('spine')) {
                            boneRefs.spine = child;
                            console.log("✅ Stored spine bone:", child.name);
                        }
                        if (!boneRefs.chest && name.includes('chest')) {
                            boneRefs.chest = child;
                            console.log("✅ Stored chest bone:", child.name);
                        }
                    }
                    else if (name.includes('neck')) {
                        boneRefs.neck = child;
                        console.log("✅ Stored neck bone:", child.name);
                    }
                    else if (name.includes('head')) {
                        boneRefs.head = child;
                        console.log("✅ Stored head bone:", child.name);
                    }
                   
                    if (!boneRefs.leftUpperArm && (name.includes('l_arm') || name === 'leftarm' || name === 'left_arm')) {
                        boneRefs.leftUpperArm = child;
                    }
                    if (!boneRefs.rightUpperArm && (name.includes('r_arm') || name === 'rightarm' || name === 'right_arm')) {
                        boneRefs.rightUpperArm = child;
                    }
                }
                if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
                    faceMeshes.push(child);
                    console.log("✅ Found face mesh with blendshapes:", child.name, `(${Object.keys(child.morphTargetDictionary).length} shapes)`);
                }
            });
           
            applyStaticPose();
           
            console.log(`✅ Found ${foundEyes} eye bones for blinking`);
            console.log(`✅ Pose system initialized`);
            console.log(`✅ SAKA VRM with controllable pose ready`);
           
            if (faceMeshes.length > 0) {
                console.log("Semua morph target yang tersedia di mesh pertama:");
                console.log(Object.keys(faceMeshes[0].morphTargetDictionary));
            }
           
            let smileFound = 0;
            faceMeshes.forEach(mesh => {
                const dict = mesh.morphTargetDictionary;
                SMILE_BLEND_NAMES.forEach(name => {
                    if (dict[name] !== undefined) {
                        console.log(` → Smile blendshape ditemukan: ${name} (index ${dict[name]}) di mesh ${mesh.name}`);
                        smileFound++;
                    }
                });
            });
            if (smileFound === 0) {
                console.warn("⚠️ Tidak menemukan satupun blendshape senyum dari daftar standar. Cek console untuk daftar morph yang ada.");
            } else {
                console.log(`✅ Ditemukan ${smileFound} blendshape senyum yang potensial`);
            }
           
            let joyEyeFound = 0;
            faceMeshes.forEach(mesh => {
                const dict = mesh.morphTargetDictionary;
                JOY_EYE_BLEND_NAMES.forEach(name => {
                    if (dict[name] !== undefined) {
                        console.log(` → Joy-eye blendshape ditemukan: ${name} (index ${dict[name]}) di mesh ${mesh.name}`);
                        joyEyeFound++;
                    }
                });
            });
            if (joyEyeFound === 0) {
                console.warn("⚠️ Tidak menemukan blendshape 'joy eye' / squint smile. Mata tidak akan ikut tertutup saat senyum.");
            } else {
                console.log(`✅ Ditemukan ${joyEyeFound} blendshape joy-eye yang potensial`);
            }
           
            let talkFound = 0;
            faceMeshes.forEach(mesh => {
                const dict = mesh.morphTargetDictionary;
                TALK_BLEND_NAMES.forEach(name => {
                    if (dict[name] !== undefined) {
                        console.log(` → Talk blendshape ditemukan: ${name} (index ${dict[name]}) di mesh ${mesh.name}`);
                        talkFound++;
                    }
                });
            });
            if (talkFound === 0) {
                console.warn("⚠️ Tidak menemukan blendshape bicara (A/I/U/E/O dll). Mulut tidak akan gerak.");
            } else {
                console.log(`✅ Ditemukan ${talkFound} blendshape bicara yang potensial`);
            }
           
            updateStatus("✅ Ready with pose controls!");
           
            canvas.style.backgroundColor = 'transparent';
           
            setTimeout(() => {
                if (loadingScreen) loadingScreen.classList.add('hidden');
            }, 800);
           
        },
        function (xhr) {
            if (xhr.lengthComputable) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                updateStatus(`Loading: ${percent}%`);
            }
        },
        function (err) {
            showError("Failed to load VRM: " + err.message);
            console.error("❌ Failed to load VRM:", err);
        }
    );
   
    function applyStaticPose() {
        if (!boneRefs.leftUpperArm || !boneRefs.rightUpperArm) return;
       
        const down = POSE_SETTINGS.upperArm.downAngle;
        const forward = POSE_SETTINGS.upperArm.forwardAngle;
       
        boneRefs.leftUpperArm.rotation.x = down;
        boneRefs.leftUpperArm.rotation.z = forward;
       
        boneRefs.rightUpperArm.rotation.x = down;
        boneRefs.rightUpperArm.rotation.z = -forward;
       
        if (boneRefs.leftLowerArm) boneRefs.leftLowerArm.rotation.set(0, 0, 0);
        if (boneRefs.rightLowerArm) boneRefs.rightLowerArm.rotation.set(0, 0, 0);
       
        if (boneRefs.leftHand) boneRefs.leftHand.rotation.set(
            POSE_SETTINGS.hands.left.x,
            POSE_SETTINGS.hands.left.y,
            POSE_SETTINGS.hands.left.z
        );
        if (boneRefs.rightHand) boneRefs.rightHand.rotation.set(
            POSE_SETTINGS.hands.right.x,
            POSE_SETTINGS.hands.right.y,
            POSE_SETTINGS.hands.right.z
        );
    }
   
    /* =======================
       EYE BLINKING FUNCTION
    ======================= */
    function updateEyeBlinking(deltaTime) {
        if (!eyeBones.left || !eyeBones.right) return;
       
        blinkTimer += deltaTime;
       
        if (blinkTimer > 3 + Math.random() * 2) {
            blinkState = 0.1;
            blinkTimer = 0;
        }
       
        if (blinkState > 0) {
            blinkState += deltaTime * 12;
           
            let blinkProgress;
            if (blinkState < 0.5) {
                blinkProgress = blinkState * 2;
            } else {
                blinkProgress = (1 - blinkState) * 2;
            }
           
            blinkProgress = Math.max(0, Math.min(1, blinkProgress));
            const eyeScaleY = 1 - (blinkProgress * 0.8);
           
            eyeBones.left.scale.y = eyeScaleY * (eyeBones.left.userData.originalScaleY || 1);
            eyeBones.right.scale.y = eyeScaleY * (eyeBones.right.userData.originalScaleY || 1);
           
            if (blinkState > 1) {
                blinkState = 0;
                eyeBones.left.scale.y = eyeBones.left.userData.originalScaleY || 1;
                eyeBones.right.scale.y = eyeBones.right.userData.originalScaleY || 1;
            }
        }
    }
   
    /* =======================
       IDLE BREATHING FUNCTION
    ======================= */
    function updateIdleBreathing(deltaTime) {
        if (!boneRefs.spine && !boneRefs.chest) return;
       
        breathingTimer += deltaTime * 1.5;
       
        const breathAmount = Math.sin(breathingTimer) * 0.005;
       
        if (boneRefs.spine) {
            boneRefs.spine.rotation.x = 0.02 + breathAmount * 0.05;
        }
       
        if (boneRefs.chest) {
            boneRefs.chest.rotation.x = 0.01 + breathAmount * 0.03;
        }
       
        if (boneRefs.leftUpperArm) {
            const currentDown = POSE_SETTINGS.upperArm.downAngle;
            boneRefs.leftUpperArm.rotation.x = currentDown + breathAmount * 0.02;
        }
       
        if (boneRefs.rightUpperArm) {
            const currentDown = POSE_SETTINGS.upperArm.downAngle;
            boneRefs.rightUpperArm.rotation.x = currentDown + breathAmount * 0.02;
        }
    }
   
    /* =======================
       FUNGSI SENYUM + MATA BAHAGIA TERTUTUP
    ======================= */
    function setSmile(value) {
        if (faceMeshes.length === 0) {
            console.warn("⚠️ Tidak ada mesh wajah yang ditemukan untuk senyum");
            return;
        }
       
        let appliedSmile = 0;
        let appliedJoyEye = 0;
       
        faceMeshes.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;
           
            SMILE_BLEND_NAMES.forEach(name => {
                const idx = dict[name];
                if (idx !== undefined) {
                    influences[idx] = THREE.MathUtils.clamp(value, 0, 1);
                    appliedSmile++;
                }
            });
           
            JOY_EYE_BLEND_NAMES.forEach(name => {
                const idx = dict[name];
                if (idx !== undefined) {
                    influences[idx] = THREE.MathUtils.clamp(value * joyEyeTargetWhenSmiling, 0, 1);
                    appliedJoyEye++;
                }
            });
        });
       
        if ((appliedSmile > 0 || appliedJoyEye > 0) && Math.random() < 0.03) {
            console.log(`[smile] Applied smile ke ${appliedSmile} | joy-eye ke ${appliedJoyEye} | nilai senyum=${value.toFixed(3)}`);
        }
        if (appliedSmile === 0 && value > 0.08) {
            console.warn("⚠️ Tidak menemukan blendshape senyum.");
        }
        if (appliedJoyEye === 0 && value > 0.3) {
            console.warn("⚠️ Tidak menemukan blendshape joy-eye/squint. Mata tidak ikut tertutup.");
        }
    }
   
    function updateSmileExpression() {
        const textarea = document.getElementById('message-input');
        if (!textarea) return;
       
        const isTyping = 
            (document.activeElement === textarea) && 
            (textarea.value.trim().length > 0);
       
        const targetValue = isTyping ? smileTarget : 0;
        const lerpSpeed = isTyping ? 0.24 : 0.10;
       
        currentSmileValue = THREE.MathUtils.lerp(
            currentSmileValue,
            targetValue,
            lerpSpeed
        );
       
        setSmile(currentSmileValue);
    }
   
    /* =======================
       Animasi mulut bicara INTENS
       - HANYA aktif saat AI bicara (TTS / aiTalking true)
       - SELALU diam saat user sedang mengetik
    ======================= */
    function setMouthTalk(value) {
        if (faceMeshes.length === 0) return;
       
        let appliedCount = 0;
       
        faceMeshes.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;
           
            TALK_BLEND_NAMES.forEach(name => {
                const idx = dict[name];
                if (idx !== undefined) {
                    influences[idx] = THREE.MathUtils.clamp(value, 0, 1);
                    appliedCount++;
                }
            });
        });
       
        if (Math.random() < 0.12) {
            console.log(`[talk anime] Mulut gerak intens | nilai=${value.toFixed(3)} | blendshape terpakai: ${appliedCount}`);
        }
    }
   
    function updateTalkingAnimation(deltaTime) {
        // Prioritas 1: Jika user sedang mengetik → mulut WAJIB diam
        if (isUserTyping) {
            mouthValue = THREE.MathUtils.lerp(mouthValue, 0, 0.28);
            setMouthTalk(mouthValue);
            talkPhase = 0;
            return;
        }

        // Prioritas 2: Cek apakah AI sedang bicara
        const isAITalking = window.sakaState && (
            window.sakaState.ttsSpeaking === true || 
            window.sakaState.aiTalking === true
        );

        if (!isAITalking) {
            // Tidak ada yang bicara → kembali ke netral perlahan
            mouthValue = THREE.MathUtils.lerp(mouthValue, 0, 0.22);
            setMouthTalk(mouthValue);
            talkPhase = 0;
            return;
        }

        // Baru di sini: AI sedang bicara DAN user tidak mengetik → gerakkan mulut
        talkPhase = (talkPhase || 0) + deltaTime * 5;  // frekuensi super cepat ~5-6 siklus/detik
        
        mouthValue = Math.abs(Math.sin(talkPhase * 2.0)) * 0.80;
        mouthValue += Math.abs(Math.sin(talkPhase * 0)) * 0.35;
        mouthValue += Math.abs(Math.sin(talkPhase * 0)) * 0;
        mouthValue += (Math.random() - 0.5) * 0.20;
        
        mouthValue = THREE.MathUtils.clamp(mouthValue, 0.08, 0.58);
        
        setMouthTalk(mouthValue);
    }
   
    /* =======================
       DISABLE ALL USER CONTROLS (mouse & touch tetap diblokir, keyboard hanya zoom & arrow)
    ======================= */
    const blockEvent = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };
   
    canvas.addEventListener('mousedown', blockEvent);
    canvas.addEventListener('mousemove', blockEvent);
    canvas.addEventListener('mouseup', blockEvent);
    canvas.addEventListener('wheel', blockEvent);
    canvas.addEventListener('contextmenu', blockEvent);
    canvas.addEventListener('touchstart', blockEvent);
    canvas.addEventListener('touchmove', blockEvent);
    canvas.addEventListener('touchend', blockEvent);
   
    // Keyboard: hanya blokir tombol navigasi & zoom, huruf r,R,c,C sekarang boleh diketik
    document.addEventListener('keydown', (e) => {
        const blockedKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            // 'r', 'R', 'c', 'C'  ← dihapus agar bisa diketik normal
            '+', '-', '=', '_'
        ];
       
        if (blockedKeys.includes(e.key)) {
            blockEvent(e);
        }
    });
   
    canvas.style.cursor = 'default';
    canvas.style.userSelect = 'none';
   
    /* =======================
       MAIN ANIMATION LOOP
    ======================= */
    function animate() {
        requestAnimationFrame(animate);
       
        const deltaTime = clock.getDelta();
       
        camera.lookAt(0, 1.5, 0);
       
        updateEyeBlinking(deltaTime);
        updateIdleBreathing(deltaTime);
        updateSmileExpression();
        updateTalkingAnimation(deltaTime);  // sekarang mengikuti aturan: diam saat user ketik
        
        renderer.render(scene, camera);
    }
   
    animate();
   
    /* =======================
       RESIZE HANDLER
    ======================= */
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
   
    const textarea = document.getElementById('message-input');
    if (textarea) {
        textarea.addEventListener('input', updateSmileExpression);
        textarea.addEventListener('focus', updateSmileExpression);
        textarea.addEventListener('blur', updateSmileExpression);
        
        // Sinkronisasi flag isUserTyping (penting untuk mulut diam saat mengetik)
        textarea.addEventListener('focus', () => {
            isUserTyping = true;
        });
        
        textarea.addEventListener('blur', () => {
            isUserTyping = textarea.value.trim().length > 0;
        });
        
        textarea.addEventListener('input', () => {
            isUserTyping = textarea.value.trim().length > 0;
        });
        
        setTimeout(updateSmileExpression, 500);
    }
   
});