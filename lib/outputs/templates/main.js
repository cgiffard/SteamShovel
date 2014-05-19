/*global window:true, document:true*/

(function() {
	"use strict";

	window.addEventListener("load", function() {

		var $ = function() {
			return [].slice.call(
				document.querySelectorAll.apply(document, arguments));
		};

		var scoreClasses = [
			"perfect",
			"great",
			"good",
			"average",
			"poor",
			"worse",
			"abysmal",
			"you-should-be-ashamed"
		].reverse();

		$(".evaluated")
			.sort(function(a, b) {
				return	parseFloat(a.dataset.heapused) -
						parseFloat(b.dataset.heapused);
			})
			.forEach(function(item, index, array) {
				var score = (item.dataset.score) * (scoreClasses.length-1) | 0,
					scoreClass = scoreClasses[score];

				var perc = (array.length - index) / array.length;
					perc = (perc * 10000) / 10000;

				item.title = (
					scoreClass[0].toUpperCase() +
					scoreClass.substr(1) +
					" code coverage.\n" +
					"[" + item.dataset.type + "]\n" +
					"Depth: " + item.dataset.depth + "\n" +
					"Score: " + item.dataset.score + "\n" +
					"Mem|RSS: "+ item.dataset.rss + "\n" +
					"Mem|HeapTotal: "+ item.dataset.heaptotal + "\n" +
					"Mem|HeapUsed: "+ item.dataset.heapused
				);

				[].slice.call(item.childNodes).forEach(function(item) {
					if (!item.classList.contains("token")) return;

					item.style.borderBottom =
						"solid rgba(0,0,0," + perc + ") 5px";
				});
			});

		$(".unevaluated")
			.forEach(function(item) {
				item.title = "WARNING: This code was never evaluated.";
			});

	}, false);
})();