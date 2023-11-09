AFRAME.registerComponent('vidhandler', {
  init: function () {
    this.toggle = false;
    document.querySelector("#vid").pause(); //reference to the video
  },
  tick:function(){  
   if(document.querySelector("a-marker").object3D.visible == true){
     if(!this.toggle){
       this.toggle = true;
       document.querySelector("#vid").play();
     }
   }else{
     this.toggle = false;
     document.querySelector("#vid").pause();
   }
  }
});