$(document).ready(function() {
	//open related
	$(document).on('click','.toggle-control-link', function(e) {
		var vid = $(this).attr('alt');
		var content = $(this).parent().find('.toggle-content').first();
		if (content.hasClass('toggled') === true) {
			content.slideToggle();
		} else {
			content.addClass('toggled');
			searchRelated(vid);
			content.slideToggle();
		}
	});
});
