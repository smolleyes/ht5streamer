$(document).ready(function() {
	//open related
	$(document).on('click','.load_more', function(e) {
		e.preventDefault();
		var vid = $(this).attr('alt').split('::')[2];
		var page = $(this).attr('alt').split('::')[1];
		searchRelated(vid,page);
	});
	
	$(document).on('click','.toggle-control-link', function(e) {
		e.preventDefault();
		var pos = $(this).position()['top'] - 100;
		var vid = $(this).attr('alt');
		var content = $(this).parent().find('.toggle-content').first();
		if (content.hasClass('toggled') === true) {
			if (content.hasClass('opened') === true) {
				content.removeClass('opened').addClass('closed');
				content.slideToggle();
				$(window).scrollTop(pos);
				var text = $(this).text().replace('-','+');
				$(this).html(text);
			} else {
				content.removeClass('closed').addClass('opened');
				content.slideToggle();
				$(window).scrollTop(pos);
				var text= $(this).text().replace('+','-');
				$(this).html(text);
			}
		} else {
			content.addClass('toggled');
			content.addClass('opened');
			searchRelated(vid,1);
			content.slideToggle();
			$(this).html('- '+ myLocalize.translate("Open related videos"));
			$(window).scrollTop(pos);
		}
	});
});
