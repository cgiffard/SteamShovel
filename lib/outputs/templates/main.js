(function() {
	window.addEventListener("load", function() {

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

		var key = document.createElement("div");

		scoreClasses.concat(["unevaluated"]).forEach(function(className) {
			var keyItem = document.createElement("span");
				keyItem.classList.add("key-item");
				keyItem.classList.add(className);

			keyItem.appendChild(document.createTextNode(
				className[0].toUpperCase() +
				className.substr(1)
			));

			key.appendChild(keyItem);
		});

		document.querySelector("#guide")
			.appendChild(key);

		[].slice.call(document.querySelectorAll(".evaluated"))
			.forEach(function(item) {
				var score = (item.dataset.score) * (scoreClasses.length-1) | 0,
					scoreClass = scoreClasses[score];

				item.classList.add(scoreClass);

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
			});

		[].slice.call(document.querySelectorAll(".evaluated"))
			.sort(function(a, b) {
				return	parseFloat(a.dataset.heapused) -
						parseFloat(b.dataset.heapused);
			})
			.forEach(function(item, index, array) {
				var perc = (array.length - index) / array.length;
					perc = (perc * 10000) / 10000;

				[].slice.call(item.childNodes).forEach(function(item) {
					if (!~item.className.indexOf("token")) return;

					item.style.borderBottom = "solid rgba(0,0,0," + perc + ") 5px";
				});
			});

		[].slice.call(document.querySelectorAll(".unevaluated"))
			.forEach(function(item) {
				item.title = "WARNING: This code was never evaluated.";
			});

		[].slice.call(document.querySelectorAll("li.file"))
			.forEach(function(item) {
				var score = (
						(item.dataset.coverage / 100) *
						(scoreClasses.length - 1) | 0),
					scoreClass = scoreClasses[score];

				item.classList.add(scoreClass);
			});

	}, false);
})();