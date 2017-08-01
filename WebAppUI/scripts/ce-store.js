//var ce_address = "http://localhost:8080";
var ce_address = "http://82.9.108.61:6080";


var user_number = 100; //TODO generate a user id

//used to track context
var instance_a;
var instance_b;

//wrapper for sending requests to hudson
function HudsonAJAX(text,response_func,mode)
{
    var hudson_url = ce_address+"/ce-store/special/hudson/executor";

    switch(mode) {
    case "execute":
        break;
    case "interpret":
        hudson_url = ce_address+"/ce-store/special/hudson/interpreter";
        break
    case "answer":
        hudson_url = ce_address+"/ce-store/special/hudson/answerer";
        break;
    case "help":
        hudson_url = ce_address+"/ce-store/special/hudson/helper";
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


function AlertFunc(text)//used for testing ajax response
{
    alert(text);
}


//function for deciding how to react to a Hudson interpretation 
function CheckForAction(response)
{   
    var question_length = response["question"]["words"].length;

    //Check for complete lack of interpretation 
    if(response.interpretations[0].confidence == 0)
    {
        PostToChat("Message could not be understood");
        return;
    }

    //check for answerable questions
    var instances = response.interpretations[0]["result"]["instances"];

    if(typeof(instances) !== 'undefined')
    {
        var question_type_phrase;
        var question_type = FindLongestInstanceOfConcepts(["question type"],instances);
        
        if(typeof(question_type) == 'undefined')
        {
            var question_phrase = FindLongestInstanceOfConcepts(["question word","question phrase"],instances);

            if(typeof(question_phrase) !== 'undefined')
            {
                question_type_phrase = GetQuestionTypeFromPhraseOrWord(question_phrase);
            }
        }
        else
        {
            question_type_phrase = question_type["phrase"];
        }

        if(typeof(question_type_phrase) !== 'undefined')
        {
            HandleQuestion(response,question_type_phrase);
            return; 
        
        }
    }

    //look for specials (particularly tripls) and assume this is new information
    var specials = response.interpretations[0]["result"]["specials"];

    if (typeof(specials) !== 'undefined')
    {


        var current_triple;
        var current_triple_end = 0;

        for(special of specials)
        {
            if(special.type == "matched-triple")
            {
                var end_position = special["end position"];
                if(end_position > current_triple_end)
                {
                    current_triple_end = end_position;
                    current_triple = special;
                }
                
            }
        }

        if (typeof(current_triple) !== 'undefined')
        {
            HandleTriple(response,current_triple);
            return;
        }
    }
    
    //look for a show request and action it
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
        PostToChat("Error: "+err); //for debuging display error
    
    }


    //as a last resort use Hudson's attempt at executing the interpretation
    HudsonAJAX(response.question.text,PostChatResponse,"execute");
}

function GetQuestionTypeFromPhraseOrWord(question_phrase)
{
    return question_phrase.entities[0]["refers to"];
}


//takes a list of instance types and searches the passed array of instances for the longest phrase relating to one of those types.
function FindLongestInstanceOfConcepts(concept_array,instances)
{
    var current_longest = 0;
    var current_instance;

    for(instance of instances)
    {
        var length = instance["end position"] - instance["start position"] + 1;
        if(length > current_longest)
        {
            var concepts_of_instance = instance.entities[0]["_concept"];
            for(concept of concept_array)
            {
                if($.inArray(concept,concepts_of_instance) > -1)
                {
                    current_instance = instance;
                    current_longest = length;
                    break;
                }    
            }
        }
        
    }

    return current_instance;
}


//gets all things of the passed types from a hudson interpretation. Can look in the "instances" or "concepts" array based on value of 'search_in'
function GetThingsOfEntityTypesFromResponse(response,search_in,types_array)
{
    var properties = [];

    var search_array = response.interpretations[0]["result"][search_in];

    for(item of search_array)
    {
        var entities = item["entities"][0]["_concept"];
        for(entity of entities)
        {
            if($.inArray(entity,types_array) > -1)
            {
                properties.push(item);
                break;
            }
        }    
    }

    return properties;
}

//actions a show response given the passed hudson interpretation
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
        var display_previous_query_results = true;

        if(display_previous_query_results)
        {
            ExecuteQuery("Query USR_"+String(user_number),DisplayFromQuery);
        }
        else
        {
            PostToChat("Could not find anything to display in the request");
        }
    }
    
}


