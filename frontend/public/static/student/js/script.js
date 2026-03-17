$(document).ready(function(){
	// toggletext
	/* $(".toggle01 input[type='checkbox']").click(function(){
		$('.chktoggle label').text(function(i, oldText) {
			return oldText === '사용' ? '미사용' : '사용';
		});
	}); */
	
	// 테이블 고정 및 스크롤 버튼 제어
	$(".exam_table").clone(true).appendTo('.table-scroll').addClass('clone');	
	$('.scroll_right').click(function() {
		$('.table-wrap').animate({
			scrollLeft: "+=70px"
		}, "slow");
	});
	$('.scroll_left').click(function() {
		$('.table-wrap').animate({
			scrollLeft: "-=70px"
		}, "slow");
	});
	
	// toggleoption
	$(".togglebtn").on("click",function(){
		$(this).next(".viewmore").toggleClass('on');
	});
	$(".toggle_close").on("click",function(){
		$(this).parent(".viewmore").removeClass('on');
	});
});

// 탭메뉴
var tabMenu = $("#tab_menu");

tabMenu.find("ul > li > div").hide();
tabMenu.find("li.active > div").show();

function tabList(e) {
  e.preventDefault(); // #의 기능을 차단
  var target = $(this);
  target.next().show().parent("li").addClass("active").siblings("li").removeClass("active").find("> div").hide();
}
tabMenu.find("ul > li > a").click(tabList).focus(tabList);

// 탭메뉴 타입2
function tab_menu(num){	
	var f = $('.tabs').find('li > button');
	for ( var i = 0; i < f.length; i++ ) {			
		if ( i == num) {			
			f.eq(i).addClass('active');	
			$('.tabcon' + i ).show();
		} else {
			f.eq(i).removeClass('active');					
			$('.tabcon' + i ).hide();
		}
	}
}
$('.tabs li:first-child button').trigger('click');