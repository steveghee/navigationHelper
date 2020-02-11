// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicPopover services are available




const helperscript = document.createElement('script');
helperscript.src   = "app/resources/Uploaded/navigationhelper.js";
document.head.appendChild(helperscript);
helperscript.onload = function(){
  
  // inform the user that they have arrived at the point of interest
  function into(p,d) {
    $scope.view.wdg.info.text = 'you have arrived';
    $scope.$applyAsync();
  }
  function outof() {
    $scope.view.wdg.info.text = '';
    $scope.$applyAsync();
  }
  
  // an example showing how to manipulate Studio/tml widget locations using the Matrix/Vector maths lib
  function positionwidget(name,params) {
    var wd = $scope.view.wdg[name];
    var cd = new Vector4().Set3(wd.x,wd.y,wd.z)                        // set location
                          .Transform(params.transform);                // and transform it to the pose given by the helper app
    var ef = new Matrix4().RotateFromEuler(wd.rx, wd.ry, wd.rz,true)   // set the orientation
                          .Multiply(params.transform.m).ToEuler(true); // and transform it to the pose given by the helper app
    var gh = new Vector4().FromEuler(ef);                              // turn into Euler angles for tml
    tml3dRenderer.setTranslation(name,cd.X(),cd.Y(),cd.Z());           //set position
    tml3dRenderer.setRotation   (name,gh.X(),gh.Y(),gh.Z());           //set orientation
  }
  
  // called when the helper wants to reposition content - in this case, it gives us the opportunity to position our own content 
  function control(params) {
    
    // we are being told that the helper is hiding/showing - we can decide to follow this
    // in this example, we dont follow the 'hide' messages, but we do listen to changes and choose to show the panel
    
    if (params.hidden != undefined) {
      tml3dRenderer.setProperties ('opboard',{                 // let's use the default look of the control panel shader:twx.app.isPreview() ? "Default" : "foggedLit", 
                                              hidden:false});  // dont listen to hide messages params.hidden});
      tml3dRenderer.setProperties ('nextButton', {hidden:$scope.pois.length<=1});  
      tml3dRenderer.setProperties ('addButton',  {hidden:false});                
    }
    
    // we are being told the helper is moving - we can decide to follow this
    if (params.location != undefined) {
      tml3dRenderer.setTranslation('opboard',params.location.X(),   params.location.Y(),   params.location.Z());
      tml3dRenderer.setRotation   ('opboard',params.orientation.X(),params.orientation.Y(),params.orientation.Z());
      
      // we can also place other content on/relative to the helper - here's an example of a 3d button
      positionwidget('nextButton',params);
      positionwidget('addButton', params);
      
    }
    
  }
  
  $scope.helper = new spatialHelper( tml3dRenderer,  // we need to pass the renderer instance in
                                     {
                                       hololens:true
                                     },
                                     {
                                       callback:control,   // target control is delegated to this user-supplied function
                                         extent:0.45,      // distance of the target from the head
                                           feet:"app/resources/Uploaded/feet.png",   // show some feet
                                           head:"app/resources/Uploaded/head.pvz",   // show a head
                                     }
                      )
			 		  .Cutoff(0.5,true,into,outof);  // setup a trigger that will inform us when we get close
  
  
  //
  // when the user moves, keep track of him/her
  $scope.$on('tracking', function(evt, arg) { 
    $scope.helper.draw(arg);
  });

}

$scope.onAdd = function() {

  tml3dRenderer.setColor('button_button','rgba(0,255,0,1)');
  $scope.add();
  
}

//
// simple button controllers (set,show)
$scope.set = function() {
  tml3dRenderer.setColor('button_button','rgba(255,0,0,1)');
  $scope.helper.setAtCurrent().Auto(true).show();
}
$scope.show = function() {
  $scope.helper.Auto(false).show();
}

//
// create a list of points of interest
$scope.app.params.pois = [];
$scope.pois = [];

//
// and for fun, lets assign each one a different color
$scope.cols = [ [1,0,0],[0,1,0],[0,0,1],[1,0,1],[1,1,0],[0,1,1],[1,1,1],[0.9,0.6,0.2] ];

//
// if user clicks 'add', add the current POI to the list - these are displayed in the UI
$scope.add = function() {
  var idx=$scope.app.params.pois.length;
  
  // add the INDEX to the UI
  $scope.app.params.pois.push({display:'p '+(idx+1),value:idx});
  
  // add the data (we dont want to encode it as a string) to a separate array
  $scope.pois.push({col:$scope.cols[idx%8], pos:$scope.helper.get()});
  
  $scope.view.wdg.counter.text = $scope.pois.length;
  
  tml3dRenderer.setProperties ('nextButton', {hidden:$scope.pois.length<=1});  

  $scope.$applyAsync();

}

$scope.poiselected = 0;
$scope.first = function() {
  $scope.poiselected = 0;
  $scope.switch($scope.poiselected);
}
$scope.next = function() {
  $scope.poiselected += 1;
  if ($scope.poiselected >= $scope.pois.length)
    $scope.poiselected = 0;
  $scope.switch($scope.poiselected);
}

//
//  when the user selects a POI from the UI (a dropdown menu), we instruct the
// helper to reconfigure things to the selected location
$scope.switch = function(poiSelected) {
  var newloc = $scope.pois[poiSelected];
  if (newloc!=undefined) 
    $scope.helper.Color(newloc.col).showAt(newloc.pos);
}