//handles the pressence of the passed triple in the passed hudsomn interpretation response
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


function HandleQuestion(response,question_type_phrase)
{
    var concepts = response.interpretations[0]["result"]["concepts"];

    var properties = GetThingsOfEntityTypesFromResponse(response,"instances",["property category"]);

    var prepositions = GetThingsOfEntityTypesFromResponse(response,"instances",["preposition word"]);

    // search for A
    var con_a;
    var con_a_modifiers = [];
    
    var con_b;
    var con_b_modifiers = [];
    
    var preposition;
    var relationship;

    var query_expansion = CheckForQueryExpansion(response);

    if(typeof(concepts) !== "undefined")
    {
        con_a = concepts[0];
        var con_a_instances = GetThingsOfEntityTypesFromResponse(response,"instances",[con_a.entities[0]["_id"]]);
        if(con_a_instances.length > 0)
        {
            instance_a = con_a_instances[0];
        }
        else
        {
            if(!query_expansion)
            {
                instance_a = undefined;
            }
        }

        // if a
        // find modifiers for A
        var a_properties = GetPropertiesOfConcept(con_a.entities[0]["_id"]);
        for(property of properties)
        {
            var property_name = CheckModifierIsinProperties(a_properties,property);
            if(property_name != "")
            {
                con_a_modifiers.push([property_name,property]);
            }
        }

            // search for preposition
            // if preposition
            if(prepositions.length == 1)
            {
                preposition = prepositions[0];
                
                // search for B

                if(concepts.length > 1)
                {
                    for(concept of concepts.slice(1))
                    {
                        if(concept["start position"] > preposition["start position"])
                        {
                            con_b = concept;
                            break;
                        }
                    }
                }
                
                // if B
                if(typeof(con_b) !== "underfined")
                {
                    var con_b_instances = GetThingsOfEntityTypesFromResponse(response,"instances",[con_b.entities[0]["_id"]]);
                    if(con_b_instances.length > 0)
                    {
                        instance_b = con_b_instances[0];
                    }
                    else
                    {
                        if(!query_expansion)
                        {
                            instance_b = undefined;
                        }
                    }

                    //find modifiers for B
                    
                    //search for relationship between A and B
                    relationship = FindRelationshipBetweenConcepts(con_a,con_b); //currently cheating here TODO: stop cheating
                    //if relationship
                        //form query answering: any A +modifiers 'relationship' B+modifiers
                        var query_string = "";
                        query_string += "[Query USR_"+String(user_number)+"]\n";
                        query_string += "for which V1 and V2 is it true that \n";
                        query_string += "( the "+con_a.entities[0]["_id"]+" V1 "+relationship+" the "+con_b.entities[0]["_id"]+" V2 )";
                        
                        var mod_count = 1;

                        for(a_modifier of con_a_modifiers)
                        {
                            query_string += " and\n( the "+con_a.entities[0]["_id"]+" V1 has the value _MOD"+String(mod_count)+" as "+a_modifier[0]+") and ";
                            query_string += "( the value _MOD"+String(mod_count)+" matches '"+a_modifier[1]["entities"][0]["_id"]+"')";
                            mod_count = mod_count+1;
                        }

                        query_string +=  "\n."; 
                        //send query
                        SaveSentence(query_string);

                        
                        
                        
                }
                //if not B
                
            }
            else // if not preposition
            {
                // build query answering: any A + modifier
                var query_string = "";
                query_string += "[Query USR_"+String(user_number)+"]\n";
                query_string += "for which V1 is it true that \n";
                query_string += "( the "+con_a.entities[0]["_id"]+" V1)";
                
                var mod_count = 1;

                for(a_modifier of con_a_modifiers)
                {
                    query_string += " and\n( the "+con_a.entities[0]["_id"]+" V1 has the value _MOD"+String(mod_count)+" as "+a_modifier[0]+") and ";
                    query_string += "( the value _MOD"+String(mod_count)+" matches '"+a_modifier[1]["entities"][0]["_id"]+"')";
                    mod_count = mod_count+1;
                }

                query_string +=  "\n."; 
                //send query
                SaveSentence(query_string);
            }
           
                
                
    
        //if not a
            //handle error
    }
    else
    {
        if(properties.length > 0)
        {
            var query_sentence = GetQueryString("Query USR_"+String(user_number));
            var new_query_string = ModifyPropertiesInQuery(query_sentence,properties,CheckForQueryExpansion(response));
            SaveSentence(new_query_string);
        }
    }    
        // respond to question based on question type
        switch(question_type_phrase) {
            case "exists":
                ExecuteQuery("Query USR_"+String(user_number),HandleExistsQueryResponse,instance_a,instance_b); //answer yes or no
            break;

            case "count":
                ExecuteQuery("Query USR_"+String(user_number),HandleCountQueryResponse,instance_a,instance_b); //answer yes or no
            break;

            case "list":
                ExecuteQuery("Query USR_"+String(user_number),HandleListQueryResponse,instance_a,instance_b); //answer yes or no
            break;

            default:
                alert("HandleQuestion: "+question_phrase);
            break;
            }
    
    
    
}


