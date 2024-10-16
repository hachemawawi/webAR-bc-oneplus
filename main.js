import * as THREE from 'three';
import {MindARThree} from 'mindar-image-three';
import {loadGLTF} from "./loader.js";
import {mockWithImage} from "./camera-mock.js";
import { CSS3DRenderer,CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

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


document.addEventListener('DOMContentLoaded', () => {
  const start = async() => {

    const player = await createYoutube();

    const mindarThree = new MindARThree({
      container: document.body,
      imageTargetSrc: 'https://cdn.glitch.global/d60b3c0e-7d53-49da-8104-e28cfda9647d/multiTrack.mind?v=1729085664558',
      maxTrack: 2,

    });

    const {renderer,cssRenderer,cssScene, scene, camera} = mindarThree;

    const avatarAnchor = mindarThree.addAnchor(0);


    const gltf = await loadGLTF("https://cdn.glitch.global/d60b3c0e-7d53-49da-8104-e28cfda9647d/bc_avatar.gltf?v=1729085601666");
    gltf.scene.scale.set(0.5, 0.5, 0.5);
    gltf.scene.position.set(0, -0.5, 0);
    gltf.scene.rotation.set(Math.PI/2, 0.5, 0);
    avatarAnchor.group.add(gltf.scene);
    gltf.renderOrder = 0; // Ensure GLTF renders after CSS3DObject


    //gltf animations
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    const obj = new CSS3DObject(document.querySelector("#ar-div"));
    obj.rotation.x = Math.PI / 2;
    obj.scale.multiplyScalar(2);
    obj.position.x = 45;
    obj.position.y = 710; // Adjust this value as needed
    obj.renderOrder = 1; // Ensure CSS3DObject renders before GLTF model

    const cssAnchor = mindarThree.addCSSAnchor(1);
    cssAnchor.group.add(obj);

    cssAnchor.onTargetFound = () => {
      player.playVideo();
    }
    cssAnchor.onTargetLost = () => {
      player.pauseVideo();
    }

    const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    scene.add(light);

    

    const clock = new THREE.Clock();

    await mindarThree.start();
    renderer.setAnimationLoop(() => {

      const delta = clock.getDelta();
      mixer.update(delta);
      cssRenderer.render(cssScene, camera);

      renderer.render(scene, camera);
    });
  }
  start();
});
