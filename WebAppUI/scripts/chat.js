

var suggested_messages = []; 

function UpdateHelperContainer(response)
{
    suggested_messages = []; 
    for(suggestion of response.suggestions)
    {
        try
        {
            var full_text = suggestion["question text"]
            
            var suggested_text = suggestion["after text"];

            if (typeof suggested_text != 'undefined')
            {   
               full_text = full_text+suggested_text;
            }
            suggested_messages.push(full_text);

            //$("#helper_response_container").html('<span class="chat_suggestion" onclick="ReplaceInput(this.innerHTML)">'+full_text+'</span>');
        }
        catch(err)
        {

        }
    }

    $( "#input" ).autocomplete({ 
    source: suggested_messages,
    select: function (event, ui) {
        event.preventDefault();
       $( "#send" ).trigger( "click" );
    }
});
    
}

function ReplaceInput(text)
{
    document.getElementById('input').value = text;
}

var input = document.getElementById('input');
var button = document.getElementById('send');
var messages = document.getElementById('messages');




input.oninput = function()
{
   HudsonAJAX(input.value,UpdateHelperContainer,"help");
}





button.onclick = function(){
    var message = input.value;
    input.value = ''; 

    HudsonAJAX(message,CheckForAction,"interpret");

    // Finally, prepend our message to the list of messages:
    var item = '<li><div class="sent_message">'+message+'</div></li>';
    messages.innerHTML = messages.innerHTML + item;
$("#message_container").scrollTop($("#message_container").children().height());
};




$("#input").keydown(function (event) {

if(event.keyCode == 13 && event.shiftKey) {

 $( "#send" ).trigger( "click" );
event.preventDefault();

}
    
    
});






//poll_cards();