function FindRelationshipBetweenConcepts(concept_a,concept_b)
{
    var con_a_name = concept_a.entities[0]["_id"];
    var con_b_name = concept_b.entities[0]["_id"];

    var object_properties_url = "http://localhost:8080/ce-store/concepts/"+con_a_name+"/properties/object";

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", object_properties_url, false );
    
    //xmlHttp.send( data );
    xmlHttp.send();
    
    var object_properties = JSON.parse(xmlHttp.responseText);

    for(object_property of object_properties)
    {
        if(object_property["range_name"] == con_b_name)
        {
            return object_property["property_name"]
        }
    }   
    

    return ""; 
}

function CheckForQueryExpansion(response)
{
    var expansion_signifiers = GetThingsOfEntityTypesFromResponse(response,"instances",["query expansion phrase"]);

    return expansion_signifiers.length > 0;
}


function CheckModifierIsinProperties(concept_properties,modifier)
{
    for(concept_property of concept_properties)
    {
        if($.inArray(concept_property["property_name"],modifier["entities"][0]["_concept"]) > -1)
        {
            return concept_property["property_name"];
        }
        
    }
    return "";
}


function ModifyPropertiesInQuery(query_sentence,properties_array,expand_query)
{
    if(!expand_query)
    {
        var regex_sentence_properties = /\(.*?\) and \(.*?\)/gm;
        var regex_properties = new RegExp(regex_sentence_properties);
        var property_sentences_array = query_sentence.match(regex_sentence_properties);
        
        if(property_sentences_array != null)
        {
            for(property_sentence of property_sentences_array)
            {
                query_sentence= query_sentence.replace(property_sentence,"");    
            }
        }
        
    }

    for(property of properties_array)
    {
        query_sentence = IncludePropertyValueInQuery(query_sentence,property,expand_query);
    }

    return query_sentence;
}

function IncludePropertyValueInQuery(query_sentence,property,expand_query)
{
    
    var concepts = property.entities[0]["_concept"];
    var value = property.entities[0]["_id"];

    var property_handled = false;

    if(expand_query)
    {
        for(concept of concepts)
        {
            var regex_sentence_properties = "\\(.*"+concept+"\\) and \\(.*\\)";
            var regex_properties = new RegExp(regex_sentence_properties);
            var property_sentences_array = regex_properties.exec(query_sentence);

            if(property_sentences_array !== null)
            {   
                var new_property_value_sentence = property_sentences_array[0].replace( new RegExp("matches '.*'"),"matches '"+value+"'");
                var query_sentence = query_sentence.replace(property_sentences_array[0], new_property_value_sentence);  
                property_handled = true;
                break;
            }


        }   
    }

    if(!property_handled)
    {
        var new_modifier ="";

        var regex_ptrn_concept1 = "the .* V1";
        var regex_concept = new RegExp(regex_ptrn_concept1);
        
        var concept_1 = regex_concept.exec(query_sentence)[0].replace(/the /,"").replace(" V1","");
        var con1_properties = GetPropertiesOfConcept(concept_1);

        var property_name = CheckModifierIsinProperties(con1_properties,property);
        
        if(property_name != "")
        {
            var new_mod_id = "_MOD"+String(value).replace(" ","")+"_"+property_name.replace(" ","");
            new_modifier = "and \n ( the "+concept_1+" V1 has the value "+new_mod_id+" as "+property_name+") and ( the value "+new_mod_id+" matches '"+value+"')";
            query_sentence = query_sentence.replace(".",new_modifier+"\n.");
        }
        


    }

    
    return query_sentence;
}

//#### Query Response Handlers #####

