$(document).ready(function(){
	$("#unlock").click(function(){
		window.location = "personal.html";
	});
	$("#quit").click(function(){
		window.location = "../index.html";
	});
	$("#submit").click(function(){
		window.location = "instructions.html";
	});
	$("#start").click(function(){
		window.location = "home.html";
	});
	


	accordian(".head1",".head1 .col-md-1");
	accordian(".head2",".head2 .col-md-1");
	accordian(".head3",".head3 .col-md-1");
	accordian(".head4",".head4 .col-md-1");
	accordian(".head5",".head5 .col-md-1");
	accordian(".head6",".head6 .col-md-1");
	accordian(".head7",".head7 .col-md-1");
	accordian(".head8",".head8 .col-md-1");

	$("#animation").click(function(){
		$(this).addClass('backcolor');
		$("#diagram,#formula").removeClass('backcolor');
		$("#appenddata").html('');
		$("#appenddata").html('<video width="100%" controls><source src="videos/1.mp4" type="video/mp4" /><source src="movie.ogg" type="video/ogg" />Your browser does not support the video tag.</video>');
	});
	$("#diagram").click(function(){
		$(this).addClass('backcolor');
		$("#animation,#formula").removeClass('backcolor');
		$("#appenddata").html('');
		$("#appenddata").html('<div class="ques-image"></div>');
	});
	$("#formula").click(function(){
		$(this).addClass('backcolor');
		$("#animation,#diagram").removeClass('backcolor');
		$("#appenddata").html('');
		$("#appenddata").html('Lorem Ipsum');
	});


});
function accordian(e1,e2){
	$(e1).click(function() {
		if ($(e2).html() == '<i class="fa fa-chevron-up" aria-hidden="true"></i>') {
			$(e2).html("");
			$(e2).append('<i class="fa fa-chevron-down" aria-hidden="true"></i>');
		} else {
			$(e2).html("");
			$(e2).append('<i class="fa fa-chevron-up" aria-hidden="true"></i>');
		}
	});

}