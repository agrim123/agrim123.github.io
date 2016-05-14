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