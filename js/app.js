/* js/app.js
   Shared three.js helper that initializes a canvas-based 3D scene.
   Uses non-module Three.js loaded via CDN in HTML.
*/

(function(global){
    // Utility: detect renderer size
    function fitRendererToContainer(renderer, camera, container) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    }
  
    // Create a warm emissive material for the flame
    function createFlameMaterial() {
      return new THREE.MeshStandardMaterial({
        emissive: new THREE.Color(0xff9f3b),
        emissiveIntensity: 2,
        roughness: 0.4,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });
    }
  
    // create a simple diya: base + flame + ambient glow
    function createDiya() {
      const group = new THREE.Group();
  
      // bowl - use torus (stylized)
      const bowlGeom = new THREE.TorusGeometry(0.9, 0.25, 24, 80);
      const bowlMat = new THREE.MeshStandardMaterial({
        color: 0x5a2b16,
        roughness: 0.6,
        metalness: 0.2
      });
      const bowl = new THREE.Mesh(bowlGeom, bowlMat);
      bowl.rotation.x = Math.PI / 2;
      bowl.scale.set(0.9,0.9,0.9);
      group.add(bowl);
  
      // inner oil - flat disc
      const oilGeom = new THREE.CircleGeometry(0.6, 32);
      const oilMat = new THREE.MeshStandardMaterial({
        color: 0x1a0f03,
        roughness: 0.2,
        metalness: 0.1
      });
      const oil = new THREE.Mesh(oilGeom, oilMat);
      oil.rotation.x = -Math.PI/2;
      oil.position.y = 0.02;
      group.add(oil);
  
      // flame - cone
      const flameGeom = new THREE.ConeGeometry(0.18, 0.5, 16);
      const flame = new THREE.Mesh(flameGeom, createFlameMaterial());
      flame.position.set(0,0.35,0);
      flame.rotation.x = Math.PI;
      group.add(flame);
  
      // inner small bright sphere as core
      const coreGeom = new THREE.SphereGeometry(0.06, 12, 8);
      const coreMat = new THREE.MeshBasicMaterial({color:0xfff7d6});
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.position.set(0,0.4,0);
      group.add(core);
  
      // gentle point light in flame
      const p = new THREE.PointLight(0xffb86b, 1.8, 5, 2);
      p.position.set(0,0.4,0);
      group.add(p);
  
      return group;
    }
  
    // create soft particle background (subtle sparkles)
    function createSparkles(count=80) {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count*3);
      for(let i=0;i<count;i++){
        pos[i*3+0] = (Math.random()*2-1)*4;
        pos[i*3+1] = Math.random()*2 - 0.5;
        pos[i*3+2] = (Math.random()*2-1)*2;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
      const mat = new THREE.PointsMaterial({ size: 0.04, transparent:true, opacity:0.9 });
      const pts = new THREE.Points(geom, mat);
      return pts;
    }
  
    // fireworks - used on wishes page
    function createFireworks(scene) {
      const particles = [];
      const createBurst = (x,y,z) => {
        const count = 200;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count*3);
        const vel = new Float32Array(count*3);
        for(let i=0;i<count;i++){
          pos[i*3+0]=x; pos[i*3+1]=y; pos[i*3+2]=z;
          const dir = new THREE.Vector3((Math.random()*2-1),(Math.random()*2-1),(Math.random()*2-1)).normalize();
          const speed = 1.2 + Math.random()*1.5;
          vel[i*3+0]=dir.x*speed; vel[i*3+1]=dir.y*speed; vel[i*3+2]=dir.z*speed;
        }
        geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
        geom.setAttribute('velocity', new THREE.BufferAttribute(vel,3));
        const mat = new THREE.PointsMaterial({ size: 0.06, transparent:true });
        const pts = new THREE.Points(geom, mat);
        pts.userData.life = 1.8 + Math.random()*1.4;
        pts.userData.age = 0;
        scene.add(pts);
        particles.push(pts);
      };
  
      return {
        burst: createBurst,
        update(dt){
          for(let i=particles.length-1;i>=0;i--){
            const p = particles[i];
            p.userData.age += dt;
            const pos = p.geometry.attributes.position.array;
            const vel = p.geometry.attributes.velocity.array;
            for(let j=0;j<pos.length/3;j++){
              let idx=j*3;
              vel[idx+1] -= 1.6 * dt; // gravity
              pos[idx+0] += vel[idx+0]*dt;
              pos[idx+1] += vel[idx+1]*dt;
              pos[idx+2] += vel[idx+2]*dt;
            }
            p.geometry.attributes.position.needsUpdate = true;
            p.material.opacity = Math.max(0, 1 - p.userData.age / p.userData.life);
            if(p.userData.age > p.userData.life){
              p.geometry.dispose();
              p.material.dispose();
              p.parent.remove(p);
              particles.splice(i,1);
            }
          }
        }
      }
    }
  
    // Main creator: container element id, options
    function createScene(containerId, opts = {}) {
      const container = document.getElementById(containerId);
      if(!container) throw new Error('Container not found: ' + containerId);
  
      // create renderer and canvas
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      container.appendChild(renderer.domElement);
  
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x070617, 0.08);
  
      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 1.2, 3.2);
  
      // lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.15);
      scene.add(ambient);
  
      const hemi = new THREE.HemisphereLight(0xffeedd, 0x111122, 0.4);
      scene.add(hemi);
  
      // ground (soft plane)
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(20,20), new THREE.MeshStandardMaterial({ color: 0x05040a, roughness: 1 }));
      ground.rotation.x = -Math.PI/2;
      ground.position.y = -0.8;
      scene.add(ground);
  
      // diya
      const diya = createDiya();
      diya.position.set(0,0,0);
      scene.add(diya);
  
      // sparkles
      const sparkles = createSparkles(opts.sparklesCount || 70);
      sparkles.position.set(0,0.4,0);
      scene.add(sparkles);
  
      // optional fireworks controller
      const fw = createFireworks(scene);
  
      // animation state
      let last = performance.now() / 1000;
      function animate(){
        const now = performance.now() / 1000;
        const dt = Math.min(0.05, now - last);
        last = now;
  
        // bob the diya
        diya.rotation.y += dt * 0.2;
        diya.position.y = Math.sin(now * 1.2) * 0.02;
  
        // animate sparkles by slight bobbing
        sparkles.rotation.y += dt*0.02;
  
        // fireworks update
        fw.update(dt);
  
        fitRendererToContainer(renderer, camera, container);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
  
      // handle click to spawn fireworks (if enabled)
      if(opts.fireworksOnClick){
        container.style.cursor = 'pointer';
        container.addEventListener('click', (e)=>{
          // spawn near center in world coords: simple mapping
          const rect = renderer.domElement.getBoundingClientRect();
          const x = ( (e.clientX - rect.left) / rect.width ) * 2 - 1;
          const y = - ( (e.clientY - rect.top) / rect.height ) * 2 + 1;
          // project to world at z=0 plane
          const v = new THREE.Vector3(x,y,0.5).unproject(camera);
          fw.burst(v.x, v.y, v.z);
        });
      }
  
      // optional programmatic firework
      function launchAtRandom(){
        const x = (Math.random()*2-1) * 1.6;
        const y = 0.6 + Math.random()*1.2;
        const z = (Math.random()*2-1) * 0.6;
        fw.burst(x,y,z);
      }
  
      // auto-launch periodically if requested
      let autoId = null;
      if(opts.autoFireworks){
        autoId = setInterval(()=>launchAtRandom(), 900 + Math.random()*800);
      }
  
      // public API
      return {
        scene, camera, renderer, spawnFirework: fw.burst,
        dispose(){
          if(autoId) clearInterval(autoId);
          renderer.dispose();
        }
      }
    }
  
    // expose globally
    global.Diwali3 = { createScene };
  
  })(window);
  