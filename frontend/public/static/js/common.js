$(document).ready(function(){
	// 모바일 전체메뉴 클릭시
	$("#spinner-mb").on("click",function(){
		$(this).parent(".toggleMenu").toggleClass('active');
		$("#sidebar > div").toggleClass('mb_menu_top');
		$("#gnb").toggleClass('mb_gnb');
		$(".user_info").toggleClass('mb_info');
		$(".gnb_overlay").toggleClass('on');
	});
	
	// gnb
	$("#gnb > li > a").click(function(e){
		if($(this).parent().hasClass('has_sub')) {
			e.preventDefault();
		}

		if(!$(this).hasClass("on")) {
			$("#gnb li ul").slideUp();
			$("#gnb > li > a").removeClass("on");

			$(this).next("ul").slideDown();
			$(this).addClass("on");
		}else if($(this).hasClass("on")) {
			$(this).removeClass("on");
			$(this).next("ul").slideUp();
		}
	});
	if(!$(this).hasClass("on")) {
		$('#gnb li.has_sub a.on').next('ul').show();
	}
	
	// 첨부파일
	$(".file_input input[type='file']").on('change',function(event){
		var fileName = $(this).val().split('/').pop().split('\\').pop();
		$(this).parent().siblings("input[type='text']").val(fileName);
		var tmppath = URL.createObjectURL(event.target.files[0]);
		$(this).parent('label').parent('.file_input').prev('.imgs').find("img").attr('src',tmppath);
	});
	
	// iframe
	$( '.bbs_wrap iframe, .viewcon iframe, .media_wrap iframe' ).wrap( '<div class="youtubeWrap"></div>' );
});

// 클릭시 새창 팝업 띄우기
function popup_win(str,id,w,h,scrollchk){
	var pop = window.open(str,id,"width="+w+",height="+h+",scrollbars="+scrollchk+",resize=no,location=no ");
	pop.focus();
}

// 레이어 팝업(기본)
function layerPop(popName){
	var $layer = $("#"+ popName);
	$layer.fadeIn(500).css('display', 'inline-block').wrap( '<div class="overlay_t"></div>');
	$('body').css('overflow','hidden');
}
function layerPopClose(){
	$(".overlay_t").children().hide().unwrap( '');
	$('body').css('overflow','auto');
}
function layerPopClose2(popName){
	$("#"+ popName).hide().unwrap( '');
	$('body').css('overflow','auto');
}