//function to answer an exists question based on the passed query response
function FilterResultsForInstances(response,instance_a,instance_b)
{
    var filtered_results = [];

    for(result of response.results)
    {
        if( (typeof(instance_a) == "undefined" || result[0] == instance_a.entities[0]["_id"]) && (typeof(instance_b) == "undefined" || result[1] == instance_b.entities[0]["_id"]) )
        {
            filtered_results.push(result);
        }
    }

    return filtered_results;
}

function HandleExistsQueryResponse(answer_results)
{
   if(answer_results > 0)
    {
        PostToChat("Yes");
    }
    else
    {
        PostToChat("No");
    }
}


//function to answer a count question based on the passed query response
function HandleCountQueryResponse(answer_results)
{   
        PostToChat(String(answer_results.length));
}


//function to answer a list question based on the passed query response
function HandleListQueryResponse(answer_results)
{   
   alert("handle list query!");
}


//Function to display the results of a query
function DisplayFromQuery(answer_results)
{
    $("#objects_pane").html("");
    var id_array =[];

    for(result of answer_results)
    {
        id_array.push(result[0]);
    }

    DisplaySourcesFromArray(id_array);
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

function DisplayDetectedObjectSource(source,display)
{   
     html_string =`
     <div class="detected_object">
        <span class="object_name">`+source["_id"]+`</span>
        <span class="object_concept">`+source.property_values["object display name"][0]+`</span>
        <span class="object_located_in">`+source.property_values["is located in"][0]+`</span>`;
        if($.inArray("display properties",Object.keys(source.property_values)) > -1)
        {
            display_properties = source.property_values["display properties"][0].split(",");

            for(property of display_properties)
            {
                if($.inArray(property,Object.keys(source.property_values)) > -1)
                {
                html_string = html_string + `<div class="object_property">
                    <span class="object_property_label">`+property+`:</span>
                    <span class="object_property_value">`+source.property_values[property][0]+`</span>
                </div>`;
                }
            }
        }

      html_string = html_string + "</div>";
     
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




function ExecuteQuery(query_name,success_function, concept_a,concept_b)
{
    var query_url = ce_address+"/ce-store/stores/DEFAULT/queries/"+query_name+"/execute";
    
    $.ajax({
        type: "GET",
        url:query_url,
        contentType: 'json',
        "processData": false,
        "success":
    function(data){
        var filtered_results = FilterResultsForInstances(data,concept_a,concept_b);
        success_function(filtered_results);
    }
});   
}

function GetQueryString(query_name)
{
    var query_url = ce_address+"/ce-store/stores/DEFAULT/queries/"+query_name;
    
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", query_url, false );
    
    //xmlHttp.send( data );
    xmlHttp.send();
    
    return JSON.parse(xmlHttp.responseText)["ce_text"];
}


function GetPropertiesOfConcept(concept_name)
{

    var properties_url = ce_address+"/ce-store/concepts/"+concept_name+"/properties";

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", properties_url, false );
    
    //xmlHttp.send( data );
    xmlHttp.send();
    
    return JSON.parse(xmlHttp.responseText);
    
}


function DisplayLocation(location,display)
{
    var location_search_url = ce_address+"/ce-store/stores/DEFAULT/queries/LocationDisplaySearch/execute";
    
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
    var region_search_url = ce_address+"/ce-store/stores/DEFAULT/queries/RegionDisplaySearch/execute";
    
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
            if($.inArray("detectable object",source_instance.direct_concept_names) > -1)
            {
                 DisplayDetectedObjectSource(source_instance,$("#objects_pane"))
                 //region_bounding_points.push(source_instance);
            }
            else
            {
                 DisplayInstanceFromGet(source_instance,display,false);
            }
        }


       

    }

    if(region_bounding_points.length > 0)
    {
        PlotRegion(region_bounding_points);
    }
}

function GetEntityByID(id)
{
    var store_get_url = ce_address+"/ce-store/stores/DEFAULT/instances/"+id;

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", store_get_url, false );
    xmlHttp.send( null );
    return JSON.parse(xmlHttp.responseText);
    
}

function SaveSentence(sentence)
{
    // var data = new FormData();
    // data.append('ceText', sentence);
    
    var store_get_url = ce_address+"/ce-store/stores/DEFAULT/sentences";

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "POST", store_get_url, false );
    
    //xmlHttp.send( data );
    xmlHttp.send( sentence );

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




