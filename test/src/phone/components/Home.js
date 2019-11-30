// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicPopover services are available


const helperscript = document.createElement('script');
helperscript.src   = "app/resources/Uploaded/navigationhelper.js";
document.head.appendChild(helperscript);
helperscript.onload = function(){
  
  $scope.ping = function(p,d) {
    console.log('you are '+d+'m away from '+p.get().position.ToString()); 
  }

  // simplest example - only the tunnel (default color=yellow), no helper graphics
  // $scope.helper = new spatialHelper( tml3dRenderer );
  
  // more complex example - user-defined helper graphics, customised colors etc.
  $scope.helper = new spatialHelper( tml3dRenderer,  // we need to pass the renderer instance in
                                     {
                                       steps:15,     // how many dots to show (default is 30)
                                       color:[1,0,1] // tunnel is purple!
                                     },
                                     {
                                       device:"app/resources/Uploaded/ipad.pvz", 
                                         feet:"app/resources/Uploaded/feet.png", 
                                         head:"app/resources/Uploaded/head.pvz"
                                     }
                      )
			 		  .Cutoff(0.5,true,$scope.ping);  // setup a trigger that will inform us when we get close
  
  //
  // when the user moves, keep track of him/her
  $scope.$on('tracking', function(evt, arg) { 
    $scope.helper.draw(arg);
  });

}

//
//  when the user selects a POI from the UI (a dropdown menu), we instruct the
// helper to reconfigure things to the selected location
$scope.$watch('view.wdg.poiSelect.value', function(poiSelected) {
  var newloc = $scope.pois[parseInt(poiSelected)];
  if (newloc!=undefined) 
    $scope.helper.Color(newloc.col).showAt(newloc.pos);
});

$scope.set = function() {
  $scope.helper.setAtCurrent();
}
$scope.show = function() {
  $scope.helper.show();
}

//
// create a list of points of interest
$scope.app.params.pois = [];
$scope.pois = [];
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
}






