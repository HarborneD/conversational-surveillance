function HudsonAJAX(text,response_func,mode)
{
    var hudson_url = "http://localhost:8080/ce-store/special/hudson/executor";

    switch(mode) {
    case "execute":
        break;
    case "interpret":
        hudson_url = "http://localhost:8080/ce-store/special/hudson/interpreter";
        break
    case "answer":
        hudson_url = "http://localhost:8080/ce-store/special/hudson/answerer";
        break;
    case "help":
        hudson_url = "http://localhost:8080/ce-store/special/hudson/helper";
        break;
    default:
        break;
    }
    


    $.ajax({
        type: "POST",
        url:hudson_url,
        data:text,
        contentType: 'json',
        "processData": false,
        "success":
    function(data){
        response_func(data);
    }
});

}


function CameraNameSearch(text)
{
    //for which V1 and _F1 is it true that 
    //( the traffic camera V1 has the value _F1 as common name ) and ( the value _F1 contains 'A10' )
    //.
}


function AlertFunc(text)
{
    alert(text);
}

function CheckForAction(response)
{   
    var question_length = response["question"]["words"].length;

    if(response.interpretations[0].confidence == 0)
    {
        PostToChat("Message could not be understood");
        return;
    }

    var specials = response.interpretations[0]["result"]["specials"];

    if (typeof(specials) !== 'undefined')
    {


        var current_triple;
        var current_triple_end;

        for(special of specials)
        {
            if(special.type == "matched-triple")
            {
                var end_position = special["end position"];
                if(end_position > current_triple_end)
                {
                    current_triple = special;
                }
                
            }
        }

        if (typeof(current_triple) !== 'undefined')
        {
            HandleTriple(response,special);
            return;
        }
    }
   
    try
    {
        var id = response.interpretations[0]["result"]["instances"][0]["entities"][0]["_id"];
        if(response.interpretations[0]["result"]["instances"][0]["entities"][0]["_id"] == "show"){
            HandleShow(response);
            return;
        }
    }
    catch(err)
    {
        PostToChat("Error: "+err);
    
    }



    HudsonAJAX(response.question.text,PostChatResponse,"execute");
}

function HandleShow(response)
{
    var instances = response.interpretations[0]["result"]["instances"];

    var nothing_shown = true;
    for(instance of instances)
    {
        var concepts = instance.entities[0]["_concept"];
        if($.inArray("displayable thing",concepts) > -1)
        {
            DisplayThing(instance);
            nothing_shown = false;
        }
    }

    if(nothing_shown)
    {
        PostToChat("Could not find anything to display in the request");
    }
    
}


function HandleTriple(response,triple)
{   
    //TODO: handle question

    var property_name = triple.predicate.entities[0]["property name"];
    var domain = triple.predicate.entities[0]["domain"];
    var range = triple.predicate.entities[0]["range"];
    var subject_instance = triple["subject instances"][0]["phrase"];
    var object_instance = triple["object instances"][0]["phrase"];

    var ce_sentence = "the "+domain+" '"+subject_instance+"' "+property_name+" the "+range+" '"+object_instance+"'.";

    PostToChat("Updating Knowledge with: '"+ce_sentence+"'");
    SaveSentence(ce_sentence);
    
}

function DisplayThing(thing)
{
    var concepts = thing.entities[0]["_concept"];

    PostToChat("Displaying "+thing.entities[0]["_id"]);

    var display_image = $.inArray("video source",concepts) == -1;

    var clear_info_pane= true; //later may change this depending on query
    if(clear_info_pane)
    {
        $("#info_container").html("");
    }

    for(concept of concepts)
    {
 
         switch(concept) {
            case "video source":
                DisplayVideoSource(thing.entities[0]["video url"],$("#info_container"));
                break;
            case "image source":
                if(display_image)
                {
                    DisplayImageSource(thing.entities[0]["image url"],$("#info_container"));
                }
                break
            case "geolocation source":
                DisplayGeoSource(thing,map);
                break;
            case "location":
                DisplayLocation(thing,$("#info_container"));
                break;
             case "region":
                DisplayRegion(thing,$("#info_container"));
                break;
            default:
                break;
            };

    }


}

