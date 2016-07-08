$(document).ready(function(){
	$("#info p,.card-upper,.card-lower").hide();
	var options = [
	{selector: 'body', offset: 900, callback: function() {
		$("#photo").animate({
			marginLeft:0
		},1500);
		$("#info").animate({
			marginLeft:0
		},1500);
		$("#info p").fadeIn(2000);
	} },
	{selector: 'body', offset: 1700, callback: function() {
		$(".card-upper").toggle( "drop" );
	} },
	{selector: 'body', offset: 1700, callback: function() {
		$(".card-lower").toggle( "drop" );
	} }
	];
	Materialize.scrollFire(options);

	checkInput();
	$('.parallax').parallax();
	$(".down").click(function() {
		$("#photo").animate({
			marginLeft:0
		},1500);
		$("#info").animate({
			marginLeft:0
		},1500);
		$('html,body').animate({
			scrollTop: $(".info").offset().top
		}, 1000,'swing');
	});
	$(".down-2").click(function() {
		$('html,body').animate({
			scrollTop: $(".skills").offset().top
		}, 1000,'swing');
	});
	$("#typed").typed({
		stringsElement: $('#typed-strings'),
		cursorChar:"|",
		typeSpeed: 80,
		backDelay: 500,
		loop: true,
            contentType: 'html', // or text
            // defaults to false for infinite loop
            loopCount: false,
            callback: function(){  },
            resetCallback: function() { newTyped(); }
        });
});

function newTyped(){ /* A new typed object */ }
function getinputvalue(){
	return $(".input").val().toLowerCase();
}
function consoleadd(){
	var input = getinputvalue();
	if (input == 'help'){
		$(".input").attr('onkeypress',' ');
		$(".input").attr('disabled','true');
		$(".input").removeClass('input');
		$(".input_submit").css({
			"display":"none"
		});
		$(".input_submit").removeClass('input_submit');
		$('.console').append('<div class="row" ><div class="col s1 offset-s2" style="text-align:right">&nbsp;</div>		<div class="col s8" style="padding-top:0;margin-top:0;">help</div></div><div class="row" ><div class="col s1 offset-s2" style="text-align:right">$</div><div class="col s8 input-field" style="padding-top:0;margin-top:0;"><input type="text" class="input" style="padding-top:0;height:1em" /></div><div class="col s1"><button class="input_submit" onclick="consoleadd()" style="display:none">GO!</button></div></div>');
		$(".input").focus();
		$(".input").attr('onkeypress','return searchKeyPress(event);');
	}
	else if(input == " "){
		$(".input").attr('onkeypress',' ');
		$(".input").attr('disabled','true');
		$(".input").removeClass('input');
		$(".input_submit").css({
			"display":"none"
		});
		$('.console').append('<div class="row" ><div class="col s1 offset-s2" style="text-align:right">$</div>		<div class="col s8 input-field" style="padding-top:0;margin-top:0;"><input type="text" class="input" style="padding-top:0;height:1em" /></div><div class="col s1"><button class="input_submit" onclick="consoleadd()" style="display:none">GO!</button></div></div>');
		$(".input").focus();
		$(".input").attr('onkeypress','return searchKeyPress(event);');

	}else{
		$(".input").attr('onkeypress',' ');
		$(".input").attr('disabled','true');
		$(".input").removeClass('input');
		$(".input_submit").css({
			"display":"none"
		});
		$(".input_submit").removeClass('input_submit');
		$('.console').append('<div class="row" ><div class="col s1 offset-s2" style="text-align:right">&nbsp;</div>		<div class="col s8" style="padding-top:0;margin-top:0;color:#D00000">Invalid argument</div></div><div class="row" ><div class="col s1 offset-s2" style="text-align:right">$</div>		<div class="col s8 input-field" style="padding-top:0;margin-top:0;"><input type="text" class="input" style="padding-top:0;height:1em" /></div><div class="col s1"><button class="input_submit" onclick="consoleadd()" style="display:none">GO!</button></div></div>');
		$(".input").focus();
		$(".input").attr('onkeypress','return searchKeyPress(event);');
	}
}
function checkInput(){
	$('.input').keyup(function(e){
		event.preventDefault();
		if(e.keyCode==13){
			$(".input_submit").click();
			console.log("as");
		}
		else{

		}		
	});
}
function searchKeyPress(e)
{
    // look for window.event in case event isn't passed in
    e = e || window.event;

    if (e.keyCode == 13)
    {
    	$(".input_submit").click();
    }
    
}
