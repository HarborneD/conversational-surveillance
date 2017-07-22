
var map = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  target: 'map',
  controls: ol.control.defaults({
    attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
      collapsible: false
    })
  }),
  view: new ol.View({
    center: ol.proj.fromLonLat([-0.1200,51.5074]),
    zoom: 14
  })
});



var pos = ol.proj.fromLonLat([-0.1200,51.5074]);


var marker = new ol.Overlay({
  position: pos,
  positioning: 'center-center',
  element: document.getElementById('test_camera_marker'),
  stopEvent: false
});
map.addOverlay(marker);




function OverlayCameras()
{
    var question_text = "list traffic cameras";

    HudsonAJAX(question_text,PopulateMap,"execute"); 
}

function PopulateMap(response)
{
  for(camera of response.answers)
  {
    PlaceCamera(camera["result coords"]);
  }

  $("#test_camera_marker").hide();
}

function PlaceCamera(camera)
{
  var pos = ol.proj.fromLonLat([parseFloat(camera.lon),parseFloat(camera.lat)]);

  var new_camera_marker = document.getElementById('test_camera_marker').cloneNode(false);
  new_camera_marker.id = camera.id+"_marker";
  document.getElementById('overview_container').appendChild(new_camera_marker);
  var marker = new ol.Overlay({
    position: pos,
    positioning: 'center-center',
    element: new_camera_marker,
    stopEvent: false
  });
  map.addOverlay(marker);


}

function PlacePoint(point)
{
  //var pos = ol.proj.fromLonLat([parseFloat(point.property_values["longitude"][0]),parseFloat(point.property_values["latitude"][0])]);
  var pos = ol.proj.fromLonLat([parseFloat(point.property_values["longitude"][0]),parseFloat(point.property_values["latitude"][0])]);

  var new_point_marker = document.getElementById('clone_point_marker').cloneNode(false);
  new_point_marker.id = point._id+"_marker";
  document.getElementById('overview_container').appendChild(new_point_marker);
  var marker = new ol.Overlay({
    position: pos,
    positioning: 'center-center',
    element: new_point_marker,
    stopEvent: false
  });
  map.addOverlay(marker);


}



function PlotRegion(point_array)
{
  var ring = [];

  for(point of point_array)
  {
    ring.push([parseFloat(point.property_values["longitude"][0]),parseFloat(point.property_values["latitude"][0])]);

  }

  ring.push(ring[0]);
  // A ring must be closed, that is its last coordinate
// should be the same as its first coordinate.
// var ring = [
//   [a[0].lng, a[0].lat], [a[1].lng, a[1].lat],
//   [a[2].lng, a[2].lat], [a[0].lng, a[0].lat]
// ];

// A polygon is an array of rings, the first ring is
// the exterior ring, the others are the interior rings.
// In your case there is one ring only.
var polygon = new ol.geom.Polygon([ring]);

//polygon.applyTransform(ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));


// Create feature with polygon.
var feature = new ol.Feature(polygon);

// Create vector source and the feature to it.
var vectorSource = new ol.source.Vector();
vectorSource.addFeature(feature);

// Create vector layer attached to the vector source.
var vectorLayer = new ol.layer.Vector({
  source: vectorSource
});

// Add the vector layer to the map.
map.addLayer(vectorLayer);

}



OverlayCameras();