function DisplayImageSource(source,display)
{
    html_string ='<image src="'+source+'" class="camera_feed"/>';
    display.append( html_string );
    //display.insertAdjacentHTML( 'beforeend', html_string );
}

function DisplayVideoSource(source,display)
{
     html_string ='<video src="'+source+'" autoplay loop class="camera_feed"/>';
      display.append( html_string );
      // display.insertAdjacentHTML( 'beforeend', html_string );
}

function DisplayGeoSource(source,display)
{
    var long = source.entities[0]["longitude"];
    var lat = source.entities[0]["latitude"];
   display.getView().setCenter(ol.proj.fromLonLat([parseFloat(long), parseFloat(lat)]));

    display.getView().setZoom(16);
    
}

function DisplayLocation(location,display)
{
    var location_search_url = "http://localhost:8080/ce-store/stores/DEFAULT/queries/LocationDisplaySearch/execute";
    
    $.ajax({
        type: "GET",
        url:location_search_url,
        contentType: 'json',
        "processData": false,
        "success":
    function(data){

        var sources = [];
        var show_results = data.results;
        for(result of show_results)
        {
            if(result[1] == location.entities[0]["_id"])
            {
                sources.push(result[0]);
               
            }
        }

        DisplaySourcesFromArray(sources,display);
    }
});
}

function DisplayRegion(region,display)
{
    var region_search_url = "http://localhost:8080/ce-store/stores/DEFAULT/queries/RegionDisplaySearch/execute";
    
    $.ajax({
        type: "GET",
        url:region_search_url,
        contentType: 'json',
        "processData": false,
        "success":
    function(data){
        var sources = [];

        var show_results = data.results;
        for(result of show_results)
        {
            if(result[1] == region.entities[0]["_id"])
            {
                sources.push(result[0]);
               
            }
        }

        DisplaySourcesFromArray(sources,display);
    }
});
}



function DisplaySourcesFromArray(source_array,display)
{
    var region_bounding_points = [];
    for(source of source_array)
    {
        var source_instance = GetEntityByID(source);
        if($.inArray("region boundry point",source_instance.direct_concept_names) > -1)
        {
             DisplayInstanceFromGet(source_instance,display,true);
             //region_bounding_points.push(source_instance);
        }
        else
        {
             DisplayInstanceFromGet(source_instance,display,false);
        }


       

    }

    if(region_bounding_points.length > 0)
    {
        PlotRegion(region_bounding_points);
    }
}

function GetEntityByID(id)
{
    var store_get_url = "http://localhost:8080/ce-store/stores/DEFAULT/instances/"+id;

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", store_get_url, false );
    xmlHttp.send( null );
    return JSON.parse(xmlHttp.responseText);
    
}

function SaveSentence(sentence)
{
    var data = new FormData();
    data.append('ceText', sentence);
    
    var store_get_url = "http://localhost:8080/ce-store/stores/DEFAULT/sentences";

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "POST", store_get_url, false );
    xmlHttp.send( data );
    var status = xmlHttp.status;
    var check= "";
}

function DisplayInstanceFromGet(instance,display,display_location)
{   
    if (typeof(instance.property_values["video url"]) !== 'undefined')
    {
        DisplayVideoSource(instance.property_values["video url"][0],display);
        return;
    }

    if (typeof(instance.property_values["image url"]) !== 'undefined')
    {
        DisplayImageSource(instance.property_values["image url"][0],display);
        return;
    }

    if(display_location)
    {
        if (typeof(instance.property_values["longitude"]) !== 'undefined' && typeof(instance.property_values["latitude"]) !== 'undefined')
        {
            //PlacePoint(instance);
            //PlaceCamera(instance);
            return;
        

        }        
    }
}



function PostToChat(message)
{
    var messages = document.getElementById('messages');
    var item = '<li><div class="received_message">'+message+'</div></li>';
    messages.innerHTML = messages.innerHTML + item; // Prepend this new message to our list in the DOM
    $("#message_container").scrollTop($("#message_container").children().height());
}

function PostChatResponse(response)
{
    var answer = response.answers[0]["result text"];
    if(answer == "TBC - handleEverythingEmpty")
    {
        PostToChat("Message could not be understood");
    }
    else
    {
        PostToChat(answer);
    }
    
}