import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';
import { loadGLTF, loadAudio } from "./loader.js";
//import { mockWithImage } from "camera-mock.js";
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const createYoutube = () => {
  return new Promise((resolve, reject) => {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    const onYouTubeIframeAPIReady = () => {
      const player = new YT.Player('player', {
        videoId: 'qonbkEmFyEg',
        events: {
          onReady: () => {
            resolve(player);
          }
        }
      });
    }
    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  });
}

// Create play button element
const createPlayButton = (text) => {
  const button = document.createElement('button');
  button.innerHTML = text;
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.left = '50%';
  button.style.transform = 'translateX(-50%)';
  button.style.zIndex = '1000';
  button.style.padding = '10px 20px';
  button.style.backgroundColor = '#ffffff';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';
  button.style.display = 'none';
  return button;
}

document.addEventListener('DOMContentLoaded', () => {
  const start = async () => {
    const player = await createYoutube();
    const playVideoButton = createPlayButton('Play Video');
    const playAvatarButton = createPlayButton('Play Avatar');
    document.body.appendChild(playVideoButton);
    document.body.appendChild(playAvatarButton);

    // Adjust button positions to be beside each other
    playVideoButton.style.left = 'calc(50% - 60px)';
    playAvatarButton.style.left = 'calc(50% + 60px)';

    const mindarThree = new MindARThree({
      container: document.body,
      imageTargetSrc: "https://cdn.glitch.global/d60b3c0e-7d53-49da-8104-e28cfda9647d/multiTrack.mind?v=1729085664558",
    });

    const { renderer, cssRenderer, cssScene, scene, camera } = mindarThree;

    // Create a group to hold all AR content
    const arContent = new THREE.Group();
    scene.add(arContent);
    
    // CSS3D Object Setup
    const obj = new CSS3DObject(document.querySelector("#ar-div"));
    obj.position.x = -800;
    obj.position.z = 300;
    obj.position.y = 800;
    obj.rotation.x = Math.PI / 2;
    obj.scale.multiplyScalar(2.1);
    obj.renderOrder = 0; // Ensure the CSS3DObject is rendered behind the GLTF model


    const cssAnchor = mindarThree.addCSSAnchor(0);
    cssAnchor.group.add(obj);

    // Update target found/lost handlers
    cssAnchor.onTargetFound = () => {
      playVideoButton.style.display = 'block';
      playAvatarButton.style.display = 'block';
    }
    cssAnchor.onTargetLost = () => {
      playVideoButton.style.display = 'none';
      playAvatarButton.style.display = 'none';
      player.pauseVideo();
      audio.pause();
    }

    // Add click handler for play video button
    playVideoButton.addEventListener('click', () => {
      const playerState = player.getPlayerState();
      if (playerState === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        playVideoButton.innerHTML = 'Play Video';
      } else {
        player.playVideo();
        playVideoButton.innerHTML = 'Pause Video';
      }
    });

    // Add click handler for play avatar button
    playAvatarButton.addEventListener('click', () => {
      if (audio.isPlaying) {
        audio.pause();
        playAvatarButton.innerHTML = 'Play Avatar';
      } else {
        audio.play();
        playAvatarButton.innerHTML = 'Pause Avatar';
      }
    });

    // GLTF Model Setup
    const gltf = await loadGLTF("https://cdn.glitch.global/d60b3c0e-7d53-49da-8104-e28cfda9647d/bc_avatar.gltf?v=1729582012959");
    gltf.scene.scale.set(0.5, 0.5, 0.5);
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.rotation.set(Math.PI / 2, 0.5, 0);
    gltf.scene.userData.clickable = true;
    gltf.renderOrder = 10; // Ensure the CSS3DObject is rendered behind the GLTF model


    const avatarAnchor = mindarThree.addAnchor(0);
    avatarAnchor.group.add(gltf.scene);

    // Audio Setup
    const audioClip = await loadAudio("./assets/ElevenLabs_Michael C. Vincent_OnePlus.mp3");
    const listener = new THREE.AudioListener();
    const audio = new THREE.PositionalAudio(listener);
    camera.add(listener);

    avatarAnchor.group.add(audio);
    
    // Enhanced audio settings
    audio.setBuffer(audioClip);
    audio.setRefDistance(5);
    audio.setRolloffFactor(0.5);
    audio.setDistanceModel('exponential');
    audio.setDirectionalCone(360, 360, 0.5);
    audio.setLoop(true);
    audio.setVolume(10);

    // Target tracking state
    let isTargetVisible = false;
    
    avatarAnchor.onTargetFound = () => {
      isTargetVisible = true;
      gltf.scene.visible = true;
      if (currentAction === loopAction && !audio.isPlaying) {
        audio.play();
      }
    };

    avatarAnchor.onTargetLost = () => {
      isTargetVisible = false;
      gltf.scene.visible = false;
      if (audio.isPlaying) {
        audio.pause();
      }
      if (currentAction) {
        currentAction.stop();
        playPreview();
      }
    };

    // Animation Setup
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const originalClip = gltf.animations[0];
    let isInPreviewMode = true;
    
    const previewClip = THREE.AnimationUtils.subclip(
      originalClip,
      'previewAnimation',
      0,
      Math.floor(3 * originalClip.fps)
    );
    const previewAction = mixer.clipAction(previewClip);
    previewAction.setLoop(THREE.LoopOnce);
    previewAction.clampWhenFinished = true;

    const loopClip = THREE.AnimationUtils.subclip(
      originalClip,
      'loopAnimation',
      Math.floor(3 * originalClip.fps),
      Math.floor(8 * originalClip.fps)
    );
    const loopAction = mixer.clipAction(loopClip);
    loopAction.setLoop(THREE.Loop);

    let currentAction = previewAction;

    const playPreview = () => {
      isInPreviewMode = true;
      if (currentAction) {
        currentAction.stop();
      }
      currentAction = previewAction;
      previewAction.reset();
      previewAction.play();
      setTimeout(() => {
        previewAction.paused = true;
        lastPausedTime = 3;
      }, 3000);
    };

    playPreview();

    const startLoopingAnimation = () => {
      if (!isTargetVisible) return;
      
      isInPreviewMode = false;
      if (currentAction) {
        currentAction.stop();
      }
      currentAction = loopAction;
      loopAction.reset();
      if (!audio.isPlaying) {
        audio.play();
      }
      loopAction.play();
    };

    // Click event handling
    document.body.addEventListener("click", (e) => {
      if (!isTargetVisible) return;
      
      // Ignore clicks on the play buttons
      if (e.target === playVideoButton || e.target === playAvatarButton) return;

      const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -1 * ((e.clientY / window.innerHeight) * 2 - 1);
      const mouse = new THREE.Vector2(mouseX, mouseY);

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(gltf.scene, true);
      
      if (intersects.length > 0) {
        if (audio.isPlaying) {
          audio.pause();
          if (currentAction) {
            currentAction.stop();
            playPreview();
          }
        } else if (isInPreviewMode && isTargetVisible) {
          startLoopingAnimation();
        }
      }
    });

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Animation and render loop setup
    const clock = new THREE.Clock();
    
    const cleanup = () => {
      if (audio.isPlaying) {
        audio.stop();
      }
      if (currentAction) {
        currentAction.stop();
      }
      mixer.stopAllAction();
      scene.remove(arContent);
      document.body.removeChild(playVideoButton);
      document.body.removeChild(playAvatarButton);
    };

    window.addEventListener('beforeunload', cleanup);

    await mindarThree.start();
    renderer.setAnimationLoop(() => {
      if (isTargetVisible) {
        cssRenderer.render(cssScene, camera);

        const delta = clock.getDelta();
        mixer.update(delta);
        
        // Dynamic audio volume based on distance
        const distanceToCamera = camera.position.distanceTo(avatarAnchor.group.position);
        const maxDistance = 50; // Maximum distance for audio
        const minVolume = 5;   // Minimum volume
        const maxVolume = 15;  // Maximum volume
        
        const volume = Math.max(minVolume, 
          maxVolume * (1 - Math.min(1, distanceToCamera / maxDistance))
        );
        audio.setVolume(volume);
      }

      renderer.render(scene, camera);
      cssRenderer.render(cssScene, camera);
          
    });

    // Add stop method
    mindarThree.stop = () => {
      cleanup();
      renderer.setAnimationLoop(null);
    };
  }
  start();
});